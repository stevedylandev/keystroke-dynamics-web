# Plan: Standardized Keystroke Dynamics Spec + Reference Library

## Context

The existing web app (`web/`) has solid keystroke dynamics logic (capture, aggregation, comparison, humanness scoring) but it's coupled to a Svelte UI. The goal is to extract this into a **language-agnostic spec** + **standalone TypeScript reference library** that other languages (Python, Rust, Go) can implement against. Use cases include school enrollment verification and proving humanness in online writing.

## Decisions Made

- **Structure**: New `spec/` and `ts/` directories alongside `web/`
- **Metrics**: 4 essential per digraph (holdTime1, holdTime2, pressPress, releasePress); 2 derivable ones are optional
- **Digraphs**: Hybrid — ~30 core English digraphs + any-digraph fallback with min 5 observations
- **Scope**: Full end-to-end — spec document, reference library with tests, and web app refactor

---

## Phase 1: Spec Document + JSON Schemas

### 1.1 Create `spec/SPEC.md`

RFC-style markdown document with these sections:

1. **Introduction & Scope** — what this covers, versioning (`kd-spec/1.0`)
2. **Raw Data Capture** — `KeystrokeEvent` and `RawDigraph` definitions, key normalization rules, excluded keys, `SessionMetadata` shape
3. **Digraph Selection** — core set concept, `spec/digraphs/en.json`, confidence tiers (15+/10-14/5-9/<5 shared core digraphs), minimum observation count (5)
4. **Aggregation** — group by normalized key pair, IQR outlier filtering (k=1.5), compute MetricStats (mean, std w/ Bessel's correction, min, max, count), round to 0.1ms
5. **Identity Comparison** — Scaled Manhattan Distance over 4 metrics, `MAX_METRIC_DISTANCE=3.0`, `MIN_STD_FALLBACK=15.0`, similarity % formula, confidence levels
6. **Humanness Scoring** — 6 weighted sub-scores with exact piecewise-linear breakpoints:
   - timingVariance (0.20): CV of pressPress, range [0.03→0, 0.20→100]
   - correctionRate (0.15): backspace ratio, ideal 2-15%
   - pauseDistribution (0.20): gaps >500ms rate + variance bonus
   - distributionShape (0.15): skewness of pressPress, ideal 0.5-3.0
   - flightTimeNegativity (0.15): % negative releasePress, ideal 10-50%
   - burstPatterns (0.15): burst length mean + CV (burst = consecutive <300ms gaps)
   - Paste penalty when >50% pasted content
   - Verdicts: ≥60 likely_human, 40-59 uncertain, <40 likely_bot
7. **Attestation Object** — JSON shape with specVersion, score, verdict, subScores, sessionStats, optional profileComparison

### 1.2 Create JSON Schema files in `spec/schemas/`

- `raw-keystroke-event.schema.json`
- `raw-digraph.schema.json`
- `session-metadata.schema.json`
- `digraph-aggregation.schema.json`
- `profile.schema.json`
- `comparison-result.schema.json`
- `humanness-result.schema.json`
- `humanness-attestation.schema.json`

### 1.3 Create `spec/digraphs/en.json`

~30 high-frequency English digraphs: th, he, in, er, an, re, on, at, en, nd, ti, es, or, te, of, ed, is, it, al, ar, st, to, nt, ng, se, ha, ou, le, ve, co

---

## Phase 2: Reference TypeScript Library (`ts/`)

### 2.1 Package setup

- `ts/package.json` — zero production dependencies, `vitest` for testing
- `ts/tsconfig.json` — ES2023, strict, ESM output
- Exports as both ESM and CJS

### 2.2 Source modules (extracted + refactored from `web/src/lib/`)

| File | Source | Changes |
|---|---|---|
| `ts/src/types.ts` | `web/src/lib/types.ts` | Add `KeystrokeEvent`, `HumannessAttestation`. Remove `TabId`. Make `pressRelease`/`releaseRelease` optional. `DigraphAggregation` uses 4 essential metrics (2 optional). |
| `ts/src/math.ts` | `web/src/lib/utils.ts` | Keep `round`, `std`, `filterOutliers`. Drop `avg` (UI concern). Add proper `mean()` returning number. |
| `ts/src/normalize.ts` | `web/src/lib/aggregation.ts` lines 1-28 | Extract `normalizeKey`, `normalizeDigraphKey`, `EXCLUDED_KEYS`, `shouldExclude`. |
| `ts/src/capture.ts` | `web/src/App.svelte` lines 46-107 | **NEW**: Platform-agnostic `CaptureSession` class with `keyDown(key, timestamp)`, `keyUp(key, timestamp)` → `RawDigraph | null`, `getMetadata()`, `getDigraphs()`, `reset()`. |
| `ts/src/aggregate.ts` | `web/src/lib/aggregation.ts` | `computeMetricStats`, `aggregateDigraphs`. Operate on 4 essential metrics by default. |
| `ts/src/compare.ts` | `web/src/lib/comparison.ts` | `compareSession`. Change `METRIC_KEYS` from 6 to 4. |
| `ts/src/humanness.ts` | `web/src/lib/humanness.ts` | All 6 sub-score functions + `analyzeHumanness`. Consolidate duplicated `computeStd` into `math.ts`. |
| `ts/src/attestation.ts` | NEW | `createAttestation(humanness, digraphs, metadata, comparison?)` → `HumannessAttestation` |
| `ts/src/index.ts` | NEW | Barrel export of public API |

### 2.3 Tests (`ts/tests/`)

- `math.test.ts` — round, std, mean, filterOutliers
- `capture.test.ts` — CaptureSession state machine
- `normalize.test.ts` — key normalization edge cases
- `aggregate.test.ts` — grouping, outlier filtering, metric stats
- `compare.test.ts` — distance calculation, similarity %, confidence levels
- `humanness.test.ts` — each sub-score function + composite scoring
- `fixtures.test.ts` — load spec fixtures, assert outputs match

---

## Phase 3: Test Fixtures (`spec/fixtures/`)

Generate from the reference implementation using real profile data (`1.json`, `2.json`):

- `aggregation/` — input raw digraphs → expected aggregations
- `comparison/` — input session+profile aggregations → expected ComparisonResult
- `humanness/` — human-like session → expected scores; bot-like session → expected scores
- `math/` — known inputs → expected outputs for filterOutliers, std, etc.

Each fixture: `{ input: {...}, expectedOutput: {...} }` with 0.1 tolerance for floats.

---

## Phase 4: Refactor Web App

### 4.1 Add library dependency

Add `ts/` as a workspace or path dependency in `web/package.json`.

### 4.2 Replace inline modules

| Web file | Action |
|---|---|
| `web/src/lib/types.ts` | Replace with re-exports from `@keystroke-dynamics/core` (or path import) |
| `web/src/lib/utils.ts` | Replace with imports from library's `math.ts`. Keep `avg()` locally (UI helper). |
| `web/src/lib/aggregation.ts` | Replace with imports from library |
| `web/src/lib/comparison.ts` | Replace with imports from library |
| `web/src/lib/humanness.ts` | Replace with imports from library |
| `web/src/lib/storage.ts` | **Keep as-is** — browser-specific, intentionally not in spec |
| `web/src/App.svelte` | Replace inline capture logic (lines 46-107) with `CaptureSession` instance |

### 4.3 Verify

- `bun run check` passes
- `bun run dev` works, all tabs functional
- Existing profiles (`1.json`, `2.json`) still load and compare correctly

---

## Key Files to Modify/Create

**Create:**
- `spec/SPEC.md`
- `spec/schemas/*.schema.json` (8 files)
- `spec/digraphs/en.json`
- `spec/fixtures/` (fixture JSON files)
- `ts/package.json`, `ts/tsconfig.json`
- `ts/src/*.ts` (9 files)
- `ts/tests/*.test.ts` (7 files)

**Modify:**
- `web/src/lib/types.ts` — re-export from library
- `web/src/lib/utils.ts` — import from library, keep `avg` locally
- `web/src/lib/aggregation.ts` — re-export from library
- `web/src/lib/comparison.ts` — re-export from library
- `web/src/lib/humanness.ts` — re-export from library
- `web/src/App.svelte` — use `CaptureSession` class
- `web/package.json` — add library dependency

**Keep unchanged:**
- `web/src/lib/storage.ts`
- All Svelte components (they import from `web/src/lib/` which will re-export)

---

## Verification

1. `cd ts && bun test` — all library unit tests pass
2. `cd ts && bun test fixtures.test.ts` — all spec fixtures pass
3. `cd web && bun run check` — TypeScript/Svelte checks pass
4. `cd web && bun run dev` — app runs, type in textarea, verify:
   - Capture tab shows digraphs
   - Profile tab shows aggregations
   - Save a profile, compare against it
   - Humanness tab shows score with all 6 sub-metrics
   - Import `1.json`/`2.json`, comparison still works
5. Validate JSON schemas: `npx ajv validate -s spec/schemas/raw-digraph.schema.json -d spec/fixtures/...`

