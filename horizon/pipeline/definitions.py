"""The Dagster entrypoint: ``dagster dev -m pipeline.definitions``.

Two assets as of PR 2 -- the source description and the raw capture. They are
listed explicitly rather than swept up by module: a graph is worth being able
to read off one screen, and an import that silently adds an asset is how the
legacy 13-assets-in-one-file pilot happened.
"""

from __future__ import annotations

from dagster import Definitions

from .assets import blame_capture, gitea_repository
from .checks import capture_is_non_empty
from .resources import build_resources

defs = Definitions(
    assets=[gitea_repository, blame_capture],
    asset_checks=[capture_is_non_empty],
    resources=build_resources(),
)
