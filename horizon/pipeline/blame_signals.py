"""Pure signals derived from parsed Git blame records."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from math import log
from pathlib import PurePosixPath

from .blame_parser import BlameRecord


STALE_WINDOW_SECONDS = 180 * 24 * 60 * 60


@dataclass(frozen=True)
class MemberMultiOwnerFiles:
    """Share of a member's contributed files that have multiple owners."""

    organization: str
    repository: str
    author_name: str
    author_email: str
    files_contributed: int
    multi_owner_files: int
    multi_owner_file_share: float


@dataclass(frozen=True)
class MemberOwnershipEntropy:
    """Mean normalized ownership entropy for a member's contributed files."""

    organization: str
    repository: str
    author_name: str
    author_email: str
    files_contributed: int
    ownership_entropy: float


@dataclass(frozen=True)
class RepositoryOrphanedCode:
    """Lines owned by identities outside the active member roster."""

    organization: str
    repository: str
    surviving_lines: int
    orphaned_lines: int
    orphaned_code_share: float
    active_identities: int


@dataclass(frozen=True)
class MemberMovedLines:
    """Share of a member's surviving lines traced across file paths."""

    organization: str
    repository: str
    author_name: str
    author_email: str
    surviving_lines: int
    moved_lines: int
    moved_line_share: float


@dataclass(frozen=True)
class MemberHistoryBoundary:
    """Share of a member's lines that reach the repository history boundary."""

    organization: str
    repository: str
    author_name: str
    author_email: str
    surviving_lines: int
    history_boundary_lines: int
    history_boundary_share: float


@dataclass(frozen=True)
class MemberDirectoryComponentBreadth:
    """Directory and top-level component breadth for one member."""

    organization: str
    repository: str
    author_name: str
    author_email: str
    files_contributed: int
    directory_breadth: int
    component_breadth: int


@dataclass(frozen=True)
class MemberStaleLines:
    """Share of a member's lines older than the stale window."""

    organization: str
    repository: str
    author_name: str
    author_email: str
    surviving_lines: int
    stale_lines: int
    stale_line_share: float


def calculate_member_multi_owner_file_share(
    records: list[BlameRecord],
) -> list[MemberMultiOwnerFiles]:
    """Calculate collaboration surface by member and repository."""

    file_owners: dict[tuple[str, str, str], set[tuple[str, str]]] = defaultdict(set)
    for record in records:
        file_owners[(record.organization, record.repository, record.blamed_file_path)].add(
            (record.author_name, record.author_email)
        )

    member_files: dict[tuple[str, str, str, str], list[tuple[str, str, str]]] = defaultdict(list)
    for file_key, owners in file_owners.items():
        for author_name, author_email in owners:
            member_files[(file_key[0], file_key[1], author_name, author_email)].append(
                file_key
            )

    rows = []
    for (organization, repository, author_name, author_email), files in member_files.items():
        shared_files = sum(1 for file_key in files if len(file_owners[file_key]) > 1)
        rows.append(
            MemberMultiOwnerFiles(
                organization=organization,
                repository=repository,
                author_name=author_name,
                author_email=author_email,
                files_contributed=len(files),
                multi_owner_files=shared_files,
                multi_owner_file_share=shared_files / len(files),
            )
        )

    return sorted(
        rows,
        key=lambda row: (
            row.organization,
            row.repository,
            -row.files_contributed,
            row.author_email,
            row.author_name,
        ),
    )


def calculate_member_ownership_entropy(
    records: list[BlameRecord],
) -> list[MemberOwnershipEntropy]:
    """Calculate normalized Shannon entropy of ownership by member.

    Each file's entropy is normalized by ``log(number_of_owners)``. A file
    with one owner is zero; an evenly shared file is one. The member value is
    the arithmetic mean across files they contribute to.
    """

    file_counts: dict[tuple[str, str, str], dict[tuple[str, str], int]] = defaultdict(
        lambda: defaultdict(int)
    )
    for record in records:
        file_counts[(record.organization, record.repository, record.blamed_file_path)][
            (record.author_name, record.author_email)
        ] += 1

    file_entropy: dict[tuple[str, str, str], float] = {}
    for file_key, owners in file_counts.items():
        if len(owners) <= 1:
            file_entropy[file_key] = 0.0
            continue
        total = sum(owners.values())
        file_entropy[file_key] = -sum(
            (lines / total) * log(lines / total) for lines in owners.values()
        ) / log(len(owners))

    member_files: dict[tuple[str, str, str, str], list[tuple[str, str, str]]] = defaultdict(list)
    for file_key, owners in file_counts.items():
        for author_name, author_email in owners:
            member_files[(file_key[0], file_key[1], author_name, author_email)].append(
                file_key
            )

    rows = [
        MemberOwnershipEntropy(
            organization=organization,
            repository=repository,
            author_name=author_name,
            author_email=author_email,
            files_contributed=len(files),
            ownership_entropy=sum(file_entropy[file_key] for file_key in files)
            / len(files),
        )
        for (organization, repository, author_name, author_email), files in member_files.items()
    ]
    return sorted(
        rows,
        key=lambda row: (
            row.organization,
            row.repository,
            -row.files_contributed,
            row.author_email,
            row.author_name,
        ),
    )


def calculate_orphaned_code_share(
    records: list[BlameRecord],
    active_emails: set[str] | frozenset[str],
) -> list[RepositoryOrphanedCode]:
    """Calculate code owned by authors outside the configured active roster."""

    normalized_emails = {
        email.strip().lower() for email in active_emails if email.strip()
    }
    if not normalized_emails:
        raise ValueError(
            "an active member email roster is required to calculate orphaned code"
        )

    counts: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    for record in records:
        key = (record.organization, record.repository)
        counts[key][0] += 1
        if record.author_email.strip().lower() not in normalized_emails:
            counts[key][1] += 1

    return [
        RepositoryOrphanedCode(
            organization=organization,
            repository=repository,
            surviving_lines=surviving_lines,
            orphaned_lines=orphaned_lines,
            orphaned_code_share=orphaned_lines / surviving_lines,
            active_identities=len(normalized_emails),
        )
        for (organization, repository), (surviving_lines, orphaned_lines) in sorted(
            counts.items()
        )
    ]


def calculate_member_moved_line_share(
    records: list[BlameRecord],
) -> list[MemberMovedLines]:
    """Calculate the share of surviving lines moved between files."""

    counts: dict[tuple[str, str, str, str], list[int]] = defaultdict(lambda: [0, 0])
    for record in records:
        key = (
            record.organization,
            record.repository,
            record.author_name,
            record.author_email,
        )
        counts[key][0] += 1
        if record.moved_between_files:
            counts[key][1] += 1

    return [
        MemberMovedLines(
            organization=organization,
            repository=repository,
            author_name=author_name,
            author_email=author_email,
            surviving_lines=surviving_lines,
            moved_lines=moved_lines,
            moved_line_share=moved_lines / surviving_lines,
        )
        for (
            organization,
            repository,
            author_name,
            author_email,
        ), (surviving_lines, moved_lines) in sorted(counts.items())
    ]


def calculate_member_history_boundary_share(
    records: list[BlameRecord],
) -> list[MemberHistoryBoundary]:
    """Calculate the share of surviving lines that reach Git's boundary."""

    counts: dict[tuple[str, str, str, str], list[int]] = defaultdict(lambda: [0, 0])
    for record in records:
        key = (
            record.organization,
            record.repository,
            record.author_name,
            record.author_email,
        )
        counts[key][0] += 1
        if record.reaches_history_boundary:
            counts[key][1] += 1

    return [
        MemberHistoryBoundary(
            organization=organization,
            repository=repository,
            author_name=author_name,
            author_email=author_email,
            surviving_lines=surviving_lines,
            history_boundary_lines=history_boundary_lines,
            history_boundary_share=history_boundary_lines / surviving_lines,
        )
        for (
            organization,
            repository,
            author_name,
            author_email,
        ), (surviving_lines, history_boundary_lines) in sorted(counts.items())
    ]


def calculate_member_directory_component_breadth(
    records: list[BlameRecord],
) -> list[MemberDirectoryComponentBreadth]:
    """Calculate directory and top-level component breadth by member.

    Directory breadth counts distinct immediate parent directories. Component
    breadth counts distinct top-level path components, which remains stable as
    files move deeper within a component.
    """

    groups: dict[tuple[str, str, str, str], dict[str, set]] = defaultdict(
        lambda: {"files": set(), "directories": set(), "components": set()}
    )
    for record in records:
        key = (
            record.organization,
            record.repository,
            record.author_name,
            record.author_email,
        )
        path = PurePosixPath(record.blamed_file_path)
        groups[key]["files"].add(record.blamed_file_path)
        groups[key]["directories"].add(
            str(path.parent) if str(path.parent) != "." else "(root)"
        )
        groups[key]["components"].add(path.parts[0] if len(path.parts) > 1 else "(root)")

    return [
        MemberDirectoryComponentBreadth(
            organization=organization,
            repository=repository,
            author_name=author_name,
            author_email=author_email,
            files_contributed=len(values["files"]),
            directory_breadth=len(values["directories"]),
            component_breadth=len(values["components"]),
        )
        for (organization, repository, author_name, author_email), values in sorted(
            groups.items()
        )
    ]


def calculate_member_stale_line_share(
    records: list[BlameRecord],
) -> list[MemberStaleLines]:
    """Calculate stale-line share relative to the snapshot's newest author time.

    A line is stale when it is at least 180 days older than the newest authored
    line in the capture. Missing timestamps are not classified as stale.
    """

    timestamps = [
        record.authored_at_epoch
        for record in records
        if record.authored_at_epoch is not None
    ]
    stale_before = max(timestamps, default=0) - STALE_WINDOW_SECONDS
    counts: dict[tuple[str, str, str, str], list[int]] = defaultdict(lambda: [0, 0])
    for record in records:
        key = (
            record.organization,
            record.repository,
            record.author_name,
            record.author_email,
        )
        counts[key][0] += 1
        if (
            record.authored_at_epoch is not None
            and record.authored_at_epoch <= stale_before
        ):
            counts[key][1] += 1

    return [
        MemberStaleLines(
            organization=organization,
            repository=repository,
            author_name=author_name,
            author_email=author_email,
            surviving_lines=surviving_lines,
            stale_lines=stale_lines,
            stale_line_share=stale_lines / surviving_lines,
        )
        for (
            organization,
            repository,
            author_name,
            author_email,
        ), (surviving_lines, stale_lines) in sorted(counts.items())
    ]
