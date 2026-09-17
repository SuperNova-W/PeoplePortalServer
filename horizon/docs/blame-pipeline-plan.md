# Horizon: git blame → Postgres, as a Dagster asset graph

## Context

`horizon/` on this branch is a deliberate reset — `backend/config.py`, `backend/errors.py`, a
28-line `main.py` serving `/health`, two tests. The full legacy app lives on
`add-horizon-to-monorepo`.

The target is the pipeline half: pull from Gitea and People Portal into Postgres, one feature
at a time. The first source is **git blame**, orchestrated with **Dagster**, built as a
sequence of small PRs — **never more than two Dagster assets per PR**, each reviewable by
someone who has not read the others.

> No notes exist from the earlier design conversation (no memory files for this project), so
> parts of this may re-derive decisions already made. Flag anything that contradicts them.

### Why blame first

Blame needs only a repo's `ssh_url` and `default_branch`. No commit list, no branch list, no
per-sha enrichment. Local git does the work: `O(1)` server calls per repo against
`O(commits + 2 × pulls)` for the commits path — ~25 round-trips versus ~1,750 for your 12 repos.

### Prior art, and what to avoid

`dagster_pilot/pilot.py` on the legacy branch declares 13 assets in one 155-line file against
entirely synthetic data, and `deterministic_features` is one unreadable 30-line statement
computing every feature at once. It is the shape this plan is explicitly not.

### Verified against the live environment

- SSH read access to Gitea works — `git ls-remote --heads git@git.appdevclub.com:…` returns heads.
- Postgres 16 running: container `appdev-gitea-analytics-postgres-1`, `127.0.0.1:5433`.
- git 2.54.0 and SSH keys present.
- `gitea_analytics` holds one legacy run: 145,311 blame lines / 64 members — a baseline.
- `data/amazon-leo-git-blame.txt` is a 14MB raw blame capture of a real org: 36,653 lines,
  11 author names, 13 identity pairs, 195 surviving commits, 254 files, 8,728 `previous`,
  1,131 `boundary`, 65 author≠committer. **It doubles as a test fixture and an end-to-end
  expected-output baseline.**

### The legacy bug this design prevents

`blame_repo` (`scripts/member_analytics.py:1452`) reimplemented blame in Python over the Gitea
`.diff` endpoint. It recorded `blame_lines: 0` for all 132 members — zero, not null — with no
warnings, and reported `blame_status: complete`. The call budget proves the diffs were never
fetched: 998 default-branch commits needed ≥998 `.diff` calls; the run recorded 815 total. It
returned `complete=True` because nothing threw.

Three structural consequences:
1. **Parsing is its own layer, pure and separately tested.** No network, no subprocess.
2. **Zero rows is a failure.** Enforced as Dagster asset checks, not convention.
3. **Every git blame field is stored.** Legacy parsed 2 of the 14 fields git emits and threw
   the rest away; recovering them later means re-cloning every repo.

## Working agreement — read this first

**Never commit, push, or open a PR.** The user does that themselves, at every checkpoint.
An agent's job ends at "the work for checkpoint N is on disk, tests pass, here is what
changed." Leave the working tree dirty and stop; do not `git add`, `git commit`, `git push`,
or `gh pr create`.

**One checkpoint at a time.** A checkpoint is one row of the PR ladder below — at most two
Dagster assets. Finish it, run `./nx run horizon:check`, report, and stop. Do not start
the next checkpoint without being asked.

**Every checkpoint must stand alone.** Someone who has read none of the other PRs should be
able to review it. That is the reason for the two-asset cap, not a style preference.

## Handoff state

_Last updated: 2026-09-17. Update this section at the end of every checkpoint._

- **Branch:** `feat/horizon-skeleton`. Base branch for PRs is `master`.
- **Implemented so far:** PR 1 (scaffolding, zero assets), on disk and unreviewed.
  `horizon/pipeline/` now holds `config.py` (`PipelineSettings`), `resources.py`
  (`GiteaClient`, `GitWorkspace`, `PostgresResource` — configuration surface only, no
  behaviour) and `definitions.py` (`defs = Definitions(assets=[], …)`). Tests:
  `tests/test_pipeline_config.py`, `tests/test_pipeline_definitions.py`. The `backend/`
  skeleton is unchanged.
- **Next checkpoint:** PR 2 — extract (`gitea_repository`, `blame_capture`), implementing the
  `GiteaClient` and `GitWorkspace` stubs PR 1 declared.
- **Legacy source of truth:** branch `add-horizon-to-monorepo`. Read it with
  `git show add-horizon-to-monorepo:horizon/<path>`; do not merge it.
- **Environment facts already verified** (no need to re-check):
  - SSH read access to Gitea works from this machine.
  - Postgres 16 runs in Docker as `appdev-gitea-analytics-postgres-1` on `127.0.0.1:5433`,
    database and user both `gitea_analytics`.
  - `horizon/.env` has `PHI_GITEA_URL` and `PHI_GITEA_API_TOKEN` but **no database URL** —
    `HORIZON_DATABASE_URL` must be added before any live run.
  - git 2.54.0, SSH keys present.
  - Python is **3.14.7**; dagster 1.13.23 and dagster-webserver install and run on it.
  - The workspace has no root `package.json` — Nx is the `./nx` wrapper script, so the
    command is `./nx run horizon:check`, not `pnpm nx …`.
  - **Nx `run-commands` loads `horizon/.env` into every task's environment.** Setting
    `PHI_ENV_FILE=''` does not stop it, because pydantic reads real environment variables
    regardless of dotenv settings. `tests/conftest.py` therefore scrubs the settings
    variables out of `os.environ` before any config module is imported. Without that, a test
    asserting an unset default passes or fails depending on whose machine it runs on.
- **Test fixture already on disk:** `horizon/data/amazon-leo-git-blame.txt`, a 14MB real
  capture. Its known counts are the parser's acceptance criteria (see Verification).
  Note `horizon/data/` is gitignored, so it is local-only — do not assume CI has it.

## Coverage matrix

### Every git blame field reaches a column

| git blame field | Stored as |
|---|---|
| header sha | `blame_commits.commit_sha`, `blame_attribution.commit_sha` |
| header line count | `blame_attribution.lines` |
| `author` | `blame_commits.author_name` |
| `author-mail` | `blame_commits.author_email` |
| `author-time` | `blame_commits.author_time` |
| `author-tz` | `blame_commits.author_tz` |
| `committer` | `blame_commits.committer_name` |
| `committer-mail` | `blame_commits.committer_email` |
| `committer-time` | `blame_commits.committer_time` |
| `summary` | `blame_commits.summary` |
| `filename` | `blame_attribution.source_path` |
| `previous` | `blame_attribution.moved_from` |
| `boundary` | `blame_commits.is_boundary` |
| blamed path | `blame_attribution.path` |

### Every derived attribute reaches an asset

| Family | Attribute | Asset | Column | PR |
|---|---|---|---|---|
| Identity | author name / email | all feature tables | `author_name`, `author_email` | 4 |
| | alias evidence | `identity_candidates` | `tier`, `evidence`, `confidence` | 12 |
| | canonical identity | `identity_clusters` | `canonical_email` | 12 |
| | identities per person | `identity_clusters` | `distinct_identities` | 12 |
| Ownership | surviving lines | `member_ownership` | `surviving_lines` | 5 |
| | files owned | `member_ownership` | `files_owned` | 5 |
| | repositories | `member_ownership` | `repositories` | 5 |
| | share per **file** | `file_ownership` | `share` | 5 |
| | files majority-owned | `member_ownership` | `files_majority_owned` | 5 |
| | share per **repo** | `member_repo_ownership` | `share_of_repo` | 6 |
| | rank within repo | `member_repo_ownership` | `rank_in_repo` | 6 |
| | bus factor | `repo_concentration` | `bus_factor_50` | 7 |
| | concentration | `repo_concentration` | `hhi`, `top_author_share` | 7 |
| File mix | extension → class | `path_classification` | `path_class` | 8 |
| | lines by class | `member_file_mix` | `code_lines`, `docs_lines`, … | 8 |
| Time | first / last line | `member_activity` | `first_line_at`, `last_line_at` | 9 |
| | active days / weeks | `member_activity` | `active_days`, `active_weeks` | 9 |
| | median code age | `member_activity` | `median_commit_age_days` | 9 |
| | mean line age | `member_activity` | `mean_line_age_days` | 9 |
| | working timezone | `member_activity` | `usual_timezone` | 9 |
| Commits | surviving commits | `member_durability` | `surviving_commits` | 10 |
| | lines per commit | `member_durability` | `lines_per_surviving_commit` | 10 |
| | largest surviving commit | `member_durability` | `largest_surviving_commit_lines` | 10 |
| | what survived | `member_durability` | `top_summaries` | 10 |
| Process | author ≠ committer | `member_process_signals` | `rebased_commits`, `rebased_lines` | 11 |
| | authored→applied lag | `member_process_signals` | `median_apply_lag_days` | 11 |
| | moved / renamed lines | `member_process_signals` | `moved_lines`, `moved_files` | 11 |
| | initial-import lines | `member_process_signals` | `boundary_lines`, `boundary_commits` | 11 |
| | de-scaffolded ownership | `member_process_signals` | `non_boundary_lines` | 11 |

## Architecture

Six layers. Each layer has one job; no asset spans two.

```
 RESOURCES (shared, never assets)   GiteaClient · GitWorkspace · PostgresResource

 L1 source          L2 capture           L3 parse
 ┌───────────────┐  ┌────────────────┐   ┌────────────────┐
 │gitea_         │  │blame_capture   │   │blame_records   │
 │  repository   │─▶│ clone + blame  │──▶│ text → records │
 │ 1 API call    │  │ raw text→disk  │   │ PURE, no I/O   │
 └───────────────┘  └────────────────┘   └───────┬────────┘
      PR 2               PR 2                 PR 3
                                                 │
 L4 load  ┌──────────────────────────────────────┘
 ┌────────▼───────┐   ┌────────────────┐
 │blame_commits   │──▶│blame_          │         PR 4
 │  _table        │   │ attribution    │
 └────────┬───────┘   └───────┬────────┘
          └───────┬───────────┘
                  │
 L5 features      ▼    one family per PR — narrow, independently re-materializable
 ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
 │file_     │ │member_   │ │repo_     │ │path_     │ │member_   │ │member_   │
 │ownership │ │repo_     │ │concentr'n│ │class'n   │ │activity  │ │durability│
 │member_   │ │ownership │ │          │ │member_   │ │          │ │          │
 │ownership │ │          │ │          │ │file_mix  │ │          │ │          │
 └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
   PR 5         PR 6         PR 7         PR 8         PR 9        PR 10
      │              │            │            │            │           │
      │  ┌──────────┐│ ┌──────────┐           │            │           │
      │  │member_   ││ │identity_ │           │            │           │
      │  │process   ││ │candidates│  PR 12    │            │           │
      │  │_signals  ││ │identity_ │           │            │           │
      │  │  PR 11   ││ │clusters  │           │            │           │
      │  └────┬─────┘│ └────┬─────┘           │            │           │
      └───────┴──────┴──────┼─────────────────┴────────────┴───────────┘
 L6 mart                    ▼
                     ┌─────────────┐
                     │member_      │  PR 13   joins every feature
                     │  profile    │          through identity_clusters
                     └─────────────┘
```

**Why the cuts fall here.** L2 is the only asset touching network or filesystem, so it is the
only one that can be slow or flaky. L3 is pure, so it is exhaustively testable against fixture
text — the legacy failure mode. L4 is the only one writing the core tables. L5 assets are
narrow and independent: a broken timezone calculation cannot block ownership numbers, and each
re-materializes alone.

**Every feature asset is keyed on raw `(author_name, author_email)`.** Identity resolution
produces a *mapping* (`identity_clusters`), and only the L6 mart joins through it. So identity
can land at any point without re-keying a single feature table.

**Resources, not assets:** a clone is an ephemeral working directory, not a data artifact.
`GitWorkspace` owns clone/cleanup so no asset has a tempdir in its return type.

## PR ladder

18 assets, 14 PRs, never more than two assets at once.

### Phase A — spine: blame into Postgres

**PR 1 — scaffolding (0 assets).** `dagster` in a new `orchestration` extra;
`pipeline/definitions.py` exposing an empty `Definitions`; resource stubs; `horizon:dagster`
Nx target running `dagster dev`. Confirms the UI boots and CI passes with an empty graph.

**PR 2 — extract (2: `gitea_repository`, `blame_capture`).** Plus `GiteaClient` (httpx) and
`GitWorkspace` resources. Blame runs `git blame --line-porcelain -w -M -C`; `-M`/`-C` follow
moves and copies so refactors do not silently reassign ownership. Raw text persisted so later
layers re-run without re-cloning. No Postgres.

**PR 3 — parse (1: `blame_records`).** `pipeline/blame_parser.py`, pure
`str → list[BlameRecord]`, emitting **all 14 fields**. Alone in its own PR because it is the
piece legacy got wrong.

**PR 4 — load (2: `blame_commits_table`, `blame_attribution_table`).** `schema.sql`, the
psycopg writer, reconciliation and FK checks.

### Phase B — features: one family per PR

**PR 5 — ownership (2: `file_ownership`, `member_ownership`).**
```
file_ownership    (run_id, org, repo, path, author_name, author_email, lines, share)
member_ownership  (run_id, author_name, author_email, surviving_lines,
                   files_owned, repositories, files_majority_owned, mean_file_share)
```
`share` is a window over each file's total. `files_majority_owned` counts files where
`share > 0.5` — immune to one person dumping a vendored directory.

**PR 6 — per-repo ownership (1: `member_repo_ownership`).**
```
member_repo_ownership (run_id, org, repo, author_name, author_email, lines,
                       share_of_repo, files_owned_in_repo,
                       files_majority_owned_in_repo, rank_in_repo)
```
The per-**repo** share, distinct from PR 5's per-**file** share. This is what answers "who owns
this project", and it is the input `repo_concentration` aggregates.

**PR 7 — concentration (1: `repo_concentration`).**
```
repo_concentration (run_id, org, repo, total_lines, distinct_authors,
                    top_author_email, top_author_share, hhi, bus_factor_50)
```
`bus_factor_50` is the smallest number of authors whose combined share reaches 50%. `hhi` is
the Herfindahl index (sum of squared shares). The "what happens if one person leaves" asset.

**PR 8 — file mix (2: `path_classification`, `member_file_mix`).**
```
path_classification (run_id, org, repo, path, extension, path_class)
                     path_class ∈ code|docs|config|lockfile|data|generated|other
member_file_mix     (run_id, author_name, author_email,
                     code_lines, docs_lines, config_lines, lockfile_lines,
                     data_lines, generated_lines, other_lines)
```
Classification is a **stored table, applied after collection** — not a collection-time
allowlist. Legacy's `SOURCE_EXTENSIONS` / `SKIP_BLAME_NAMES` (`:46`, `:53`) baked the judgment
into the data and could never be revised without re-cloning. Here the rules can change and the
table re-materializes in seconds.

**PR 9 — activity window (1: `member_activity`).**
```
member_activity (run_id, author_name, author_email, first_line_at, last_line_at,
                 active_days, active_weeks, median_commit_age_days,
                 mean_line_age_days, usual_timezone)
```
Ages measured from the run's `started_at`. **Caveat for the PR body:** a true line-weighted
median needs an expensive lateral expansion, so this ships `median_commit_age_days`
(unweighted, over commits) alongside `mean_line_age_days` (line-weighted). Both are honest;
neither is a weighted median.

**PR 10 — durability (1: `member_durability`).**
```
member_durability (run_id, author_name, author_email, surviving_commits,
                   lines_per_surviving_commit, largest_surviving_commit_lines,
                   top_summaries)
```
**Caveat for the PR body:** true durability is surviving lines ÷ lines originally written, and
blame cannot supply the denominator — that needs the commits API. This ships surviving lines
*per surviving commit*, a proxy. Naming it `durability` without that note would overclaim.

**PR 11 — process signals (1: `member_process_signals`).**
```
member_process_signals (run_id, author_name, author_email,
                        rebased_commits, rebased_lines, median_apply_lag_days,
                        moved_lines, moved_files,
                        boundary_commits, boundary_lines, non_boundary_lines)
```
`non_boundary_lines` is the de-scaffolded ownership number and is arguably the headline metric
— initial-import lines are where bulk vendored and generated content lands (1,131 in the
Amazon Leo capture). `rebased_*` comes from author≠committer (65 lines there): a rebase, an
applied patch, or pair-programming attribution. `median_apply_lag_days` is
`committer_time − author_time`, the only use of `committer_time` and a direct measure of how
long work waited before it was applied.

**PR 12 — identity (2: `identity_candidates`, `identity_clusters`).**
```
identity_candidates (run_id, left_email, right_email, tier, evidence, confidence)
identity_clusters   (run_id, author_name, author_email, canonical_email,
                     distinct_identities, cluster_method, reviewed)
```
Blame supplies alias evidence for free: 11 author names produced 13 (name, email) pairs, with
`Michael McCarroll` under 3 emails. Reuse legacy's tiered model from
`scripts/propose_identity_aliases.py:50` — `exact_name_and_shared_org`, `exact_name_only`,
`token_and_shared_org` — and its token helpers (`identity_alias_keys:94`), which already
exclude shared email domains because a university domain identifies a population, not a person.
**Only the top tier auto-clusters** (union-find over exact-name edges); everything else lands
in `identity_candidates` with `reviewed = false` for human review. This is the discipline
legacy lost when `resolve_member` silently stored `RibaDiba <abrmod74@gmail.com>` as a login.

### Phase C — mart and scale

**PR 13 — mart (1: `member_profile`).** One wide row per member per run, joining every L5 table
through `identity_clusters` so consumers do not write eight-way joins. Raw identity stays
visible alongside the canonical one.

**PR 14 — partitioning (0 new assets).** Convert to `DynamicPartitionsDefinition` keyed on
`org/repo`, so blaming a whole org is a partition backfill rather than a new code path.
Deliberately last: partitioning is a concept change, and mixing it with new assets makes both
harder to review.

## Asset checks

| Check | On | Fails when |
|---|---|---|
| `capture_is_non_empty` | `blame_capture` | zero bytes captured — the legacy silent-zero case |
| `records_carry_every_field` | `blame_records` | any of the 14 git blame fields is never populated |
| `records_parse_completely` | `blame_records` | any captured file yields zero records |
| `attribution_lines_reconcile` | `blame_attribution_table` | `SUM(lines)` ≠ parsed total |
| `every_attribution_has_a_commit` | `blame_attribution_table` | FK orphans |
| `file_shares_sum_to_one` | `file_ownership` | any file's shares miss 1.0 by > 1e-6 |
| `repo_shares_sum_to_one` | `member_repo_ownership` | any repo's shares miss 1.0 by > 1e-6 |
| `bus_factor_is_bounded` | `repo_concentration` | `bus_factor_50` < 1 or > `distinct_authors` |
| `every_path_is_classified` | `path_classification` | any blamed path has no class |
| `file_mix_totals_match` | `member_file_mix` | class lines ≠ `member_ownership.surviving_lines` |
| `activity_within_run_window` | `member_activity` | `last_line_at` > run `started_at` |
| `boundary_lines_are_a_subset` | `member_process_signals` | `boundary_lines` > `surviving_lines` |
| `clusters_are_total` | `identity_clusters` | any raw identity lacks a canonical mapping |
| `profile_covers_all_members` | `member_profile` | row count ≠ distinct canonical identities |

## Core schema (PR 4)

```sql
CREATE SCHEMA IF NOT EXISTS horizon;

CREATE TABLE IF NOT EXISTS horizon.runs (
    run_id      TEXT PRIMARY KEY,
    started_at  TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    gitea_url   TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'running',   -- running|complete|partial|failed
    warnings    JSONB NOT NULL DEFAULT '[]'::JSONB
);

CREATE TABLE IF NOT EXISTS horizon.repositories (
    run_id         TEXT NOT NULL REFERENCES horizon.runs(run_id) ON DELETE CASCADE,
    organization   TEXT NOT NULL,
    repository     TEXT NOT NULL,
    default_branch TEXT,
    ssh_url        TEXT,
    html_url       TEXT,
    head_sha       TEXT,
    blamed_files   INTEGER NOT NULL DEFAULT 0,
    skipped_files  INTEGER NOT NULL DEFAULT 0,
    blame_status   TEXT NOT NULL DEFAULT 'pending', -- pending|complete|partial|failed|skipped
    PRIMARY KEY (run_id, organization, repository)
);

-- One row per commit with surviving lines; per-commit blame fields live here
-- rather than repeating on every attribution row.
CREATE TABLE IF NOT EXISTS horizon.blame_commits (
    run_id          TEXT NOT NULL,
    organization    TEXT NOT NULL,
    repository      TEXT NOT NULL,
    commit_sha      TEXT NOT NULL,
    author_name     TEXT NOT NULL,
    author_email    TEXT NOT NULL,
    author_time     TIMESTAMPTZ,
    author_tz       TEXT,
    committer_name  TEXT,
    committer_email TEXT,
    committer_time  TIMESTAMPTZ,
    summary         TEXT,
    is_boundary     BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (run_id, organization, repository, commit_sha),
    FOREIGN KEY (run_id, organization, repository)
        REFERENCES horizon.repositories(run_id, organization, repository) ON DELETE CASCADE
);

-- Surviving line counts per file per commit. source_path is blame's `filename`,
-- which differs from path under -M/-C when the line originated elsewhere, so it
-- belongs in the key. moved_from is blame's `previous`.
CREATE TABLE IF NOT EXISTS horizon.blame_attribution (
    run_id       TEXT NOT NULL,
    organization TEXT NOT NULL,
    repository   TEXT NOT NULL,
    path         TEXT NOT NULL,
    commit_sha   TEXT NOT NULL,
    source_path  TEXT NOT NULL,
    moved_from   TEXT,
    lines        INTEGER NOT NULL CHECK (lines > 0),
    PRIMARY KEY (run_id, organization, repository, path, commit_sha, source_path),
    FOREIGN KEY (run_id, organization, repository, commit_sha)
        REFERENCES horizon.blame_commits(run_id, organization, repository, commit_sha)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS blame_commits_author_idx
    ON horizon.blame_commits (author_email, run_id);
CREATE INDEX IF NOT EXISTS blame_attribution_path_idx
    ON horizon.blame_attribution (run_id, organization, repository, path);
```

Each L5 PR adds its own `CREATE TABLE IF NOT EXISTS` to `schema.sql`. Feature tables are
materialized, not views, so Dagster tracks freshness and a failed feature does not silently
serve stale numbers.

**One aggregation trap to flag in review:** the attribution↔commits join fans each commit
across every file it touched, so any commit-level count must use `COUNT(DISTINCT commit_sha)`.
A plain `COUNT(*)` counts file-commit pairs and inflates `rebased_commits`, `boundary_commits`,
and `surviving_commits`.

## Assumptions

- **New `horizon` schema**, same database; `gitea_analytics` untouched as a baseline.
- **Run-scoped rows** — blame is a snapshot of *now*, so without `run_id` a rerun destroys the
  previous answer.
- **Raw git identity preserved everywhere except the mart.** Legacy resolved early and on
  failure stored the raw string as though it were a login.
- **Classification after collection, never during.** See PR 8.
- **httpx, not the curl-subprocess client** (`:162`) — that hack exists for commit pages, which
  this does not touch.

## What blame cannot provide

Stated once so no PR overclaims: deleted or rewritten code, churn, additions and deletions, PR
reviews, issues, `Co-authored-by` trailers, and non-default-branch work are all out of reach.
They arrive later from the commits and pulls endpoints as separate increments.

## Files

```
horizon/pipeline/
  __init__.py
  config.py        PipelineSettings: gitea_url, gitea_api_token, database_url
  resources.py     GiteaClient · GitWorkspace · PostgresResource
  blame_parser.py  PURE: str -> list[BlameRecord]   (all 14 fields)
  identity.py      PURE: tiered alias heuristics + union-find
  classify.py      PURE: path -> path_class
  assets/
    source.py      gitea_repository
    capture.py     blame_capture
    parse.py       blame_records
    load.py        blame_commits_table, blame_attribution_table
    features/      ownership.py repo_ownership.py concentration.py
                   file_mix.py activity.py durability.py
                   process.py identity.py
    mart.py        member_profile
  checks.py
  schema.sql
  definitions.py
horizon/tests/   one test module per asset module
```

`horizon/project.json`: `install-deps` → `.[test,pipeline,orchestration]`; `build`/`lint`
extended to `pipeline`; new `dagster` target.

## Verification

**Every PR** must pass `./nx run horizon:check` (build, test, lint). Additionally:

- PR 1: `dagster dev` boots; `Definitions` loads with zero assets.
- PR 2: `blame_capture` materializes against a **local** throwaway git repo built in a
  tmpdir — a local path is a valid clone source, so no network is needed.
- PR 3: `blame_parser.py` parses `data/amazon-leo-git-blame.txt` and reproduces its known counts —
  36,653 lines, 11 author names, 13 identity pairs, 195 commits, 254 files, 8,728 `previous`,
  1,131 `boundary`, 65 author≠committer. A real 14MB capture, not a synthetic fixture.
- PR 4: rows land; `attribution_lines_reconcile` passes; a deliberately truncated capture makes
  it fail.
- PRs 5–11: each feature table reconciles against `blame_attribution`, and each PR body carries
  a worked example — one member's numbers and the SQL that produced them.
- PR 12: cluster `Michael McCarroll`'s 3 emails into one canonical identity; assert no two
  *different* people merge, using the known-distinct pairs in the capture.
- PR 13: profile row count equals distinct canonical identities.
- PR 14: two partitions backfill independently; one failing does not block the other.

**End to end, after PR 13:**

```bash
export HORIZON_DATABASE_URL='postgresql://gitea_analytics:…@127.0.0.1:5433/gitea_analytics'
cd horizon && .venv/bin/dagster asset materialize -m pipeline.definitions --select '*'
```

```bash
docker exec appdev-gitea-analytics-postgres-1 psql -U gitea_analytics -d gitea_analytics -c "
  SELECT canonical_email, surviving_lines, non_boundary_lines, code_lines,
         files_majority_owned, surviving_commits, active_weeks,
         first_line_at::date, last_line_at::date
  FROM horizon.member_profile ORDER BY non_boundary_lines DESC LIMIT 10;"
```

Cross-check the top-owner *ranking* against `gitea_analytics.member_metrics` for the same repo.
Totals will differ — legacy filtered by extension and used `-w` without `-M -C` — but a ranking
disagreement means the parser is wrong.

## Ladder after this

1. org repo listing → blame every repo (partition backfill)
2. People Portal roster join — who on the roster has zero surviving lines
3. further Gitea features (commits, PRs, reviews, issues) as independent increments
