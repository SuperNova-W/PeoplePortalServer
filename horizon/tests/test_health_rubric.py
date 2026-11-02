import pytest
from pydantic import ValidationError

from pipeline.health_rubric import (
    CURRENT_RUBRIC,
    PROJECT_HEALTH_RUBRIC_V1,
    RUBRICS,
    Dimension,
    Direction,
    HealthRubric,
    Measure,
    combine_dimension_scores,
)


def _measure(**overrides):
    fields = dict(
        key="m",
        description="d",
        direction=Direction.HIGHER_IS_HEALTHIER,
        evidence=("source",),
    )
    fields.update(overrides)
    return Measure(**fields)


def _dimension(key="a", weight=1.0, measures=None):
    return Dimension(
        key=key,
        title=key,
        weight=weight,
        missing_when="never",
        measures=measures or (_measure(),),
    )


def test_v1_is_registered_and_current():
    assert RUBRICS["project-health-v1"] is PROJECT_HEALTH_RUBRIC_V1
    assert CURRENT_RUBRIC.version == "project-health-v1"


def test_v1_has_the_five_agreed_dimensions():
    assert [d.key for d in PROJECT_HEALTH_RUBRIC_V1.dimensions] == [
        "delivery_scope",
        "engineering_flow",
        "quality_reliability",
        "ownership_capacity",
        "blocker_risk",
    ]


def test_v1_weights_total_one():
    assert sum(d.weight for d in PROJECT_HEALTH_RUBRIC_V1.dimensions) == pytest.approx(
        1.0
    )


def test_every_v1_dimension_has_evidence_and_a_missing_data_rule():
    for d in PROJECT_HEALTH_RUBRIC_V1.dimensions:
        assert d.missing_when.strip(), d.key
        assert d.missing_data_rule is not None, d.key
        for m in d.measures:
            assert m.evidence, (d.key, m.key)


def test_unsourced_reliability_measures_are_listed_but_unavailable():
    quality = PROJECT_HEALTH_RUBRIC_V1.dimension("quality_reliability")
    unavailable = {m.key for m in quality.measures if not m.available}
    assert unavailable == {"build_success_rate", "incident_count"}


def test_rubric_is_immutable():
    with pytest.raises(ValidationError):
        PROJECT_HEALTH_RUBRIC_V1.version = "edited"


def test_weights_that_do_not_total_one_are_rejected():
    with pytest.raises(ValidationError, match="not 1.0"):
        HealthRubric(
            version="bad",
            status="pilot",
            min_coverage_for_combined_score=0.5,
            dimensions=(_dimension("a", 0.5), _dimension("b", 0.4)),
        )


def test_duplicate_dimension_keys_are_rejected():
    with pytest.raises(ValidationError, match="repeats a dimension key"):
        HealthRubric(
            version="bad",
            status="pilot",
            min_coverage_for_combined_score=0.5,
            dimensions=(_dimension("a", 0.5), _dimension("a", 0.5)),
        )


def test_dimension_needs_an_available_scorable_measure():
    with pytest.raises(ValidationError, match="no available, scorable measure"):
        _dimension(
            measures=(
                _measure(key="x", available=False),
                _measure(key="y", direction=Direction.CONTEXT_ONLY),
            )
        )


def test_combined_score_is_the_weighted_average_when_everything_is_present():
    scores = {d.key: 80.0 for d in PROJECT_HEALTH_RUBRIC_V1.dimensions}
    scores["delivery_scope"] = 50.0

    result = combine_dimension_scores(PROJECT_HEALTH_RUBRIC_V1, scores)

    assert result.coverage == pytest.approx(1.0)
    assert result.missing_dimensions == ()
    assert result.score == pytest.approx(0.30 * 50 + 0.70 * 80)
    assert result.rubric_version == "project-health-v1"


def test_missing_dimension_is_excluded_not_counted_as_zero():
    scores = {
        "delivery_scope": None,  # no SOW uploaded yet
        "engineering_flow": 60.0,
        "quality_reliability": 60.0,
        "ownership_capacity": 60.0,
        "blocker_risk": 60.0,
    }

    result = combine_dimension_scores(PROJECT_HEALTH_RUBRIC_V1, scores)

    assert result.score == pytest.approx(60.0)
    assert result.coverage == pytest.approx(0.70)
    assert result.missing_dimensions == ("delivery_scope",)


def test_score_is_withheld_below_minimum_coverage():
    result = combine_dimension_scores(
        PROJECT_HEALTH_RUBRIC_V1,
        {"delivery_scope": 90.0, "engineering_flow": 90.0},  # 50% of the weight
    )

    assert result.score is None
    assert result.coverage == pytest.approx(0.50)
    assert set(result.missing_dimensions) == {
        "quality_reliability",
        "ownership_capacity",
        "blocker_risk",
    }


def test_no_scores_at_all_gives_no_score():
    result = combine_dimension_scores(PROJECT_HEALTH_RUBRIC_V1, {})
    assert result.score is None
    assert result.coverage == 0


def test_unknown_dimension_is_rejected():
    with pytest.raises(KeyError, match="not in rubric"):
        combine_dimension_scores(PROJECT_HEALTH_RUBRIC_V1, {"vibes": 100.0})


@pytest.mark.parametrize("bad", [-1.0, 100.5])
def test_out_of_range_score_is_rejected(bad):
    with pytest.raises(ValueError, match="0-100"):
        combine_dimension_scores(PROJECT_HEALTH_RUBRIC_V1, {"engineering_flow": bad})
