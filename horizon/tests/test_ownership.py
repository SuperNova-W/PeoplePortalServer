from dataclasses import replace

from pipeline.blame_parser import BlameRecord
from pipeline.ownership import (
    calculate_file_ownership,
    calculate_member_ownership,
    calculate_member_repository_ownership,
    reconcile_file_ownership,
    reconcile_member_ownership,
    reconcile_member_repository_ownership,
)


def record(
    *,
    path: str,
    author: str,
    email: str,
    commit: str,
    repository: str = "repo-a",
) -> BlameRecord:
    return BlameRecord(
        organization="org",
        repository=repository,
        blamed_file_path=path,
        line_number_in_file=1,
        commit_sha=commit,
        commit_summary="summary",
        consecutive_line_count=None,
        line_number_at_origin=1,
        author_name=author,
        author_email=email,
        authored_at_epoch=1,
        author_utc_offset="+0000",
        committer_name=author,
        committer_email=email,
        committed_at_epoch=1,
        committer_utc_offset="+0000",
        origin_file_path=path,
        previous_commit_sha=None,
        previous_file_path=None,
        reaches_history_boundary=False,
    )


def test_ownership_calculates_file_and_repository_shares():
    records = [
        record(path="a.py", author="Alice", email="a@example.com", commit="a1"),
        record(path="a.py", author="Alice", email="a@example.com", commit="a2"),
        record(path="a.py", author="Bob", email="b@example.com", commit="b1"),
        record(path="b.py", author="Bob", email="b@example.com", commit="b1"),
    ]

    file_rows = calculate_file_ownership(records)
    assert [(row.file_path, row.author_name, row.surviving_lines, row.file_lines) for row in file_rows] == [
        ("a.py", "Alice", 2, 3),
        ("a.py", "Bob", 1, 3),
        ("b.py", "Bob", 1, 1),
    ]
    assert file_rows[0].ownership_share == 2 / 3

    repository_rows = calculate_member_repository_ownership(file_rows)
    assert [(row.author_name, row.surviving_lines, row.rank) for row in repository_rows] == [
        ("Alice", 2, 1),
        ("Bob", 2, 2),
    ]
    assert repository_rows[0].ownership_share == 2 / 4


def test_member_ownership_counts_distinct_surviving_commits():
    records = [
        record(path="a.py", author="Alice", email="a@example.com", commit="a1"),
        record(path="a.py", author="Alice", email="a@example.com", commit="a1"),
        record(path="b.py", author="Alice", email="a@example.com", commit="a2"),
        record(path="a.py", author="Bob", email="b@example.com", commit="b1"),
    ]
    file_rows = calculate_file_ownership(records)
    repository_rows = calculate_member_repository_ownership(file_rows)
    member_rows = calculate_member_ownership(records, file_rows, repository_rows)

    alice = next(row for row in member_rows if row.author_name == "Alice")
    assert alice.surviving_lines == 3
    assert alice.surviving_commits == 2
    assert alice.files_owned == 2
    assert alice.repositories == 1
    assert alice.majority_owned_files == 2
    assert alice.average_file_share == (2 / 3 + 1) / 2


def _layers(records):
    file_rows = calculate_file_ownership(records)
    repository_rows = calculate_member_repository_ownership(file_rows)
    member_rows = calculate_member_ownership(records, file_rows, repository_rows)
    return file_rows, repository_rows, member_rows


def _sample_records():
    return [
        record(path="a.py", author="Alice", email="a@example.com", commit="a1"),
        record(path="a.py", author="Alice", email="a@example.com", commit="a2"),
        record(path="a.py", author="Bob", email="b@example.com", commit="b1"),
        record(path="b.py", author="Bob", email="b@example.com", commit="b1"),
        record(path="c.py", author="Cara", email="c@example.com", commit="c1"),
        record(path="c.py", author="Alice", email="a@example.com", commit="a1"),
        record(path="c.py", author="Bob", email="b@example.com", commit="b2"),
        record(
            path="x.py", author="Alice", email="a@example.com", commit="a3",
            repository="repo-b",
        ),
    ]


def test_calculated_layers_reconcile():
    records = _sample_records()
    file_rows, repository_rows, member_rows = _layers(records)

    assert reconcile_file_ownership(records, file_rows) == []
    assert reconcile_member_repository_ownership(file_rows, repository_rows) == []
    assert reconcile_member_ownership(records, repository_rows, member_rows) == []


def test_thirds_sum_to_one_within_tolerance():
    # 1/3 + 1/3 + 1/3 is not exactly 1.0 in floating point for every ordering.
    records = _sample_records()
    file_rows, _, _ = _layers(records)
    c_shares = [row.ownership_share for row in file_rows if row.file_path == "c.py"]

    assert len(c_shares) == 3
    assert reconcile_file_ownership(records, file_rows) == []


def test_file_reconciliation_catches_bad_share_and_missing_records():
    records = _sample_records()
    file_rows, _, _ = _layers(records)
    broken = [replace(file_rows[0], ownership_share=0.9), *file_rows[1:]]

    problems = reconcile_file_ownership(records, broken)
    assert any("a.py: shares sum to" in problem for problem in problems)

    extra = [*records, record(path="new.py", author="Dan", email="d@example.com", commit="d1")]
    problems = reconcile_file_ownership(extra, file_rows)
    assert any("new.py: has blame records but no ownership rows" in p for p in problems)


def test_repository_reconciliation_catches_rank_gap_and_line_drift():
    records = _sample_records()
    file_rows, repository_rows, _ = _layers(records)
    broken = [replace(row, rank=row.rank + 1) for row in repository_rows]

    problems = reconcile_member_repository_ownership(file_rows, broken)
    assert any("ranks are" in problem for problem in problems)

    drifted = [replace(repository_rows[0], surviving_lines=99), *repository_rows[1:]]
    problems = reconcile_member_repository_ownership(file_rows, drifted)
    assert any("in file_ownership" in problem for problem in problems)


def test_member_reconciliation_catches_wrong_commit_count():
    records = _sample_records()
    _, repository_rows, member_rows = _layers(records)
    broken = [replace(member_rows[0], surviving_commits=0), *member_rows[1:]]

    problems = reconcile_member_ownership(records, repository_rows, broken)
    assert any("surviving_commits is 0" in problem for problem in problems)
