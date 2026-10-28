from math import isclose

import pytest
from dagster import asset, materialize

from pipeline.assets.features import repository_concentration
from pipeline.concentration import calculate_repository_concentration
from pipeline.ownership import MemberRepositoryOwnership
from pipeline.storage import PostgresResource


def ownership(share, name, *, organization="org", repository="repo"):
    return MemberRepositoryOwnership(
        organization, repository, name, f"{name}@example.com",
        round(share * 1000), 1000, share, 1, 0, 1,
    )


def test_metrics_keep_repositories_and_organizations_separate():
    inputs = [
        ownership(.4, "Alice"), ownership(.35, "Bob"), ownership(.25, "Carol"),
        ownership(1, "Solo", repository="other"),
        ownership(1, "OtherOrg", organization="other"),
    ]
    rows = calculate_repository_concentration("run-1", inputs)
    assert len(rows) == 3
    row = next(r for r in rows if (r.organization, r.repository) == ("org", "repo"))
    assert row.total_lines == 1000
    assert row.distinct_authors == 3
    assert row.top_author_name == "Alice"
    assert row.top_author_email == "Alice@example.com"
    assert row.top_author_share == .4
    assert isclose(row.hhi, .345)
    assert row.bus_factor_50 == 2
    assert all(r.run_id == "run-1" for r in rows)
    assert calculate_repository_concentration("run-1", list(reversed(inputs))) == rows


def test_equal_shares_use_email_tiebreak_and_stop_at_half():
    rows = calculate_repository_concentration(
        "run-1", [ownership(.5, "Bob"), ownership(.5, "Alice")]
    )
    assert rows[0].top_author_name == "Alice"
    assert rows[0].bus_factor_50 == 1
    assert calculate_repository_concentration("run-1", []) == []


def test_asset_calculates_writes_and_publishes_preview(monkeypatch):
    writes = []
    monkeypatch.setattr(
        PostgresResource, "write_repository_concentration",
        lambda self, run_id, rows: writes.append((run_id, rows)),
    )
    @asset
    def member_repository_ownership():
        return [ownership(1, "Alice")]

    result = materialize(
        [member_repository_ownership, repository_concentration],
        resources={"postgres": PostgresResource()},
    )
    assert result.success
    rows = result.output_for_node("repository_concentration")
    assert writes == [(result.run_id, rows)]
    assert rows[0].run_id == result.run_id
    event = result.asset_materializations_for_node("repository_concentration")[0]
    assert event.metadata["rows"].value == 1
    assert event.metadata["sample"].records[0].data["total_lines"] == 1000


def test_writer_rejects_mismatched_source_run_before_connecting():
    rows = calculate_repository_concentration("run-1", [ownership(1, "Alice")])
    with pytest.raises(ValueError, match="run_id"):
        PostgresResource().write_repository_concentration("run-2", rows)


def test_writer_rolling_window_and_retries(monkeypatch):
    from contextlib import contextmanager
    from datetime import datetime, timedelta, timezone
    from dataclasses import replace

    snapshots = {}
    now = datetime(2026, 10, 19, tzinfo=timezone.utc)

    class Cursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def execute(self, sql, params=()):
            self.result = None
            if "SELECT run_id, updated_at" in sql:
                matches = [(key[0], value[0]) for key, value in snapshots.items()
                           if key[1:] == tuple(params)]
                self.result = max(matches, key=lambda x: x[1]) if matches else None
            elif "SELECT 1 FROM" in sql:
                self.result = (1,) if tuple(params) in snapshots else None
            elif "SELECT clock_timestamp()" in sql:
                self.result = (now,)
            elif "INSERT INTO" in sql:
                key = tuple(params[:3])
                assert key not in snapshots
                snapshots[key] = (params[-1], params[3:10], params[-2])
            elif "UPDATE horizon_gt_features" in sql:
                old_key = tuple(params[-3:])
                old = snapshots.pop(old_key)
                snapshots[(params[0], *old_key[1:])] = (params[8], params[1:8], old[2])

        def fetchone(self):
            return self.result

    class Connection:
        def cursor(self):
            return Cursor()

    @contextmanager
    def connect(self):
        yield Connection()

    monkeypatch.setattr(PostgresResource, "ensure_schema", lambda self: None)
    monkeypatch.setattr(PostgresResource, "connect", connect)
    store = PostgresResource()

    def write(run, *, org="org", repo="repo", lines=1000):
        row = calculate_repository_concentration(
            run, [ownership(1, "Alice", organization=org, repository=repo)]
        )[0]
        return store.write_repository_concentration(run, [replace(row, total_lines=lines)])

    assert write("monday") == 1
    created = now
    now += timedelta(days=2)
    write("wednesday", lines=1200)
    assert set(snapshots) == {("wednesday", "org", "repo")}
    assert snapshots[("wednesday", "org", "repo")][1][0] == 1200
    now += timedelta(days=2)
    write("friday")  # Four days after creation, but two since the last run.
    assert set(snapshots) == {("friday", "org", "repo")}
    assert snapshots[("friday", "org", "repo")][2] == created
    before_retry = dict(snapshots)
    now += timedelta(hours=1)
    write("friday")
    assert snapshots == before_retry  # A retry must not reset the clock.
    now += timedelta(days=7)
    write("next-friday")
    assert len(snapshots) == 2
    write("friday")  # Retained historical run must not replace the newest one.
    assert len(snapshots) == 2
    now += timedelta(days=3)
    write("exact-boundary")  # Exactly 72 hours still refreshes.
    assert ("exact-boundary", "org", "repo") in snapshots
    assert len(snapshots) == 2
    now += timedelta(days=3, microseconds=1)
    write("outside-boundary")
    assert len(snapshots) == 3
    write("other-org", org="other")
    write("other-repo", repo="other")
    assert len(snapshots) == 5
