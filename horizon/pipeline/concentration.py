"""Pure repository concentration calculations for one source run."""

from collections import defaultdict
from dataclasses import dataclass

from .ownership import MemberRepositoryOwnership


@dataclass(frozen=True)
class RepositoryConcentration:
    """A repository's calculated totals, associated with its source run."""

    run_id: str
    organization: str
    repository: str
    total_lines: int
    distinct_authors: int
    top_author_name: str
    top_author_email: str
    top_author_share: float
    hhi: float
    bus_factor_50: int


def calculate_repository_concentration(
    run_id: str,
    ownership_rows: list[MemberRepositoryOwnership],
) -> list[RepositoryConcentration]:
    """Group one run's ownership rows and calculate repository metrics.

    Ownership objects do not carry run IDs, so callers must pass only rows
    belonging to the supplied run. These groups exist only in memory; this
    function does not create or write database tables.
    """
    if not run_id.strip():
        raise ValueError("run_id must not be empty")

    grouped: dict[
        tuple[str, str, str], list[MemberRepositoryOwnership]
    ] = defaultdict(list)
    for row in ownership_rows:
        grouped[(run_id, row.organization, row.repository)].append(row)

    results = []
    for (source_run_id, organization, repository), author_rows in sorted(grouped.items()):
        # Email, then name, makes equal-share ordering independent of input order.
        sorted_authors = sorted(
            author_rows,
            key=lambda row: (
                -row.ownership_share,
                row.author_email,
                row.author_name,
            ),
        )
        cumulative_share = 0.0
        bus_factor_50 = 0
        for author in sorted_authors:
            cumulative_share += author.ownership_share
            bus_factor_50 += 1
            if cumulative_share >= 0.50:
                break

        results.append(RepositoryConcentration(
            run_id=source_run_id,
            organization=organization,
            repository=repository,
            total_lines=sum(row.surviving_lines for row in author_rows),
            distinct_authors=len({(row.author_name, row.author_email) for row in author_rows}),
            top_author_name=sorted_authors[0].author_name,
            top_author_email=sorted_authors[0].author_email,
            top_author_share=sorted_authors[0].ownership_share,
            hhi=sum(row.ownership_share ** 2 for row in author_rows),
            bus_factor_50=bus_factor_50,
        ))
    return results
