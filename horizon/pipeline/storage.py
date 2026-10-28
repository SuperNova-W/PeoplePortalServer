"""Postgres storage boundary for the Horizon ownership feature tables."""

from __future__ import annotations

from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from datetime import timedelta
from pathlib import Path

import psycopg
from dagster import ConfigurableResource

from .config import PipelineConfigError
from .concentration import RepositoryConcentration
from .ownership import FileOwnership, MemberOwnership, MemberRepositoryOwnership


class PostgresResource(ConfigurableResource):
    """Transactional Postgres backend for the L4 ownership assets.

    The connection URL is supplied at runtime. The legacy deployment variable
    ``GITEA_ANALYTICS_DATABASE_URL`` is accepted by ``PipelineSettings`` and is
    intentionally never written into the repository.
    """

    database_url: str | None = None

    @contextmanager
    def connect(self) -> Iterator[psycopg.Connection]:
        """Open one transaction and commit only after the caller succeeds."""

        with psycopg.connect(self._require_database_url()) as connection:
            yield connection

    def ensure_schema(self) -> None:
        """Create the feature tables if they do not exist yet."""

        statements = (Path(__file__).parent / "schema.sql").read_text()
        with self.connect() as connection:
            # Dagster can initialize several Postgres-backed assets in parallel.
            # Serialize the DDL so concurrent CREATE TABLE IF NOT EXISTS calls
            # cannot race inside PostgreSQL's type catalog.
            connection.execute("SELECT pg_advisory_xact_lock(735814159)")
            connection.execute(statements)

    def write_file_ownership(
        self, run_id: str, rows: Sequence[FileOwnership]
    ) -> int:
        values = [
            (
                run_id,
                row.organization,
                row.repository,
                row.file_path,
                row.author_name,
                row.author_email,
                row.surviving_lines,
                row.file_lines,
                row.ownership_share,
            )
            for row in rows
        ]
        self.ensure_schema()
        with self.connect() as connection:
            with connection.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO horizon_gt_features.file_ownership (
                        run_id, organization, repository, file_path,
                        author_name, author_email, surviving_lines, file_lines,
                        ownership_share
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (
                        run_id, organization, repository, file_path,
                        author_name, author_email
                    ) DO UPDATE SET
                        surviving_lines = EXCLUDED.surviving_lines,
                        file_lines = EXCLUDED.file_lines,
                        ownership_share = EXCLUDED.ownership_share
                    """,
                    values,
                )
        return len(values)

    def write_member_repository_ownership(
        self, run_id: str, rows: Sequence[MemberRepositoryOwnership]
    ) -> int:
        values = [
            (
                run_id,
                row.organization,
                row.repository,
                row.author_name,
                row.author_email,
                row.surviving_lines,
                row.repository_lines,
                row.ownership_share,
                row.files_owned,
                row.majority_owned_files,
                row.rank,
            )
            for row in rows
        ]
        self.ensure_schema()
        with self.connect() as connection:
            with connection.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO horizon_gt_features.member_repository_ownership (
                        run_id, organization, repository, author_name, author_email,
                        surviving_lines, repository_lines, ownership_share,
                        files_owned, majority_owned_files, rank
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (
                        run_id, organization, repository, author_name, author_email
                    ) DO UPDATE SET
                        surviving_lines = EXCLUDED.surviving_lines,
                        repository_lines = EXCLUDED.repository_lines,
                        ownership_share = EXCLUDED.ownership_share,
                        files_owned = EXCLUDED.files_owned,
                        majority_owned_files = EXCLUDED.majority_owned_files,
                        rank = EXCLUDED.rank
                    """,
                    values,
                )
        return len(values)

    def write_member_ownership(
        self, run_id: str, rows: Sequence[MemberOwnership]
    ) -> int:
        values = [
            (
                run_id,
                row.organization,
                row.author_name,
                row.author_email,
                row.surviving_lines,
                row.surviving_commits,
                row.files_owned,
                row.repositories,
                row.majority_owned_files,
                row.average_file_share,
            )
            for row in rows
        ]
        self.ensure_schema()
        with self.connect() as connection:
            with connection.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO horizon_gt_features.member_ownership (
                        run_id, organization, author_name, author_email,
                        surviving_lines, surviving_commits, files_owned,
                        repositories, majority_owned_files, average_file_share
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (
                        run_id, organization, author_name, author_email
                    ) DO UPDATE SET
                        surviving_lines = EXCLUDED.surviving_lines,
                        surviving_commits = EXCLUDED.surviving_commits,
                        files_owned = EXCLUDED.files_owned,
                        repositories = EXCLUDED.repositories,
                        majority_owned_files = EXCLUDED.majority_owned_files,
                        average_file_share = EXCLUDED.average_file_share
                    """,
                    values,
                )
        return len(values)

    def write_repository_concentration(
        self, run_id: str, rows: Sequence[RepositoryConcentration]
    ) -> int:
        """Refresh the latest repository snapshot within a rolling 72-hour window.

        A new run replaces the snapshot's source run ID and resets updated_at.
        Repeating the same run is a no-op, so retries do not extend the window.
        Older snapshots remain available once a gap exceeds 72 hours.
        """
        if any(row.run_id != run_id for row in rows):
            raise ValueError("Concentration rows must belong to the supplied run_id")
        self.ensure_schema()
        with self.connect() as connection:
            with connection.cursor() as cursor:
                # Consistent ordering avoids deadlocks for overlapping batches.
                for row in sorted(rows, key=lambda r: (r.organization, r.repository)):
                    # Serialize writers even when no snapshot exists to row-lock.
                    cursor.execute(
                        "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
                        [repr((row.organization, row.repository))],
                    )
                    cursor.execute(
                        """
                        SELECT run_id, updated_at
                        FROM horizon_gt_features.repository_concentration
                        WHERE organization = %s AND repository = %s
                        ORDER BY updated_at DESC, run_id DESC
                        LIMIT 1 FOR UPDATE
                        """,
                        (row.organization, row.repository),
                    )
                    latest = cursor.fetchone()
                    if latest and latest[0] == run_id:
                        continue
                    # Do not replay a historical run over a newer snapshot.
                    cursor.execute(
                        """SELECT 1 FROM horizon_gt_features.repository_concentration
                        WHERE run_id = %s AND organization = %s AND repository = %s""",
                        (run_id, row.organization, row.repository),
                    )
                    if cursor.fetchone():
                        continue
                    cursor.execute("SELECT clock_timestamp()")
                    written_at = cursor.fetchone()[0]
                    metrics = (
                        row.total_lines, row.distinct_authors, row.top_author_name,
                        row.top_author_email, row.top_author_share, row.hhi,
                        row.bus_factor_50,
                    )
                    if latest and written_at - latest[1] <= timedelta(days=3):
                        cursor.execute(
                            """
                            UPDATE horizon_gt_features.repository_concentration
                            SET run_id = %s, total_lines = %s, distinct_authors = %s,
                                top_author_name = %s, top_author_email = %s,
                                top_author_share = %s, hhi = %s, bus_factor_50 = %s,
                                updated_at = %s
                            WHERE run_id = %s AND organization = %s AND repository = %s
                            """,
                            (run_id, *metrics, written_at, latest[0],
                             row.organization, row.repository),
                        )
                    else:
                        cursor.execute(
                            """
                            INSERT INTO horizon_gt_features.repository_concentration (
                                run_id, organization, repository, total_lines,
                                distinct_authors, top_author_name, top_author_email,
                                top_author_share, hhi, bus_factor_50, created_at, updated_at
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (run_id, row.organization, row.repository, *metrics,
                             written_at, written_at),
                        )
        return len(rows)

    def _require_database_url(self) -> str:
        if not (self.database_url or "").strip():
            raise PipelineConfigError(
                "HORIZON_DATABASE_URL is not set. Set it to the legacy Horizon "
                "Supabase Postgres URL before materializing the feature assets."
            )
        return self.database_url.strip()
