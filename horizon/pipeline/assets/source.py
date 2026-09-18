"""L1 source: what the pipeline is about to blame.

One API call. No git, no disk, no Postgres -- so when a run fails here, the
cause is Gitea or the token, and nothing else.

The repository is chosen by config for now. PR 15 replaces that with a dynamic
partition per repository, at which point this asset reads its target from the
partition key instead; nothing else about it changes.
"""

# No `from __future__ import annotations` in this module: Dagster resolves the
# context and asset-input annotations at decoration time, and PEP 563 turns them
# into strings it then refuses.
from dagster import AssetExecutionContext, Config, MetadataValue, asset

from ..resources import GiteaClient, Repository


class RepositoryConfig(Config):
    """Which repository this run is about.

    Neither field has a default: a blame run against a repository nobody named
    is a mistake, and an accidental default would hide it.
    """

    org: str
    repo: str


@asset(
    group_name="l1_source",
    compute_kind="gitea",
    description="Clone URL and default branch for one repository -- one Gitea API call.",
)
def gitea_repository(
    context: AssetExecutionContext,
    config: RepositoryConfig,
    gitea: GiteaClient,
) -> Repository:
    repository = gitea.get_repository(config.org, config.repo)

    context.add_output_metadata(
        {
            "repository": MetadataValue.text(repository.slug),
            "default_branch": MetadataValue.text(repository.default_branch),
            "ssh_url": MetadataValue.text(repository.ssh_url),
            "empty": MetadataValue.bool(repository.empty),
        }
    )
    return repository
