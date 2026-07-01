# Fourballs: Talent Score + Chemistry System — Implementation Spec

## Context

This replaces the old `bonds` / `hero_boost` / `hero_bonus_*` mechanic, which was removed
from `players.csv` because it hard-coded specific player pairings as static per-row data,
several of which were historically anachronistic (e.g. a 2002 card referencing a player
who didn't debut until 2012). The new system computes a player's baseline strength from
tier, and computes chemistry between two specific player-cards dynamically at pairing
time, rather than storing it on either card.

`players.csv` / `players.json` no longer contain any chemistry-related columns. Two new
small reference files carry the data this system needs:

- `talent_scores.json` — tier -> baseline talent score
- `cup_results.json` — Ryder Cup year -> winning side (needed for the chemistry bonus
  below; does not exist yet and needs to be created as part of this change, see schema below)

---

## 1. Talent Score (baseline per card)

Talent score is a fixed value per tier, looked up from `talent_scores.json`:

```json
{
  "hero": 20,
  "platinum": 15,
  "gold": 10,
  "silver": 7,
  "bronze": 3
}
```

Usage: every player card's `tier` field maps directly to this table to get its talent
score. This number represents the baseline advantage a card brings into a match *before*
any other modifier (stats, fit_*, captain perks, home/away, course fit, chemistry) is
applied. It does not replace or get stored on the player record — look it up at
calculation time from `tier`.

This is intentionally a flat, non-derived number (not computed from the stat_* fields).
It may be rebalanced later; treat it as a single source of truth that's easy to retune
without touching player data.

---

## 2. Cup Results Reference (new file: `cup_results.json`)

Needed to compute the "won together" chemistry bonus. Create this file:

```json
{
  "1999": "USA",
  "2002": "EUR",
  "2004": "EUR",
  "2006": "EUR",
  "2008": "USA",
  "2010": "EUR",
  "2012": "EUR",
  "2014": "EUR",
  "2016": "USA",
  "2018": "EUR",
  "2021": "USA",
  "2023": "EUR",
  "2025": "EUR"
}
```

Each key is a year present in the dataset; value is the nationality (`"USA"` or `"EUR"`)
that won that Ryder Cup.

---

## 3. Chemistry Score (computed between two specific player-cards)

Chemistry is calculated on demand for a specific pair of cards (e.g. when the player
drafts/pairs two players for a foursomes or fourball match). It is NOT stored on either
player's record. Function signature should look something like:

```
computeChemistry(playerCardA, playerCardB, allPlayerRecordsForBothNames) -> number (0-20)
```

It needs access to the full multi-year record list for each player by name (not just the
single card instance being paired) in order to evaluate shared history across years.

### Pillar 1 — Stat Complementarity (0-10 points)

Uses the five `style_*` fields: `style_power`, `style_accuracy`, `style_aggression`,
`style_consistency`, `style_match_play_affinity`.

```
diffs = [abs(A.style_power - B.style_power),
         abs(A.style_accuracy - B.style_accuracy),
         abs(A.style_aggression - B.style_aggression),
         abs(A.style_consistency - B.style_consistency),
         abs(A.style_match_play_affinity - B.style_match_play_affinity)]

avg_diff = average(diffs)
complementarity_score = min(10, avg_diff / 4)
```

Rationale: bigger spread across style dimensions = more complementary skill sets (e.g. a
power player paired with an accuracy player covers more ground than two similar
profiles). The `/4` scaling assumes a realistic max average spread in the high 30s-to-40s
(given the 60-99 stat range) should approach the 10-point ceiling; this divisor is a
tunable constant, not a hard rule — revisit after seeing real distribution of scores
across the full player pool.

### Pillar 2 — Shared History (0-10 points)

Requires looking at BOTH players' full row history (every year each has
`made_team: true`), not just the two specific card-years being paired.

```
A_years = set of years where playerA had made_team == true (across all of playerA's rows)
B_years = set of years where playerB had made_team == true (across all of playerB's rows)
shared_years = A_years ∩ B_years   (intersect, sorted)

if shared_years is empty:
    history_score = 0
else:
    history_score = 4   # base: were on the same real Ryder Cup team at least once

    # check if they won together in any shared year
    shared_nationality = playerA.nationality  # == playerB.nationality, since teammates
    won_together = any(cup_results[year] == shared_nationality for year in shared_years)
    if won_together:
        history_score += 3

    # bonus for repeated partnership across multiple Cups (not just one shared year)
    extra_shared_years = max(0, len(shared_years) - 1)
    history_score += min(3, extra_shared_years)

    history_score = min(10, history_score)
```

Note on what this signal actually represents: this measures "both players were on the
same official Ryder Cup roster in the same year(s)," not "these two were specifically
paired together in a foursomes/fourball match." We don't currently have real on-course
partner data, so this is a team-membership proxy for chemistry, not a true partnership
record. This is a known, accepted limitation — do not over-claim accuracy here in any
UI copy (avoid phrasing like "they played together," prefer "Ryder Cup teammates").

### Total Chemistry Score

```
chemistry_score = complementarity_score + history_score   # range: 0 to 20
```

---

## 4. Implementation Notes

- `style_*` fields are integers in the 60-99 range on every player row; no null-handling
  needed for complementarity calculation on any `made_team: true` row.
- For Pillar 2, a player's `made_team` field is `null`/missing on rows for years they
  weren't actually on a real roster (off-cycle snapshot rows have already been removed
  entirely from this dataset — every row remaining is a real Ryder Cup year). So checking
  `made_team == true` directly is sufficient; there should be no off-cycle contamination.
- Two cards being paired might be different snapshot-years of the SAME real person (this
  shouldn't normally happen in a real draft scenario, but defensively: if name_a ==
  name_b, this function should not be called / should return a sentinel rather than a
  meaningless self-chemistry score).
- The exact in-match effect of a 0-20 chemistry score (e.g. percentage win-probability
  bonus, point-differential nudge, etc.) is a separate, not-yet-defined balance question.
  This spec only defines how the 0-20 number itself is derived. Do not invent an
  in-match conversion formula without further design input.

---

## 5. Files Touched / Created

| File | Change |
|---|---|
| `players.csv` / `players.json` | Already updated — no chemistry columns remain (`bonds`, `hero_boost`, `hero_bonus_*` all removed). No further changes needed here. |
| `talent_scores.json` | New file. Already created — see Section 1. |
| `cup_results.json` | New file. Needs to be created per Section 2. |
| Game logic / engine | New: `computeChemistry(playerCardA, playerCardB)` function per Section 3, plus a `getTalentScore(tier)` lookup per Section 1. |

## 6. Open Items (explicitly deferred, do not implement speculatively)

- Whether real documented on-court pairings (e.g. Tiger Woods/Steve Stricker,
  Dustin Johnson/Collin Morikawa) should get curated bonus weight beyond the computed
  signals above — deferred pending evaluation of how the computed-only version feels.
- The conversion of chemistry score (0-20) into an actual in-match probability/scoring
  effect — not yet designed.
- Whether `talent_score` values (20/15/10/7/3) need rebalancing — locked in for now,
  flagged for revisit after playtesting.
