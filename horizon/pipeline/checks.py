"""Asset checks: the places where "it ran" is not the same as "it worked".

Every check here exists because the legacy run passed without one. It recorded
``blame_lines: 0`` for all 132 members and reported ``blame_status: complete``,
because nothing threw -- so completeness was inferred from the absence of an
exception rather than from the presence of data. These assert the presence of
data.
"""

# No `from __future__ import annotations` in this module: Dagster resolves the
# context and asset-input annotations at decoration time, and PEP 563 turns them
# into strings it then refuses.
from collections import defaultdict
from math import fsum, isclose, isfinite

from dagster import AssetCheckResult, AssetCheckSeverity, AssetIn, asset_check

from .assets import (
    BlameCapture, blame_capture, blame_records,
    member_repository_ownership, repository_concentration,
)
from .concentration import RepositoryConcentration
from .ownership import MemberRepositoryOwnership
from .blame_parser import BlameRecord


@asset_check(
    asset=blame_capture,
    description="A capture that blamed no files at all is a failure, not an empty repo.",
)
def capture_is_non_empty(blame_capture: BlameCapture) -> AssetCheckResult:
    passed = blame_capture.files_captured > 0

    if passed:
        description = (
            f"{blame_capture.files_captured} of {blame_capture.files_tracked} tracked "
            f"files captured ({blame_capture.bytes_written} bytes)."
        )
    else:
        description = (
            f"{blame_capture.slug} produced no blame output from "
            f"{blame_capture.files_tracked} tracked files "
            f"({blame_capture.files_skipped_binary} binary, "
            f"{blame_capture.files_failed} failed). This is the legacy "
            "silent-zero case: a run that finishes having captured nothing."
        )

    return AssetCheckResult(
        passed=passed,
        severity=AssetCheckSeverity.ERROR,
        description=description,
        metadata={
            "files_tracked": blame_capture.files_tracked,
            "files_captured": blame_capture.files_captured,
            "files_skipped_binary": blame_capture.files_skipped_binary,
            "files_failed": blame_capture.files_failed,
            "bytes_written": blame_capture.bytes_written,
        },
    )


# The 14 fields git blame emits that the coverage matrix maps to a column.
# Twelve of them appear on every line git blames, so a run where one is never
# populated means the parser dropped it -- legacy stored 2 of the 14 and threw
# the rest away, which is the failure this check exists to make visible.
_REQUIRED_FIELDS = {
    "header sha": lambda r: r.commit_sha,
    "header line count": lambda r: r.consecutive_line_count,
    "author": lambda r: r.author_name,
    "author-mail": lambda r: r.author_email,
    "author-time": lambda r: r.authored_at_epoch,
    "author-tz": lambda r: r.author_utc_offset,
    "committer": lambda r: r.committer_name,
    "committer-mail": lambda r: r.committer_email,
    "committer-time": lambda r: r.committed_at_epoch,
    "summary": lambda r: r.commit_summary,
    "filename": lambda r: r.origin_file_path,
    "blamed path": lambda r: r.blamed_file_path,
}

# The other two are conditional on the repository's shape, not on the parser.
# `previous` is absent when every surviving line comes from a commit with no
# parent -- true of any young repo. `boundary` is absent when no surviving line
# reaches the root commit. Failing a run for either would mean a correct parse
# of a small repository reports as broken, so they warn instead.
_CONDITIONAL_FIELDS = {
    "previous": lambda r: r.previous_commit_sha,
    "boundary": lambda r: r.reaches_history_boundary,
}


@asset_check(
    asset=blame_records,
    description="Every git blame field the schema stores is populated by at least one record.",
)
def records_carry_every_field(blame_records: list[BlameRecord]) -> AssetCheckResult:
    if not blame_records:
        return AssetCheckResult(
            passed=False,
            severity=AssetCheckSeverity.ERROR,
            description="no records at all, so no field is populated.",
        )

    def unpopulated(fields):
        return sorted(
            name
            for name, read in fields.items()
            if not any(read(record) for record in blame_records)
        )

    missing = unpopulated(_REQUIRED_FIELDS)
    absent = unpopulated(_CONDITIONAL_FIELDS)

    if missing:
        description = f"never populated: {', '.join(missing)}."
    elif absent:
        description = (
            f"all {len(_REQUIRED_FIELDS)} always-present fields populated; "
            f"{', '.join(absent)} absent, which this repository's history can "
            "explain -- no surviving line has one."
        )
    else:
        description = (
            f"all {len(_REQUIRED_FIELDS) + len(_CONDITIONAL_FIELDS)} blame fields populated."
        )

    return AssetCheckResult(
        passed=not missing,
        severity=AssetCheckSeverity.ERROR if missing else AssetCheckSeverity.WARN,
        description=description,
        metadata={
            "records": len(blame_records),
            "fields_required": len(_REQUIRED_FIELDS),
            "fields_missing": len(missing),
            "conditional_fields_absent": ", ".join(absent) if absent else "none",
        },
    )


@asset_check(
    asset=blame_records,
    additional_ins={"blame_capture": AssetIn("blame_capture")},
    description="Every file the capture wrote a section for yields at least one record.",
)
def records_parse_completely(
    blame_records: list[BlameRecord],
    blame_capture: BlameCapture,
) -> AssetCheckResult:
    """A file that reached the capture but parsed to nothing is a parser bug.

    The capture layer already drops files that blame to nothing, so every
    section it wrote must come back out. Counting sections rather than trusting
    the record count is the point: 36,653 records from 240 of 241 files looks
    like a success until someone asks about the missing file.
    """

    parsed_paths = {record.blamed_file_path for record in blame_records}
    expected = blame_capture.files_captured
    passed = len(parsed_paths) == expected

    return AssetCheckResult(
        passed=passed,
        severity=AssetCheckSeverity.ERROR,
        description=(
            f"{len(parsed_paths)} of {expected} captured files parsed."
            if passed
            else f"{expected - len(parsed_paths)} captured file(s) yielded no records."
        ),
        metadata={
            "records": len(blame_records),
            "files_captured": expected,
            "files_parsed": len(parsed_paths),
        },
    )


@asset_check(
    asset=member_repository_ownership,
    blocking=True,
    description="Each repository's author shares are finite, valid, and sum to one.",
)
def repository_shares_sum_to_one(
    member_repository_ownership: list[MemberRepositoryOwnership],
) -> AssetCheckResult:
    grouped = defaultdict(list)
    for row in member_repository_ownership:
        grouped[(row.organization, row.repository)].append(row.ownership_share)
    invalid = [
        key for key, shares in grouped.items()
        if not all(isfinite(share) and 0 <= share <= 1 for share in shares)
        or not isclose(fsum(shares), 1.0, rel_tol=0, abs_tol=1e-9)
    ]
    return AssetCheckResult(
        passed=not invalid,
        severity=AssetCheckSeverity.ERROR,
        description="Author shares must sum to 1 within an absolute tolerance of 1e-9.",
        metadata={"repositories_checked": len(grouped), "invalid_repositories": repr(sorted(invalid))},
    )


@asset_check(
    asset=repository_concentration,
    description="Bus factor is between one and the distinct author count.",
)
def concentration_bus_factor_is_valid(
    repository_concentration: list[RepositoryConcentration],
) -> AssetCheckResult:
    invalid = [
        (row.run_id, row.organization, row.repository)
        for row in repository_concentration
        if not 1 <= row.bus_factor_50 <= row.distinct_authors
    ]
    return AssetCheckResult(
        passed=not invalid,
        severity=AssetCheckSeverity.ERROR,
        metadata={"rows_checked": len(repository_concentration), "invalid_repositories": repr(sorted(invalid))},
    )


@asset_check(
    asset=repository_concentration,
    additional_ins={"member_repository_ownership": AssetIn("member_repository_ownership")},
    description="Exactly one concentration row per input repository, with matching line and author totals.",
)
def concentration_totals_match_ownership(
    repository_concentration: list[RepositoryConcentration],
    member_repository_ownership: list[MemberRepositoryOwnership],
) -> AssetCheckResult:
    expected_lines = defaultdict(int)
    expected_authors = defaultdict(set)
    for row in member_repository_ownership:
        key = (row.organization, row.repository)
        expected_lines[key] += row.surviving_lines
        expected_authors[key].add((row.author_name, row.author_email))
    actual = defaultdict(list)
    for row in repository_concentration:
        actual[(row.organization, row.repository)].append(row)
    invalid = []
    for key in expected_lines.keys() | actual.keys():
        rows = actual[key]
        if (key not in expected_lines or len(rows) != 1
                or rows[0].total_lines != expected_lines[key]
                or rows[0].distinct_authors != len(expected_authors[key])):
            invalid.append(key)
    return AssetCheckResult(
        passed=not invalid,
        severity=AssetCheckSeverity.ERROR,
        metadata={"repositories_expected": len(expected_lines), "rows_produced": len(repository_concentration),
                  "invalid_repositories": repr(sorted(invalid))},
    )
