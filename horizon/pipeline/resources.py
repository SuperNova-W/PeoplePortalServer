"""Shared resources. None of these is an asset.

A clone is an ephemeral working directory and a connection is a handle, not a
data artifact, so neither belongs in the asset graph -- keeping them here is
what lets assets return records instead of tempdir paths.

This checkpoint declares only their configuration surface. The behaviour lands
with the assets that need it: ``GiteaClient`` and ``GitWorkspace`` in PR 2,
``PostgresResource`` in PR 4.
"""

from __future__ import annotations

from dagster import ConfigurableResource

from .config import PipelineSettings, get_pipeline_settings


class GiteaClient(ConfigurableResource):
    """Read-only Gitea REST client (httpx), used to describe repositories.

    Not the curl-subprocess client the legacy code used; that workaround exists
    for rendered commit pages, which this pipeline never touches.
    """

    base_url: str | None = None
    api_token: str | None = None
    timeout_seconds: float = 30.0


class GitWorkspace(ConfigurableResource):
    """Owns the lifecycle of the throwaway clone that blame runs against.

    Clones are full, never shallow: ``git blame`` needs the whole history to
    attribute a line, and a truncated history silently reassigns ownership to
    the oldest commit it can see.
    """

    root: str | None = None
    keep_clones: bool = False


class PostgresResource(ConfigurableResource):
    """Connection factory for the ``horizon`` schema.

    A new schema in the existing database: the legacy ``gitea_analytics`` tables
    stay untouched as the correctness baseline the new numbers are read against.
    """

    database_url: str | None = None
    schema_name: str = "horizon"


def build_resources(
    settings: PipelineSettings | None = None,
) -> dict[str, ConfigurableResource]:
    """Build the resource map from the environment.

    Missing values are passed through as ``None`` rather than raising, so the
    asset graph always loads; the ``require_*`` accessors on ``PipelineSettings``
    are what fail, at the point a run actually needs the value.
    """

    resolved = settings or get_pipeline_settings()
    return {
        "gitea": GiteaClient(
            base_url=resolved.gitea_url,
            api_token=resolved.gitea_api_token,
        ),
        "workspace": GitWorkspace(),
        "postgres": PostgresResource(database_url=resolved.database_url),
    }
