"""Pure signals derived from parsed Git blame records."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from math import log

from .blame_parser import BlameRecord


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
