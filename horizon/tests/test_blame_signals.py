from pipeline.blame_parser import BlameRecord
from pipeline.blame_signals import (
    calculate_member_multi_owner_file_share,
    calculate_member_ownership_entropy,
)


def record(*, path: str, author: str, email: str) -> BlameRecord:
    return BlameRecord(
        organization="org",
        repository="repo",
        blamed_file_path=path,
        line_number_in_file=1,
        commit_sha=f"{author}-{path}",
        commit_summary="summary",
        consecutive_line_count=None,
        line_number_at_origin=1,
        author_name=author,
        author_email=email,
        authored_at_epoch=2_000_000_000,
        author_utc_offset="+0000",
        committer_name=author,
        committer_email=email,
        committed_at_epoch=2_000_000_000,
        committer_utc_offset="+0000",
        origin_file_path=path,
        previous_commit_sha=None,
        previous_file_path=None,
        reaches_history_boundary=False,
    )


def test_multi_owner_file_share_is_calculated_per_member():
    rows = calculate_member_multi_owner_file_share(
        [
            record(path="src/a.py", author="Alice", email="a@example.com"),
            record(path="src/a.py", author="Bob", email="b@example.com"),
            record(path="src/b.py", author="Alice", email="a@example.com"),
        ]
    )

    alice = next(row for row in rows if row.author_name == "Alice")
    bob = next(row for row in rows if row.author_name == "Bob")
    assert alice.files_contributed == 2
    assert alice.multi_owner_files == 1
    assert alice.multi_owner_file_share == 0.5
    assert bob.multi_owner_file_share == 1.0


def test_ownership_entropy_is_zero_for_single_owner_and_one_when_balanced():
    rows = calculate_member_ownership_entropy(
        [
            record(path="src/a.py", author="Alice", email="a@example.com"),
            record(path="src/a.py", author="Bob", email="b@example.com"),
            record(path="src/b.py", author="Alice", email="a@example.com"),
        ]
    )

    alice = next(row for row in rows if row.author_name == "Alice")
    assert alice.files_contributed == 2
    assert alice.ownership_entropy == 0.5
