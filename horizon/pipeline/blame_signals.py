"""Pure signals derived from parsed Git blame records."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

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
