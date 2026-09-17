"""The Dagster entrypoint: ``dagster dev -m pipeline.definitions``.

Empty by design at this checkpoint. Its job is to prove the graph loads, the
resources resolve, and CI stays green before a single asset exists; assets are
added one family at a time from PR 2 onward.
"""

from __future__ import annotations

from dagster import Definitions

from .resources import build_resources

defs = Definitions(assets=[], resources=build_resources())
