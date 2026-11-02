"""Versioned project health rubric (Track 5, feature T5.1).

This module is the single place that says *how* Horizon judges a project's
health: which dimensions exist, what evidence each one may use, which direction
is "healthier", what happens when evidence is missing, and how much each
dimension weighs in a combined score.

It is deliberately data, not scoring code. Later features (T5.4 - T5.8) compute
the dimension scores; the LLM signal step (T4.1) is handed this rubric so its
output can be traced to an exact ``version``. Changing any weight, measure or
rule means adding a new version, never editing a published one.

The one piece of arithmetic here, :func:`combine_dimension_scores`, exists so the
missing-data rule is enforced in code rather than restated by every caller:
missing dimensions are left out and the remaining weights are renormalised;
they are never treated as zero.
"""

from __future__ import annotations

from enum import Enum
from typing import Mapping

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Direction(str, Enum):
    """Which way a raw measure moves when the project gets healthier."""

    HIGHER_IS_HEALTHIER = "higher_is_healthier"
    LOWER_IS_HEALTHIER = "lower_is_healthier"
    # Reported for context only and never scored, e.g. "changes requested":
    # more of it can mean careful review or can mean poor first drafts.
    CONTEXT_ONLY = "context_only"


class MissingDataRule(str, Enum):
    """What a dimension does when its evidence is absent or too thin."""

    # The dimension is reported as missing and excluded from the combined score.
    # Remaining weights are renormalised. It is never scored as zero.
    EXCLUDE_AND_REPORT = "exclude_and_report"


class Measure(BaseModel):
    """One observable quantity inside a dimension."""

    model_config = ConfigDict(frozen=True)

    key: str
    description: str
    direction: Direction
    # Where the evidence comes from: Horizon tables or upstream features.
    evidence: tuple[str, ...] = Field(min_length=1)
    # False when the source does not exist yet. Unavailable measures are listed
    # so the gap is visible, but they are never scored or imputed.
    available: bool = True


class Dimension(BaseModel):
    """One health dimension, scored 0-100 where 100 is healthiest."""

    model_config = ConfigDict(frozen=True)

    key: str
    title: str
    weight: float = Field(gt=0, le=1)
    measures: tuple[Measure, ...] = Field(min_length=1)
    missing_data_rule: MissingDataRule = MissingDataRule.EXCLUDE_AND_REPORT
    # Plain-language condition under which the dimension counts as missing.
    missing_when: str
    # Statements the output must never make from this dimension's evidence.
    must_not_claim: tuple[str, ...] = ()

    @model_validator(mode="after")
    def _has_a_scorable_measure(self) -> "Dimension":
        if not any(
            m.available and m.direction is not Direction.CONTEXT_ONLY
            for m in self.measures
        ):
            raise ValueError(
                f"dimension {self.key!r} has no available, scorable measure"
            )
        keys = [m.key for m in self.measures]
        if len(keys) != len(set(keys)):
            raise ValueError(f"dimension {self.key!r} repeats a measure key")
        return self


class HealthRubric(BaseModel):
    """A complete, versioned rubric. Weights must total exactly 1."""

    model_config = ConfigDict(frozen=True)

    version: str
    status: str  # "pilot" until reviewed; "approved" once the team signs off.
    dimensions: tuple[Dimension, ...] = Field(min_length=1)
    # Below this share of total weight, no combined score is produced at all;
    # only the per-dimension results and their coverage are reported.
    min_coverage_for_combined_score: float = Field(gt=0, le=1)

    @model_validator(mode="after")
    def _weights_total_one_and_keys_unique(self) -> "HealthRubric":
        total = sum(d.weight for d in self.dimensions)
        if abs(total - 1.0) > 1e-9:
            raise ValueError(f"rubric {self.version!r} weights total {total}, not 1.0")
        keys = [d.key for d in self.dimensions]
        if len(keys) != len(set(keys)):
            raise ValueError(f"rubric {self.version!r} repeats a dimension key")
        return self

    def dimension(self, key: str) -> Dimension:
        for d in self.dimensions:
            if d.key == key:
                return d
        raise KeyError(key)


class CombinedHealth(BaseModel):
    """Result of combining dimension scores under a rubric."""

    model_config = ConfigDict(frozen=True)

    rubric_version: str
    # None when coverage is below the rubric's threshold.
    score: float | None
    # Share of total rubric weight that had a score (0-1).
    coverage: float
    missing_dimensions: tuple[str, ...]


def combine_dimension_scores(
    rubric: HealthRubric, scores: Mapping[str, float | None]
) -> CombinedHealth:
    """Combine 0-100 dimension scores into one coverage-aware project score.

    A dimension absent from ``scores`` or mapped to ``None`` is missing: it is
    left out and the other weights are renormalised. If the scored dimensions
    cover less than ``min_coverage_for_combined_score`` of the weight, the score
    is withheld (``None``) rather than built from too little evidence.
    """
    unknown = set(scores) - {d.key for d in rubric.dimensions}
    if unknown:
        raise KeyError(
            f"scores for dimensions not in rubric {rubric.version}: {sorted(unknown)}"
        )

    present: list[tuple[Dimension, float]] = []
    missing: list[str] = []
    for d in rubric.dimensions:
        value = scores.get(d.key)
        if value is None:
            missing.append(d.key)
            continue
        if not 0 <= value <= 100:
            raise ValueError(f"score for {d.key!r} must be within 0-100, got {value}")
        present.append((d, value))

    coverage = sum(d.weight for d, _ in present)
    if not present or coverage < rubric.min_coverage_for_combined_score:
        score = None
    else:
        score = sum(d.weight * v for d, v in present) / coverage

    return CombinedHealth(
        rubric_version=rubric.version,
        score=score,
        coverage=round(coverage, 10),
        missing_dimensions=tuple(missing),
    )


# --------------------------------------------------------------------------- #
# Rubric versions. Never edit a published version; add a new one.             #
# --------------------------------------------------------------------------- #

_SOW_CHECKS = "T5.3 SOW weekly checks (planned)"
_PR_COMMITS = "horizon_gt_features.pr_linked_commit_messages"
_GITEA_PRS = "Gitea pull requests and reviews (T2.3 ingestion)"
_PR_REVIEW_COUNTS = "member_pr_review_counts"
_FILE_OWNERSHIP = "horizon_gt_features.file_ownership"
_REPO_OWNERSHIP = "horizon_gt_features.member_repository_ownership"
_ROSTER = "People Portal roster snapshot (T1.2)"
_RISK_FINDINGS = "T5.8 blocker and risk findings (planned)"

PROJECT_HEALTH_RUBRIC_V1 = HealthRubric(
    version="project-health-v1",
    status="pilot",
    min_coverage_for_combined_score=0.6,
    dimensions=(
        Dimension(
            key="delivery_scope",
            title="Delivery and scope",
            weight=0.30,
            missing_when="No SOW has been uploaded for the project and semester, or no SOW check is due yet.",
            must_not_claim=(
                "A PR or commit message proves a check is complete.",
                "Missing PR evidence proves a check is late.",
            ),
            measures=(
                Measure(
                    key="due_checks_with_supported_evidence",
                    description="Share of SOW checks due by the reporting date that have supported PR evidence.",
                    direction=Direction.HIGHER_IS_HEALTHIER,
                    evidence=(_SOW_CHECKS, _PR_COMMITS),
                ),
                Measure(
                    key="past_due_checks_without_evidence",
                    description="Count of past-due SOW checks whose evidence is uncertain or missing.",
                    direction=Direction.LOWER_IS_HEALTHIER,
                    evidence=(_SOW_CHECKS, _PR_COMMITS),
                ),
            ),
        ),
        Dimension(
            key="engineering_flow",
            title="Engineering flow",
            weight=0.20,
            missing_when="Fewer than 3 pull requests were opened or merged in the reporting period.",
            must_not_claim=(
                "A project is slow because it misses a fixed, club-wide threshold; "
                "compare against the project's own earlier periods.",
            ),
            measures=(
                Measure(
                    key="median_open_pr_age_days",
                    description="Median age of open PRs at the reporting date, as a trend.",
                    direction=Direction.LOWER_IS_HEALTHIER,
                    evidence=(_GITEA_PRS,),
                ),
                Measure(
                    key="median_review_cycle_days",
                    description="Median time from PR opened to first review, as a trend.",
                    direction=Direction.LOWER_IS_HEALTHIER,
                    evidence=(_GITEA_PRS,),
                ),
                Measure(
                    key="merged_prs_per_week",
                    description="Merge cadence compared with the project's own earlier weeks.",
                    direction=Direction.HIGHER_IS_HEALTHIER,
                    evidence=(_GITEA_PRS,),
                ),
                Measure(
                    key="open_prs_per_active_contributor",
                    description="Work in progress per contributor active in the period.",
                    direction=Direction.LOWER_IS_HEALTHIER,
                    evidence=(_GITEA_PRS, _ROSTER),
                ),
            ),
        ),
        Dimension(
            key="quality_reliability",
            title="Quality and reliability (review process only)",
            weight=0.15,
            missing_when="No pull request was merged in the reporting period.",
            must_not_claim=(
                "Anything about build health, production quality or incidents; "
                "Horizon has no source for them yet.",
            ),
            measures=(
                Measure(
                    key="merged_prs_with_approval",
                    description="Share of merged PRs that had at least one approval before merge.",
                    direction=Direction.HIGHER_IS_HEALTHIER,
                    evidence=(_GITEA_PRS, _PR_REVIEW_COUNTS),
                ),
                Measure(
                    key="changes_requested_rate",
                    description="Share of reviews that requested changes. Shown for context, not scored.",
                    direction=Direction.CONTEXT_ONLY,
                    evidence=(_GITEA_PRS, _PR_REVIEW_COUNTS),
                ),
                Measure(
                    key="build_success_rate",
                    description="CI build success rate.",
                    direction=Direction.HIGHER_IS_HEALTHIER,
                    evidence=("No CI source ingested",),
                    available=False,
                ),
                Measure(
                    key="incident_count",
                    description="Production incidents.",
                    direction=Direction.LOWER_IS_HEALTHIER,
                    evidence=("No incident source ingested",),
                    available=False,
                ),
            ),
        ),
        Dimension(
            key="ownership_capacity",
            title="Ownership and capacity",
            weight=0.20,
            missing_when="No ownership run exists for the project's repositories, or the roster is unavailable.",
            must_not_claim=(
                "A member is underperforming; this dimension describes the project, not people.",
            ),
            measures=(
                Measure(
                    key="top_owner_share",
                    description="Largest single member's share of surviving lines (concentration).",
                    direction=Direction.LOWER_IS_HEALTHIER,
                    evidence=(_REPO_OWNERSHIP,),
                ),
                Measure(
                    key="lines_owned_by_off_roster_authors",
                    description="Share of surviving lines whose author is not on the current project roster (unowned work).",
                    direction=Direction.LOWER_IS_HEALTHIER,
                    evidence=(_FILE_OWNERSHIP, _ROSTER),
                ),
                Measure(
                    key="active_contributor_share",
                    description="Share of rostered engineers with any PR or surviving lines in the period, adjusted for team size.",
                    direction=Direction.HIGHER_IS_HEALTHIER,
                    evidence=(_REPO_OWNERSHIP, _GITEA_PRS, _ROSTER),
                ),
            ),
        ),
        Dimension(
            key="blocker_risk",
            title="Blocker and risk trends",
            weight=0.15,
            missing_when="The SOW workflow has not produced findings for the reporting date.",
            must_not_claim=(
                "A finding is a confirmed defect or blocker; it is a progress risk or evidence gap.",
            ),
            measures=(
                Measure(
                    key="open_risk_findings_trend",
                    description="Change in open progress-risk and evidence-gap findings versus the previous period.",
                    direction=Direction.LOWER_IS_HEALTHIER,
                    evidence=(_RISK_FINDINGS, _SOW_CHECKS, _PR_COMMITS),
                ),
            ),
        ),
    ),
)

RUBRICS: dict[str, HealthRubric] = {
    PROJECT_HEALTH_RUBRIC_V1.version: PROJECT_HEALTH_RUBRIC_V1
}
CURRENT_RUBRIC = PROJECT_HEALTH_RUBRIC_V1
