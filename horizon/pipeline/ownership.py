"""Pure ownership calculations over parsed git-blame records.

The calculations deliberately stay separate from Dagster and SQLite.  That
keeps the definitions easy to test and gives the eventual database migration a
small boundary: change the store, not the metric definitions.

The numbers describe surviving lines in the current snapshot.  A surviving
commit is a distinct commit SHA that still owns at least one surviving line;
this is not the same thing as counting every commit created during a semester.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, replace

from .blame_parser import BlameRecord


@dataclass(frozen=True)
class FileOwnership:
    """A member's surviving-line share of one file."""

    organization: str
    repository: str
    file_path: str
    author_name: str
    author_email: str
    surviving_lines: int
    file_lines: int
    ownership_share: float


@dataclass(frozen=True)
class MemberRepositoryOwnership:
    """A member's surviving-line share of one repository."""

    organization: str
    repository: str
    author_name: str
    author_email: str
    surviving_lines: int
    repository_lines: int
    ownership_share: float
    files_owned: int
    majority_owned_files: int
    rank: int


@dataclass(frozen=True)
class MemberOwnership:
    """A member's aggregate surviving contribution across the snapshot."""

    organization: str
    author_name: str
    author_email: str
    surviving_lines: int
    surviving_commits: int
    files_owned: int
    repositories: int
    majority_owned_files: int
    average_file_share: float


Identity = tuple[str, str]
FileKey = tuple[str, str, str]
RepositoryKey = tuple[str, str]
MemberKey = tuple[str, str, str]


def calculate_file_ownership(records: list[BlameRecord]) -> list[FileOwnership]:
    """Count surviving lines by file and author, then calculate file share."""

    file_lines: dict[FileKey, int] = defaultdict(int)
    author_lines: dict[tuple[FileKey, Identity], int] = defaultdict(int)

    for record in records:
        file_key = (record.organization, record.repository, record.blamed_file_path)
        identity = (record.author_name, record.author_email)
        file_lines[file_key] += 1
        author_lines[(file_key, identity)] += 1

    rows = [
        FileOwnership(
            organization=organization,
            repository=repository,
            file_path=file_path,
            author_name=author_name,
            author_email=author_email,
            surviving_lines=lines,
            file_lines=file_lines[(organization, repository, file_path)],
            ownership_share=lines / file_lines[(organization, repository, file_path)],
        )
        for (
            (organization, repository, file_path),
            (author_name, author_email),
        ), lines in author_lines.items()
    ]
    return sorted(
        rows,
        key=lambda row: (
            row.organization,
            row.repository,
            row.file_path,
            -row.surviving_lines,
            row.author_email,
            row.author_name,
        ),
    )


def calculate_member_repository_ownership(
    file_rows: list[FileOwnership],
) -> list[MemberRepositoryOwnership]:
    """Aggregate file rows into one ownership row per member and repository."""

    repository_lines: dict[RepositoryKey, int] = defaultdict(int)
    seen_files: set[FileKey] = set()
    for row in file_rows:
        file_key = (row.organization, row.repository, row.file_path)
        if file_key not in seen_files:
            repository_lines[(row.organization, row.repository)] += row.file_lines
            seen_files.add(file_key)

    grouped: dict[
        tuple[str, str, str, str], list[FileOwnership]
    ] = defaultdict(list)
    for row in file_rows:
        grouped[
            (row.organization, row.repository, row.author_name, row.author_email)
        ].append(row)

    rows = []
    for (organization, repository, author_name, author_email), member_rows in grouped.items():
        rows.append(
            MemberRepositoryOwnership(
                organization=organization,
                repository=repository,
                author_name=author_name,
                author_email=author_email,
                surviving_lines=sum(row.surviving_lines for row in member_rows),
                repository_lines=repository_lines[(organization, repository)],
                ownership_share=(
                    sum(row.surviving_lines for row in member_rows)
                    / repository_lines[(organization, repository)]
                ),
                files_owned=len({row.file_path for row in member_rows}),
                majority_owned_files=sum(
                    1 for row in member_rows if row.ownership_share > 0.5
                ),
                rank=0,
            )
        )

    ranked: list[MemberRepositoryOwnership] = []
    for repository in sorted({(row.organization, row.repository) for row in rows}):
        repository_rows = sorted(
            (
                row
                for row in rows
                if (row.organization, row.repository) == repository
            ),
            key=lambda row: (-row.surviving_lines, row.author_email, row.author_name),
        )
        ranked.extend(
            replace(row, rank=rank)
            for rank, row in enumerate(repository_rows, start=1)
        )
    return ranked


def calculate_member_ownership(
    records: list[BlameRecord],
    file_rows: list[FileOwnership],
    repository_rows: list[MemberRepositoryOwnership],
) -> list[MemberOwnership]:
    """Aggregate ownership and distinct surviving commit counts."""

    commits: dict[tuple[str, Identity], set[tuple[str, str]]] = defaultdict(set)
    for record in records:
        commits[(record.organization, (record.author_name, record.author_email))].add(
            (record.repository, record.commit_sha)
        )

    grouped: dict[tuple[str, str, str], list[MemberRepositoryOwnership]] = defaultdict(list)
    for row in repository_rows:
        grouped[(row.organization, row.author_name, row.author_email)].append(row)

    rows = [
        MemberOwnership(
            organization=organization,
            author_name=author_name,
            author_email=author_email,
            surviving_lines=sum(row.surviving_lines for row in member_rows),
            surviving_commits=len(
                commits[(organization, (author_name, author_email))]
            ),
            files_owned=sum(row.files_owned for row in member_rows),
            repositories=len(member_rows),
            majority_owned_files=sum(row.majority_owned_files for row in member_rows),
            average_file_share=0.0,
        )
        for (organization, author_name, author_email), member_rows in grouped.items()
    ]

    shares: dict[tuple[str, str, str], list[float]] = defaultdict(list)
    for row in file_rows:
        shares[(row.organization, row.author_name, row.author_email)].append(
            row.ownership_share
        )

    return sorted(
        [
            replace(
                row,
                average_file_share=sum(
                    shares[(row.organization, row.author_name, row.author_email)]
                )
                / len(shares[(row.organization, row.author_name, row.author_email)]),
            )
            for row in rows
        ],
        key=lambda row: (
            row.organization,
            -row.surviving_lines,
            row.author_email,
            row.author_name,
        ),
    )



# Reconciliation: the invariants that tie the three layers back to each other
# and to the blame records they came from. Each function returns a list of
# human-readable problems; an empty list means the layer reconciles. They stay
# pure so the asset checks are thin wrappers and the rules are testable alone.

# Shares are floats, so a sum of thirds is not exactly one.
SHARE_TOLERANCE = 1e-9

# Problems are reported up to this many per check, so one systematic bug does
# not produce a description thousands of lines long.
_MAX_PROBLEMS = 20


def _share_total_is_one(total: float) -> bool:
    return abs(total - 1.0) <= SHARE_TOLERANCE


def _capped(problems: list[str]) -> list[str]:
    if len(problems) <= _MAX_PROBLEMS:
        return problems
    hidden = len(problems) - _MAX_PROBLEMS
    return [*problems[:_MAX_PROBLEMS], f"... and {hidden} more."]


def reconcile_file_ownership(
    records: list[BlameRecord], file_rows: list[FileOwnership]
) -> list[str]:
    """File shares sum to one, line counts add up, and every record is counted."""

    problems: list[str] = []

    record_lines: dict[FileKey, int] = defaultdict(int)
    for record in records:
        record_lines[
            (record.organization, record.repository, record.blamed_file_path)
        ] += 1

    by_file: dict[FileKey, list[FileOwnership]] = defaultdict(list)
    for row in file_rows:
        by_file[(row.organization, row.repository, row.file_path)].append(row)

    for file_key, rows in sorted(by_file.items()):
        label = "/".join(file_key)
        share_total = sum(row.ownership_share for row in rows)
        line_total = sum(row.surviving_lines for row in rows)
        declared = {row.file_lines for row in rows}

        if not _share_total_is_one(share_total):
            problems.append(f"{label}: shares sum to {share_total!r}, not 1.")
        if declared != {line_total}:
            problems.append(
                f"{label}: author lines sum to {line_total} but file_lines is "
                f"{sorted(declared)}."
            )
        if record_lines.get(file_key) != line_total:
            problems.append(
                f"{label}: {line_total} lines in file_ownership but "
                f"{record_lines.get(file_key, 0)} blame records."
            )

    for file_key in sorted(set(record_lines) - set(by_file)):
        problems.append(f"{'/'.join(file_key)}: has blame records but no ownership rows.")

    return _capped(problems)


def reconcile_member_repository_ownership(
    file_rows: list[FileOwnership],
    repository_rows: list[MemberRepositoryOwnership],
) -> list[str]:
    """Repository shares sum to one, totals match files, and ranks are 1..n."""

    problems: list[str] = []

    file_lines: dict[RepositoryKey, dict[str, int]] = defaultdict(dict)
    member_lines: dict[tuple[str, str, str, str], int] = defaultdict(int)
    for row in file_rows:
        file_lines[(row.organization, row.repository)][row.file_path] = row.file_lines
        member_lines[
            (row.organization, row.repository, row.author_name, row.author_email)
        ] += row.surviving_lines

    by_repository: dict[RepositoryKey, list[MemberRepositoryOwnership]] = defaultdict(list)
    for row in repository_rows:
        by_repository[(row.organization, row.repository)].append(row)

    for repository_key, rows in sorted(by_repository.items()):
        label = "/".join(repository_key)
        share_total = sum(row.ownership_share for row in rows)
        line_total = sum(row.surviving_lines for row in rows)
        expected_lines = sum(file_lines.get(repository_key, {}).values())
        declared = {row.repository_lines for row in rows}
        ranks = sorted(row.rank for row in rows)

        if not _share_total_is_one(share_total):
            problems.append(f"{label}: shares sum to {share_total!r}, not 1.")
        if declared != {line_total}:
            problems.append(
                f"{label}: member lines sum to {line_total} but repository_lines "
                f"is {sorted(declared)}."
            )
        if line_total != expected_lines:
            problems.append(
                f"{label}: {line_total} lines here but {expected_lines} in file_ownership."
            )
        if ranks != list(range(1, len(rows) + 1)):
            problems.append(f"{label}: ranks are {ranks}, not 1..{len(rows)}.")

        for row in rows:
            key = (row.organization, row.repository, row.author_name, row.author_email)
            if member_lines.get(key) != row.surviving_lines:
                problems.append(
                    f"{label} {row.author_email}: {row.surviving_lines} lines here but "
                    f"{member_lines.get(key, 0)} in file_ownership."
                )

    for repository_key in sorted(set(file_lines) - set(by_repository)):
        problems.append(f"{'/'.join(repository_key)}: has file rows but no repository rows.")

    return _capped(problems)


def reconcile_member_ownership(
    records: list[BlameRecord],
    repository_rows: list[MemberRepositoryOwnership],
    member_rows: list[MemberOwnership],
) -> list[str]:
    """Member aggregates equal the sums of their repository rows and records."""

    problems: list[str] = []

    expected: dict[MemberKey, dict[str, int]] = defaultdict(
        lambda: defaultdict(int)
    )
    for row in repository_rows:
        totals = expected[(row.organization, row.author_name, row.author_email)]
        totals["surviving_lines"] += row.surviving_lines
        totals["files_owned"] += row.files_owned
        totals["repositories"] += 1
        totals["majority_owned_files"] += row.majority_owned_files

    commits: dict[MemberKey, set[tuple[str, str]]] = defaultdict(set)
    for record in records:
        commits[(record.organization, record.author_name, record.author_email)].add(
            (record.repository, record.commit_sha)
        )

    seen: set[MemberKey] = set()
    for row in member_rows:
        key = (row.organization, row.author_name, row.author_email)
        seen.add(key)
        label = f"{row.organization} {row.author_email}"
        actual = {
            "surviving_lines": row.surviving_lines,
            "files_owned": row.files_owned,
            "repositories": row.repositories,
            "majority_owned_files": row.majority_owned_files,
            "surviving_commits": row.surviving_commits,
        }
        wanted = {**expected.get(key, {}), "surviving_commits": len(commits.get(key, ()))}
        for name, value in actual.items():
            if wanted.get(name, 0) != value:
                problems.append(f"{label}: {name} is {value}, expected {wanted.get(name, 0)}.")
        if not 0.0 <= row.average_file_share <= 1.0:
            problems.append(
                f"{label}: average_file_share {row.average_file_share!r} is outside 0..1."
            )

    for key in sorted(set(expected) - seen):
        problems.append(f"{key[0]} {key[2]}: has repository rows but no member row.")

    return _capped(problems)
