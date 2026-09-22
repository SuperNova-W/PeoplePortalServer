"""L4 feature assets: surviving lines, commits, and ownership."""

# Keep annotations evaluated at decoration time; Dagster uses them to resolve
# asset inputs and resources.
from dataclasses import asdict

from dagster import AssetExecutionContext, MetadataValue, TableRecord, asset

from ..blame_parser import BlameRecord
from ..blame_signals import (
    MemberMultiOwnerFiles,
    MemberMovedLines,
    MemberHistoryBoundary,
    MemberDirectoryComponentBreadth,
    MemberOwnershipEntropy,
    RepositoryOrphanedCode,
    calculate_member_multi_owner_file_share,
    calculate_member_moved_line_share,
    calculate_member_history_boundary_share,
    calculate_member_directory_component_breadth,
    calculate_member_ownership_entropy,
    calculate_orphaned_code_share,
)
from ..metadata import table_schema_from
from ..ownership import (
    FileOwnership,
    MemberOwnership,
    MemberRepositoryOwnership,
    calculate_file_ownership,
    calculate_member_ownership,
    calculate_member_repository_ownership,
)
from ..resources import MemberRosterResource
from ..storage import PostgresResource


MEMBER_MULTI_OWNER_FILE_SHARE_SCHEMA = table_schema_from(
    MemberMultiOwnerFiles,
    {
        "organization": ("string", "Gitea organization."),
        "repository": ("string", "Repository being measured."),
        "author_name": ("string", "Git author identity."),
        "author_email": ("string", "Email portion of the Git author identity."),
        "files_contributed": ("int", "Files with at least one surviving line by the author."),
        "multi_owner_files": (
            "int",
            "Contributed files with more than one surviving line owner.",
        ),
        "multi_owner_file_share": (
            "float",
            "multi_owner_files divided by files_contributed.",
        ),
    },
)

MEMBER_OWNERSHIP_ENTROPY_SCHEMA = table_schema_from(
    MemberOwnershipEntropy,
    {
        "organization": ("string", "Gitea organization."),
        "repository": ("string", "Repository being measured."),
        "author_name": ("string", "Git author identity."),
        "author_email": ("string", "Email portion of the Git author identity."),
        "files_contributed": ("int", "Files with at least one surviving line by the author."),
        "ownership_entropy": (
            "float",
            "Mean normalized line-owner entropy across contributed files.",
        ),
    },
)

REPOSITORY_ORPHANED_CODE_SCHEMA = table_schema_from(
    RepositoryOrphanedCode,
    {
        "organization": ("string", "Gitea organization."),
        "repository": ("string", "Repository being measured."),
        "surviving_lines": ("int", "Current lines in the repository."),
        "orphaned_lines": ("int", "Lines owned by emails outside the active roster."),
        "orphaned_code_share": ("float", "orphaned_lines divided by surviving_lines."),
        "active_identities": ("int", "Number of active emails used for classification."),
    },
)

MEMBER_MOVED_LINE_SHARE_SCHEMA = table_schema_from(
    MemberMovedLines,
    {
        "organization": ("string", "Gitea organization."),
        "repository": ("string", "Repository being measured."),
        "author_name": ("string", "Git author identity."),
        "author_email": ("string", "Email portion of the Git author identity."),
        "surviving_lines": ("int", "Current lines attributed to the author."),
        "moved_lines": ("int", "Lines whose origin file differs from the current file."),
        "moved_line_share": ("float", "moved_lines divided by surviving_lines."),
    },
)

MEMBER_HISTORY_BOUNDARY_SHARE_SCHEMA = table_schema_from(
    MemberHistoryBoundary,
    {
        "organization": ("string", "Gitea organization."),
        "repository": ("string", "Repository being measured."),
        "author_name": ("string", "Git author identity."),
        "author_email": ("string", "Email portion of the Git author identity."),
        "surviving_lines": ("int", "Current lines attributed to the author."),
        "history_boundary_lines": (
            "int",
            "Lines for which git blame reached the repository history boundary.",
        ),
        "history_boundary_share": (
            "float",
            "history_boundary_lines divided by surviving_lines.",
        ),
    },
)

MEMBER_DIRECTORY_COMPONENT_BREADTH_SCHEMA = table_schema_from(
    MemberDirectoryComponentBreadth,
    {
        "organization": ("string", "Gitea organization."),
        "repository": ("string", "Repository being measured."),
        "author_name": ("string", "Git author identity."),
        "author_email": ("string", "Email portion of the Git author identity."),
        "files_contributed": ("int", "Files with at least one surviving line by the author."),
        "directory_breadth": (
            "int",
            "Distinct immediate parent directories containing the author's files.",
        ),
        "component_breadth": (
            "int",
            "Distinct top-level path components containing the author's files.",
        ),
    },
)


FILE_OWNERSHIP_SCHEMA = table_schema_from(
    FileOwnership,
    {
        "organization": ("string", "Gitea organization."),
        "repository": ("string", "Repository containing the file."),
        "file_path": ("string", "Path of the current file."),
        "author_name": ("string", "Git author identity that owns surviving lines."),
        "author_email": ("string", "Email portion of the Git author identity."),
        "surviving_lines": ("int", "Current lines still attributed to this author."),
        "file_lines": ("int", "Total surviving lines in the current file."),
        "ownership_share": ("float", "surviving_lines divided by file_lines."),
    },
)

MEMBER_REPOSITORY_OWNERSHIP_SCHEMA = table_schema_from(
    MemberRepositoryOwnership,
    {
        "organization": ("string", "Gitea organization."),
        "repository": ("string", "Repository being measured."),
        "author_name": ("string", "Git author identity."),
        "author_email": ("string", "Email portion of the Git author identity."),
        "surviving_lines": ("int", "Current repository lines attributed to the author."),
        "repository_lines": ("int", "Total surviving lines in the repository."),
        "ownership_share": ("float", "surviving_lines divided by repository_lines."),
        "files_owned": ("int", "Files with at least one surviving line by this author."),
        "majority_owned_files": ("int", "Files where this author owns more than half the lines."),
        "rank": ("int", "Deterministic repository rank by surviving lines."),
    },
)

MEMBER_OWNERSHIP_SCHEMA = table_schema_from(
    MemberOwnership,
    {
        "organization": ("string", "Gitea organization."),
        "author_name": ("string", "Git author identity."),
        "author_email": ("string", "Email portion of the Git author identity."),
        "surviving_lines": ("int", "Current lines still attributed to the author."),
        "surviving_commits": ("int", "Distinct commit SHAs that still own a line."),
        "files_owned": ("int", "Files with at least one surviving line."),
        "repositories": ("int", "Repositories with at least one surviving line."),
        "majority_owned_files": ("int", "Files where the author owns more than half the lines."),
        "average_file_share": ("float", "Mean ownership share across the author's files."),
    },
)


def _empty_preview(schema):
    return MetadataValue.table(records=[], schema=schema)


def _sample(rows, schema):
    return MetadataValue.table(
        records=[TableRecord(asdict(row)) for row in rows[:10]],
        schema=schema,
    )


def _feature_metadata(table: str, rows: list, schema, **counts):
    return {
        "table": MetadataValue.text(table),
        "rows": MetadataValue.int(len(rows)),
        "sample": _sample(rows, schema),
        **{name: MetadataValue.int(value) for name, value in counts.items()},
    }


@asset(
    group_name="l4_features",
    kinds={"python", "postgres"},
    description=(
        "Calculates surviving-line ownership for every current file and author. "
        "The share is the author's surviving lines divided by the file's total "
        "surviving lines."
    ),
    metadata={
        "dagster/column_schema": FILE_OWNERSHIP_SCHEMA,
        "preview": _empty_preview(FILE_OWNERSHIP_SCHEMA),
        "table": "file_ownership",
        "grain": "one row per run, repository, file, and author",
        "source": "blame_records",
    },
)
def file_ownership(
    context: AssetExecutionContext,
    blame_records: list[BlameRecord],
    postgres: PostgresResource,
) -> list[FileOwnership]:
    rows = calculate_file_ownership(blame_records)
    postgres.write_file_ownership(context.run.run_id, rows)
    context.add_output_metadata(
        _feature_metadata(
            "file_ownership",
            rows,
            FILE_OWNERSHIP_SCHEMA,
            files=len({(row.organization, row.repository, row.file_path) for row in rows}),
            surviving_lines=sum(row.surviving_lines for row in rows),
        )
    )
    return rows


@asset(
    group_name="l4_features",
    kinds={"python", "postgres"},
    description=(
        "Calculates the share of each member's contributed files that have "
        "multiple surviving-line owners."
    ),
    metadata={
        "dagster/column_schema": MEMBER_MULTI_OWNER_FILE_SHARE_SCHEMA,
        "preview": _empty_preview(MEMBER_MULTI_OWNER_FILE_SHARE_SCHEMA),
        "table": "member_multi_owner_file_share",
        "grain": "one row per run, repository, and author",
        "source": "blame_records",
    },
)
def member_multi_owner_file_share(
    context: AssetExecutionContext,
    blame_records: list[BlameRecord],
    postgres: PostgresResource,
) -> list[MemberMultiOwnerFiles]:
    rows = calculate_member_multi_owner_file_share(blame_records)
    postgres.write_member_multi_owner_file_share(context.run.run_id, rows)
    context.add_output_metadata(
        _feature_metadata(
            "member_multi_owner_file_share",
            rows,
            MEMBER_MULTI_OWNER_FILE_SHARE_SCHEMA,
            multi_owner_files=sum(row.multi_owner_files for row in rows),
        )
    )
    return rows


@asset(
    group_name="l4_features",
    kinds={"python", "postgres"},
    description=(
        "Calculates the normalized entropy of surviving-line ownership across "
        "each member's contributed files."
    ),
    metadata={
        "dagster/column_schema": MEMBER_OWNERSHIP_ENTROPY_SCHEMA,
        "preview": _empty_preview(MEMBER_OWNERSHIP_ENTROPY_SCHEMA),
        "table": "member_ownership_entropy",
        "grain": "one row per run, repository, and author",
        "source": "blame_records",
    },
)
def member_ownership_entropy(
    context: AssetExecutionContext,
    blame_records: list[BlameRecord],
    postgres: PostgresResource,
) -> list[MemberOwnershipEntropy]:
    rows = calculate_member_ownership_entropy(blame_records)
    postgres.write_member_ownership_entropy(context.run.run_id, rows)
    context.add_output_metadata(
        _feature_metadata(
            "member_ownership_entropy",
            rows,
            MEMBER_OWNERSHIP_ENTROPY_SCHEMA,
        )
    )
    return rows


@asset(
    group_name="l4_features",
    kinds={"python", "postgres"},
    description=(
        "Calculates the repository share of surviving lines owned by emails "
        "outside the configured active member roster."
    ),
    metadata={
        "dagster/column_schema": REPOSITORY_ORPHANED_CODE_SCHEMA,
        "preview": _empty_preview(REPOSITORY_ORPHANED_CODE_SCHEMA),
        "table": "repository_orphaned_code",
        "grain": "one row per run and repository",
        "source": "blame_records + member_roster",
    },
)
def repository_orphaned_code(
    context: AssetExecutionContext,
    blame_records: list[BlameRecord],
    member_roster: MemberRosterResource,
    postgres: PostgresResource,
) -> list[RepositoryOrphanedCode]:
    rows = calculate_orphaned_code_share(
        blame_records,
        member_roster.require_active_emails(),
    )
    postgres.write_repository_orphaned_code(context.run.run_id, rows)
    context.add_output_metadata(
        _feature_metadata(
            "repository_orphaned_code",
            rows,
            REPOSITORY_ORPHANED_CODE_SCHEMA,
            orphaned_lines=sum(row.orphaned_lines for row in rows),
        )
    )
    return rows


@asset(
    group_name="l4_features",
    kinds={"python", "postgres"},
    description=(
        "Calculates the share of each member's surviving lines whose origin "
        "file differs from the current file."
    ),
    metadata={
        "dagster/column_schema": MEMBER_MOVED_LINE_SHARE_SCHEMA,
        "preview": _empty_preview(MEMBER_MOVED_LINE_SHARE_SCHEMA),
        "table": "member_moved_line_share",
        "grain": "one row per run, repository, and author",
        "source": "blame_records",
    },
)
def member_moved_line_share(
    context: AssetExecutionContext,
    blame_records: list[BlameRecord],
    postgres: PostgresResource,
) -> list[MemberMovedLines]:
    rows = calculate_member_moved_line_share(blame_records)
    postgres.write_member_moved_line_share(context.run.run_id, rows)
    context.add_output_metadata(
        _feature_metadata(
            "member_moved_line_share",
            rows,
            MEMBER_MOVED_LINE_SHARE_SCHEMA,
            moved_lines=sum(row.moved_lines for row in rows),
        )
    )
    return rows


@asset(
    group_name="l4_features",
    kinds={"python", "postgres"},
    description=(
        "Calculates the share of each member's surviving lines that reach the "
        "repository history boundary."
    ),
    metadata={
        "dagster/column_schema": MEMBER_HISTORY_BOUNDARY_SHARE_SCHEMA,
        "preview": _empty_preview(MEMBER_HISTORY_BOUNDARY_SHARE_SCHEMA),
        "table": "member_history_boundary_share",
        "grain": "one row per run, repository, and author",
        "source": "blame_records",
    },
)
def member_history_boundary_share(
    context: AssetExecutionContext,
    blame_records: list[BlameRecord],
    postgres: PostgresResource,
) -> list[MemberHistoryBoundary]:
    rows = calculate_member_history_boundary_share(blame_records)
    postgres.write_member_history_boundary_share(context.run.run_id, rows)
    context.add_output_metadata(
        _feature_metadata(
            "member_history_boundary_share",
            rows,
            MEMBER_HISTORY_BOUNDARY_SHARE_SCHEMA,
            history_boundary_lines=sum(row.history_boundary_lines for row in rows),
        )
    )
    return rows


@asset(
    group_name="l4_features",
    kinds={"python", "postgres"},
    description=(
        "Calculates each member's breadth across immediate directories and "
        "top-level repository components."
    ),
    metadata={
        "dagster/column_schema": MEMBER_DIRECTORY_COMPONENT_BREADTH_SCHEMA,
        "preview": _empty_preview(MEMBER_DIRECTORY_COMPONENT_BREADTH_SCHEMA),
        "table": "member_directory_component_breadth",
        "grain": "one row per run, repository, and author",
        "source": "blame_records",
    },
)
def member_directory_component_breadth(
    context: AssetExecutionContext,
    blame_records: list[BlameRecord],
    postgres: PostgresResource,
) -> list[MemberDirectoryComponentBreadth]:
    rows = calculate_member_directory_component_breadth(blame_records)
    postgres.write_member_directory_component_breadth(context.run.run_id, rows)
    context.add_output_metadata(
        _feature_metadata(
            "member_directory_component_breadth",
            rows,
            MEMBER_DIRECTORY_COMPONENT_BREADTH_SCHEMA,
        )
    )
    return rows


@asset(
    group_name="l4_features",
    kinds={"python", "postgres"},
    description=(
        "Aggregates file ownership to repository ownership, including surviving "
        "lines, share, files touched, majority-owned files, and rank."
    ),
    metadata={
        "dagster/column_schema": MEMBER_REPOSITORY_OWNERSHIP_SCHEMA,
        "preview": _empty_preview(MEMBER_REPOSITORY_OWNERSHIP_SCHEMA),
        "table": "member_repository_ownership",
        "grain": "one row per run, repository, and author",
        "source": "file_ownership",
    },
)
def member_repository_ownership(
    context: AssetExecutionContext,
    file_ownership: list[FileOwnership],
    postgres: PostgresResource,
) -> list[MemberRepositoryOwnership]:
    rows = calculate_member_repository_ownership(file_ownership)
    postgres.write_member_repository_ownership(context.run.run_id, rows)
    context.add_output_metadata(
        _feature_metadata(
            "member_repository_ownership",
            rows,
            MEMBER_REPOSITORY_OWNERSHIP_SCHEMA,
            repositories=len({(row.organization, row.repository) for row in rows}),
            surviving_lines=sum(row.surviving_lines for row in rows),
        )
    )
    return rows


@asset(
    group_name="l4_features",
    kinds={"python", "postgres"},
    description=(
        "Aggregates surviving lines and distinct surviving commit SHAs by author. "
        "A surviving commit is a commit that still owns at least one current line."
    ),
    metadata={
        "dagster/column_schema": MEMBER_OWNERSHIP_SCHEMA,
        "preview": _empty_preview(MEMBER_OWNERSHIP_SCHEMA),
        "table": "member_ownership",
        "grain": "one row per run, organization, and author",
        "source": "blame_records + member_repository_ownership",
    },
)
def member_ownership(
    context: AssetExecutionContext,
    blame_records: list[BlameRecord],
    file_ownership: list[FileOwnership],
    member_repository_ownership: list[MemberRepositoryOwnership],
    postgres: PostgresResource,
) -> list[MemberOwnership]:
    rows = calculate_member_ownership(
        blame_records,
        file_ownership,
        member_repository_ownership,
    )
    postgres.write_member_ownership(context.run.run_id, rows)
    context.add_output_metadata(
        _feature_metadata(
            "member_ownership",
            rows,
            MEMBER_OWNERSHIP_SCHEMA,
            surviving_lines=sum(row.surviving_lines for row in rows),
            surviving_commits=sum(row.surviving_commits for row in rows),
        )
    )
    return rows


__all__ = [
    "FILE_OWNERSHIP_SCHEMA",
    "MEMBER_MULTI_OWNER_FILE_SHARE_SCHEMA",
    "MEMBER_OWNERSHIP_ENTROPY_SCHEMA",
    "REPOSITORY_ORPHANED_CODE_SCHEMA",
    "MEMBER_MOVED_LINE_SHARE_SCHEMA",
    "MEMBER_HISTORY_BOUNDARY_SHARE_SCHEMA",
    "MEMBER_DIRECTORY_COMPONENT_BREADTH_SCHEMA",
    "MEMBER_OWNERSHIP_SCHEMA",
    "MEMBER_REPOSITORY_OWNERSHIP_SCHEMA",
    "file_ownership",
    "member_multi_owner_file_share",
    "member_ownership_entropy",
    "repository_orphaned_code",
    "member_moved_line_share",
    "member_history_boundary_share",
    "member_directory_component_breadth",
    "member_ownership",
    "member_repository_ownership",
]
