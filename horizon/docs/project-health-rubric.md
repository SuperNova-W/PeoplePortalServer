# Project health rubric

**Version:** `project-health-v1` · **Status:** pilot (needs team sign-off) · **Ladder item:** T5.1

The rubric decides how Horizon judges a project's health. The code version is
`horizon/pipeline/health_rubric.py`; this page explains it. If the two disagree,
the code wins. To change a weight, measure, or rule, add a new version
(`project-health-v2`). Do not edit a published version.

## How scoring works

1. Each dimension gets a score from 0 to 100, where 100 is healthiest.
2. Every measure states its direction: higher is healthier, lower is healthier,
   or context only. Context-only measures are shown but never scored.
3. **Missing data is never zero.** A dimension without enough evidence is marked
   missing and left out. The remaining weights are scaled up to total 100%.
4. A combined score is produced only when the scored dimensions cover at least
   **60%** of the total weight. Below that, Horizon shows only the
   per-dimension results and their coverage.
5. Every result stores the rubric version, so results from different versions
   are never compared as if they were the same.

## Dimensions and weights

| Dimension | Weight | Evidence | Missing when | Must not claim |
|---|---|---|---|---|
| Delivery and scope | 30% | SOW weekly checks (T5.3), `pr_linked_commit_messages` | No SOW for the project and semester, or no check is due yet | A PR proves a check is done; missing PR evidence proves a delay |
| Engineering flow | 20% | Gitea PRs and reviews (T2.3), roster | Fewer than 3 PRs opened or merged in the period | A project is slow against a fixed club-wide threshold |
| Quality and reliability | 15% | Gitea PRs and reviews, `member_pr_review_counts` | No PR merged in the period | Anything about builds, production quality, or incidents |
| Ownership and capacity | 20% | `file_ownership`, `member_repository_ownership`, roster | No ownership run or no roster | Anything about an individual's performance |
| Blocker and risk trends | 15% | Risk findings (T5.8), SOW checks, PR-linked commits | No SOW findings exist for the reporting date | A finding is a confirmed defect or blocker |

## Measures

**Delivery and scope**
- Share of due SOW checks with supported PR evidence (higher is healthier)
- Past-due checks with uncertain or missing evidence (lower is healthier)

**Engineering flow** (read as trends against the project's own earlier periods)
- Median open PR age (lower)
- Median time from PR opened to first review (lower)
- Merged PRs per week (higher)
- Open PRs per active contributor (lower)

**Quality and reliability** (review process only)
- Share of merged PRs approved before merge (higher)
- Changes-requested rate (context only, not scored)
- Build success rate and incident count: listed but **unavailable**. Horizon has
  no source for them, so they are never scored or guessed.

**Ownership and capacity**
- Top owner's share of surviving lines (lower; flags high concentration)
- Share of lines written by authors no longer on the roster (lower; flags unowned work)
- Share of rostered engineers active in the period, adjusted for team size (higher)

**Blocker and risk trends**
- Change in open risk and evidence-gap findings versus the last period (lower)

## Why these weights

Delivery against the SOW is the main question leads ask, so it has the most
weight. It still stays under a third because its evidence is LLM suggestions,
not proof. Flow and ownership come from deterministic Gitea data, so each gets
20%. Quality is limited to review signals and risk partly repeats delivery
evidence, so each gets 15%.
