"""Postgres storage boundary for the Horizon ownership feature tables."""

from __future__ import annotations

from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from pathlib import Path

import psycopg
from dagster import ConfigurableResource

from .blame_signals import (
    MemberMultiOwnerFiles,
    MemberMovedLines,
    MemberHistoryBoundary,
    MemberDirectoryComponentBreadth,
    MemberOwnershipEntropy,
    MemberStaleLines,
    RepositoryOrphanedCode,
)
from .config import PipelineConfigError
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

    def write_member_multi_owner_file_share(
        self, run_id: str, rows: Sequence[MemberMultiOwnerFiles]
    ) -> int:
        values = [
            (
                run_id,
                row.organization,
                row.repository,
                row.author_name,
                row.author_email,
                row.files_contributed,
                row.multi_owner_files,
                row.multi_owner_file_share,
            )
            for row in rows
        ]
        self.ensure_schema()
        with self.connect() as connection:
            with connection.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO horizon_gt_features.member_multi_owner_file_share (
                        run_id, organization, repository, author_name, author_email,
                        files_contributed, multi_owner_files, multi_owner_file_share
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (
                        run_id, organization, repository, author_name, author_email
                    ) DO UPDATE SET
                        files_contributed = EXCLUDED.files_contributed,
                        multi_owner_files = EXCLUDED.multi_owner_files,
                        multi_owner_file_share = EXCLUDED.multi_owner_file_share
                    """,
                    values,
                )
        return len(values)

    def write_member_ownership_entropy(
        self, run_id: str, rows: Sequence[MemberOwnershipEntropy]
    ) -> int:
        values = [
            (
                run_id,
                row.organization,
                row.repository,
                row.author_name,
                row.author_email,
                row.files_contributed,
                row.ownership_entropy,
            )
            for row in rows
        ]
        self.ensure_schema()
        with self.connect() as connection:
            with connection.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO horizon_gt_features.member_ownership_entropy (
                        run_id, organization, repository, author_name, author_email,
                        files_contributed, ownership_entropy
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (
                        run_id, organization, repository, author_name, author_email
                    ) DO UPDATE SET
                        files_contributed = EXCLUDED.files_contributed,
                        ownership_entropy = EXCLUDED.ownership_entropy
                    """,
                    values,
                )
        return len(values)

    def write_repository_orphaned_code(
        self, run_id: str, rows: Sequence[RepositoryOrphanedCode]
    ) -> int:
        values = [
            (
                run_id,
                row.organization,
                row.repository,
                row.surviving_lines,
                row.orphaned_lines,
                row.orphaned_code_share,
                row.active_identities,
            )
            for row in rows
        ]
        self.ensure_schema()
        with self.connect() as connection:
            with connection.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO horizon_gt_features.repository_orphaned_code (
                        run_id, organization, repository, surviving_lines,
                        orphaned_lines, orphaned_code_share, active_identities
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (run_id, organization, repository) DO UPDATE SET
                        surviving_lines = EXCLUDED.surviving_lines,
                        orphaned_lines = EXCLUDED.orphaned_lines,
                        orphaned_code_share = EXCLUDED.orphaned_code_share,
                        active_identities = EXCLUDED.active_identities
                    """,
                    values,
                )
        return len(values)

    def write_member_moved_line_share(
        self, run_id: str, rows: Sequence[MemberMovedLines]
    ) -> int:
        values = [
            (
                run_id,
                row.organization,
                row.repository,
                row.author_name,
                row.author_email,
                row.surviving_lines,
                row.moved_lines,
                row.moved_line_share,
            )
            for row in rows
        ]
        self.ensure_schema()
        with self.connect() as connection:
            with connection.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO horizon_gt_features.member_moved_line_share (
                        run_id, organization, repository, author_name, author_email,
                        surviving_lines, moved_lines, moved_line_share
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (
                        run_id, organization, repository, author_name, author_email
                    ) DO UPDATE SET
                        surviving_lines = EXCLUDED.surviving_lines,
                        moved_lines = EXCLUDED.moved_lines,
                        moved_line_share = EXCLUDED.moved_line_share
                    """,
                    values,
                )
        return len(values)

    def write_member_history_boundary_share(
        self, run_id: str, rows: Sequence[MemberHistoryBoundary]
    ) -> int:
        values = [
            (
                run_id,
                row.organization,
                row.repository,
                row.author_name,
                row.author_email,
                row.surviving_lines,
                row.history_boundary_lines,
                row.history_boundary_share,
            )
            for row in rows
        ]
        self.ensure_schema()
        with self.connect() as connection:
            with connection.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO horizon_gt_features.member_history_boundary_share (
                        run_id, organization, repository, author_name, author_email,
                        surviving_lines, history_boundary_lines, history_boundary_share
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (
                        run_id, organization, repository, author_name, author_email
                    ) DO UPDATE SET
                        surviving_lines = EXCLUDED.surviving_lines,
                        history_boundary_lines = EXCLUDED.history_boundary_lines,
                        history_boundary_share = EXCLUDED.history_boundary_share
                    """,
                    values,
                )
        return len(values)

    def write_member_directory_component_breadth(
        self, run_id: str, rows: Sequence[MemberDirectoryComponentBreadth]
    ) -> int:
        values = [
            (
                run_id,
                row.organization,
                row.repository,
                row.author_name,
                row.author_email,
                row.files_contributed,
                row.directory_breadth,
                row.component_breadth,
            )
            for row in rows
        ]
        self.ensure_schema()
        with self.connect() as connection:
            with connection.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO horizon_gt_features.member_directory_component_breadth (
                        run_id, organization, repository, author_name, author_email,
                        files_contributed, directory_breadth, component_breadth
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (
                        run_id, organization, repository, author_name, author_email
                    ) DO UPDATE SET
                        files_contributed = EXCLUDED.files_contributed,
                        directory_breadth = EXCLUDED.directory_breadth,
                        component_breadth = EXCLUDED.component_breadth
                    """,
                    values,
                )
        return len(values)

    def write_member_stale_line_share(
        self, run_id: str, rows: Sequence[MemberStaleLines]
    ) -> int:
        values = [
            (
                run_id,
                row.organization,
                row.repository,
                row.author_name,
                row.author_email,
                row.surviving_lines,
                row.stale_lines,
                row.stale_line_share,
            )
            for row in rows
        ]
        self.ensure_schema()
        with self.connect() as connection:
            with connection.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO horizon_gt_features.member_stale_line_share (
                        run_id, organization, repository, author_name, author_email,
                        surviving_lines, stale_lines, stale_line_share
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (
                        run_id, organization, repository, author_name, author_email
                    ) DO UPDATE SET
                        surviving_lines = EXCLUDED.surviving_lines,
                        stale_lines = EXCLUDED.stale_lines,
                        stale_line_share = EXCLUDED.stale_line_share
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

    def _require_database_url(self) -> str:
        if not (self.database_url or "").strip():
            raise PipelineConfigError(
                "HORIZON_DATABASE_URL is not set. Set it to the legacy Horizon "
                "Supabase Postgres URL before materializing the feature assets."
            )
        return self.database_url.strip()
