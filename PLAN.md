# Keystroke Dynamics: Full Implementation Plan

## Context

The existing Svelte app captures raw digraph timing (6 metrics) and displays averages + a table. It has no persistence, no profile building, no comparison logic, and no human-ness analysis. The goal is to build a complete keystroke dynamics research tool that can:
1. Build typing signatures from free-text sessions
2. Store and manage user profiles
3. Compare sessions against profiles (same-user verification)
4. Score whether a typing session appears human or bot-generated

Based on research from the keystroke dynamics survey (arxiv 2303.04605v2), the approach uses digraph aggregation, Scaled Manhattan Distance for comparison, and multi-factor human-ness scoring.

**Decisions:**
- Keep legacy Svelte `$:` reactive syntax (no runes migration)
- Build all 4 tabs from the start with placeholders for unbuilt phases
- Track paste events and factor into human-ness analysis

---

## Step 0: Refactor & Extract Components

Extract the monolithic `App.svelte` into a component architecture. Keystroke capture stays at the window level (always active regardless of tab).

**Files to create:**
- `src/lib/types.ts` — all TypeScript interfaces (RawDigraph, DigraphAggregation, MetricStats, Profile, ComparisonResult, HumannessResult, etc.)
- `src/lib/utils.ts` — extract `round()`, `avg()`, add `std()` helper
- `src/lib/components/CapturePanel.svelte` — textarea + raw digraph table + JSON export (extracted from App.svelte)
- `src/lib/components/StatsBar.svelte` — the 6-metric averages bar
- `src/lib/components/TabBar.svelte` — tab navigation (Capture | Profile | Compare | Human-ness)

**Refactor `App.svelte`** into orchestrator: holds canonical `digraphs[]` array and `sessionMetadata`, manages tab state, keeps `svelte:window` keydown/keyup handlers so capture works on all tabs.

**Tab setup:** All 4 tabs visible from the start. Non-implemented tabs show a placeholder until their phase is built.

**Key gotcha:** Don't conditionally render CapturePanel with `{#if}` — either always render it (hide with CSS) or keep the `svelte:window` bindings in App.svelte. Recommended: keep handlers in App.svelte.

---

## Step 1: Per-Digraph Aggregation & Profile Building

**New file: `src/lib/aggregation.ts`**
- `groupDigraphs(digraphs)` — group by normalized key pair (lowercase key1 + key2)
- `computeMetricStats(values[])` — returns `{ mean, std, min, max, count }` for a number array
- `aggregateDigraphs(digraphs)` — for each group, compute MetricStats for all 6 metrics, sort by count descending

**Session metadata tracking (add to App.svelte handlers):**
- `totalKeystrokes` — increment on every keydown (not just digraph-forming)
- `backspaceCount` — increment when `e.key === 'Backspace'`
- `pauseCount` — gaps > 500ms between consecutive keydowns (track `lastKeydownTime`)
- `avgTypingSpeed` — chars/min from total keystrokes and session duration
- `sessionDurationMs` — first keydown to last keyup

**New component: `src/lib/components/ProfileSummary.svelte`**
- Table of top 15 digraphs by frequency: `keys | count | HT1 (mean +/- std) | ... all 6 metrics`
- "Show all" toggle
- Session metadata summary row

**Case normalization:** Treat `'A'` and `'a'` as the same key when grouping digraphs. Include Backspace and Enter in aggregation (they carry signature), exclude arrow/navigation keys.

---

## Step 2: Profile Storage & Management

**New file: `src/lib/storage.ts`**
- localStorage key: `"kd_profiles"`
- `saveProfile(profile: Profile)` — JSON stringify, append to stored array
- `loadProfiles(): Profile[]` — parse with try/catch, validate shape
- `deleteProfile(id: string)` — filter and re-save
- `exportProfile(profile: Profile)` — Blob + URL.createObjectURL for JSON file download
- `importProfile(file: File): Profile` — FileReader, JSON.parse, validate

**Profile interface stores aggregations (not raw digraphs)** to keep localStorage size manageable.

**New component: `src/lib/components/ProfileManager.svelte`**
- Text input + "Save Profile" button (default name: "Session - {date}")
- List of saved profiles: name, date, digraph count, delete button
- Export button per profile (JSON file download)
- Import button (hidden file input)

---

## Step 3: Session Comparison (Scaled Manhattan Distance)

**New file: `src/lib/comparison.ts`**

**Algorithm: Scaled Manhattan Distance**
1. Build lookup maps from both session and profile aggregations
2. Find shared digraph types (by normalized key pair)
3. For each shared digraph, for each of 6 metrics:
   - `distance = |mean_session - mean_profile| / std_profile`
   - If `std_profile < epsilon`: use `|mean_session - mean_profile| / max(mean_profile * 0.1, 1.0)` as fallback
4. `overallDistance = sum(all distances) / (sharedCount * 6)`
5. `similarityPercent = max(0, 100 * (1 - overallDistance / 3.0))` — distance of 3 std devs = 0% similar
6. Confidence: `shared >= 15` high, `>= 10` medium, `>= 5` low, `< 5` insufficient

**New component: `src/lib/components/ComparisonView.svelte`**
- Dropdown to select a saved profile
- "Compare" button (disabled if insufficient overlap)
- Results: large similarity %, confidence badge, raw distance score
- Per-digraph breakdown table sorted by distance (worst first), with color-coded match quality bars
- Note in UI: comparing prose vs code sessions for the same user will produce poor matches

---

## Step 4: Human-ness Detection

**New file: `src/lib/humanness.ts`**

Six sub-scores (0-100 each), combined via weighted average:

| Sub-score | Weight | What it measures | Human signal |
|-----------|--------|-----------------|-------------|
| Timing Variance | 0.20 | CV (std/mean) of pressPress per digraph | Humans CV > 0.15, bots < 0.05 |
| Correction Rate | 0.15 | backspaceCount / totalKeystrokes | Humans 5-15%, zero is suspicious |
| Pause Distribution | 0.20 | Presence/variance of gaps > 500ms, > 1s | Humans have thinking pauses |
| Distribution Shape | 0.15 | Skewness of timing arrays | Human timing is right-skewed (log-normal) |
| Flight Time Negativity | 0.15 | % of digraphs with releasePress < 0 | Humans overlap keys, bots don't |
| Burst Patterns | 0.15 | Variance of "burst" lengths (consecutive digraphs < 300ms gap) | Humans type in bursts of 3-15 keys |

**Composite verdict:** score >= 60 "likely human", 40-60 "uncertain", < 40 "likely bot"

**Minimum requirement:** 20 digraphs before computing. Show "keep typing..." below that.

**New component: `src/lib/components/HumannessView.svelte`**
- Large score display (0-100) with verdict text and color
- 6 horizontal bars showing each sub-score with label
- Brief explanation under each bar

**Paste detection:** Add `on:paste` handler to textarea. Track `pasteCount` and `pastedCharCount` in session metadata. Factor into human-ness score — a session where most content was pasted (high paste ratio vs keystrokes) scores lower. Not inherently disqualifying, but a signal.

---

## Implementation Order

```
Step 0 (refactor)  -->  Step 1 (aggregation)  -->  Step 2 (storage)
                                                       |
                                                   Step 3 (comparison)
                                                       |
                                                   Step 4 (human-ness)
```

Steps 3 and 4 are independent of each other (both depend on Step 1's aggregation). Step 2 must come before Step 3 (comparison needs saved profiles to compare against).

---

## File Summary

| File | Action |
|------|--------|
| `src/App.svelte` | Refactor into orchestrator |
| `src/lib/types.ts` | New — all interfaces |
| `src/lib/utils.ts` | New — shared math helpers |
| `src/lib/aggregation.ts` | New — digraph grouping + stats |
| `src/lib/storage.ts` | New — localStorage profile CRUD |
| `src/lib/comparison.ts` | New — Scaled Manhattan Distance |
| `src/lib/humanness.ts` | New — 6-factor human-ness scoring |
| `src/lib/components/CapturePanel.svelte` | New — extracted capture UI |
| `src/lib/components/StatsBar.svelte` | New — extracted stats bar |
| `src/lib/components/TabBar.svelte` | New — tab navigation |
| `src/lib/components/ProfileSummary.svelte` | New — aggregated digraph view |
| `src/lib/components/ProfileManager.svelte` | New — save/load/export profiles |
| `src/lib/components/ComparisonView.svelte` | New — comparison results |
| `src/lib/components/HumannessView.svelte` | New — human-ness score display |
| `src/app.css` | Minor additions for tabs, score displays |

---

## Verification

After each step:
1. `bun run dev` — app loads without errors
2. Type in textarea — digraphs still captured correctly
3. Step 1: Verify aggregated stats appear in Profile tab, digraph grouping works with repeated pairs
4. Step 2: Save a profile, reload page, profile persists. Export/import round-trips correctly.
5. Step 3: Save a profile, type new session, compare — similarity score and per-digraph breakdown appear. Test with same content (should be high similarity) and different content (lower but non-zero for same user).
6. Step 4: Type naturally — should score > 60. Test edge case: very short session shows "keep typing" message.
