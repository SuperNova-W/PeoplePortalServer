"""The Dagster entrypoint: ``dagster dev -m pipeline.definitions``.

Assets are listed explicitly rather than swept up by module: a graph is worth
being able to read off one screen, and an import that silently adds an asset is
how the legacy 13-assets-in-one-file pilot happened.
"""

from __future__ import annotations

from dagster import Definitions

from .assets import (
    blame_capture,
    blame_records,
    file_ownership,
    gitea_repository,
    member_ownership,
    member_repository_ownership,
    repository_concentration,
)
from .checks import (
    capture_is_non_empty,
    repository_shares_sum_to_one,
    concentration_bus_factor_is_valid,
    concentration_totals_match_ownership,
    records_carry_every_field,
    records_parse_completely,
)
from .resources import build_resources

defs = Definitions(
    assets=[
        gitea_repository,
        blame_capture,
        blame_records,
        file_ownership,
        member_repository_ownership,
        repository_concentration,
        member_ownership,
    ],
    asset_checks=[
        capture_is_non_empty,
        repository_shares_sum_to_one,
        concentration_bus_factor_is_valid,
        concentration_totals_match_ownership,
        records_carry_every_field,
        records_parse_completely,
    ],
    resources=build_resources(),
)
