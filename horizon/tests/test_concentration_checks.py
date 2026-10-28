from dataclasses import replace

import pytest
from dagster import asset, materialize

from pipeline.checks import (
    repository_shares_sum_to_one,
    concentration_bus_factor_is_valid,
    concentration_totals_match_ownership,
)
from pipeline.concentration import calculate_repository_concentration
from pipeline.ownership import MemberRepositoryOwnership


def inputs():
    return [
        MemberRepositoryOwnership("org", "repo", name, name, lines, 100, share, 1, 0, rank)
        for rank, (name, lines, share) in enumerate(
            [("Alice", 60, .6), ("Bob", 40, .4)], start=1
        )
    ]


def test_valid_metrics_and_empty_inputs():
    for ownership in [inputs(), []]:
        results = calculate_repository_concentration("run", ownership)
        assert repository_shares_sum_to_one(ownership).passed
        assert concentration_bus_factor_is_valid(results).passed
        assert concentration_totals_match_ownership(results, ownership).passed


@pytest.mark.parametrize("shares", [(.2, .4), (float("nan"), .4), (float("inf"), .4), (-.1, 1.1)])
def test_invalid_shares_fail(shares):
    ownership = [replace(row, ownership_share=share) for row, share in zip(inputs(), shares)]
    assert not repository_shares_sum_to_one(ownership).passed


def test_share_rounding_tolerance_and_repository_isolation():
    ownership = inputs()
    ownership[0] = replace(ownership[0], ownership_share=.6000000001)
    assert repository_shares_sum_to_one(ownership).passed
    # Combined shares sum to one, but neither repository's shares do.
    ownership[0] = replace(ownership[0], organization="other", ownership_share=.6)
    assert not repository_shares_sum_to_one(ownership).passed


@pytest.mark.parametrize("bus_factor", [0, 3])
def test_bus_factor_bounds_fail(bus_factor):
    row = calculate_repository_concentration("run", inputs())[0]
    assert not concentration_bus_factor_is_valid([replace(row, bus_factor_50=bus_factor)]).passed


@pytest.mark.parametrize("change", ["missing", "extra", "duplicate", "lines", "authors"])
def test_reconciliation_detects_invalid_results(change):
    ownership = inputs()
    rows = calculate_repository_concentration("run", ownership)
    if change == "missing":
        rows = []
    elif change == "extra":
        rows.append(replace(rows[0], organization="other"))
    elif change == "duplicate":
        rows.append(rows[0])
    elif change == "lines":
        rows = [replace(rows[0], total_lines=200)]
    else:
        rows = [replace(rows[0], distinct_authors=3)]
    assert not concentration_totals_match_ownership(rows, ownership).passed


def test_invalid_upstream_shares_block_downstream_execution():
    called = []

    @asset
    def member_repository_ownership():
        return [replace(inputs()[0], ownership_share=.2)]

    @asset
    def repository_concentration(member_repository_ownership):
        called.append(True)
        return []

    result = materialize(
        [member_repository_ownership, repository_concentration, repository_shares_sum_to_one],
        raise_on_error=False,
    )
    assert not result.success
    assert called == []
