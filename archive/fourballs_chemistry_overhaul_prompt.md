# Fourballs — Chemistry System Overhaul + Mobile Polish

## Context
Read CLAUDE.md, ERROR.md, data/players.json, data/captains.json, data/venues.json,
src/scoring-engine.js, and index.html fully before making any changes. This prompt
describes several connected changes. Work through them in the order listed —
later sections depend on earlier ones. Update CLAUDE.md and MEMORY.md as you go,
per the existing Session Protocol.

Do not touch the existing "No manual pairing screen" decision for Standard mode,
or the Advanced mode pairing builder (renderAdvancedPairing) — both are correct
as-is and out of scope here, except where explicitly noted in Section 4.

---

## 1. Real-world chemistry bonds — data fix

Add the following pairs to the `bonds` array in data/players.json. Bonds are
stored symmetrically (both players list each other) on every year-entry within
the given range, matching the existing pattern (see Mickelson/Bradley as
reference). Do not remove any existing bonds.

- **Patrick Reed ↔ Jordan Spieth**: add for all entries 2013–2018 (their real
  partnership window; record was 5 points from 7 appearances, unbeaten in
  foursomes together).
- **Jon Rahm ↔ Tyrrell Hatton**: add for entries 2021, 2023, 2024 (real pairing
  history starts 2021; unbeaten in 5 matches together as of 2025).
- **Tiger Woods ↔ Steve Stricker**: add for the 2008 entry (only year both
  currently exist in the dataset — see flag below).
- **Phil Mickelson ↔ David Toms**: add for entries 2001–2005 (real record:
  ~6 points together).

**Data gap to flag, not silently fix:** Steve Stricker only has a single 2008
entry in players.json, but his real Ryder Cup pairing history with Tiger Woods
extends to 2010–2012. Note this in MEMORY.md as a known gap — do not invent
additional Stricker year-entries as part of this task; that's a separate
data-expansion effort.

After adding bonds, run scoring-engine.test.js and confirm nothing breaks.

---

## 2. Archetype system — new chemistry layer

### 2.1 Archetype list (6 total)
Add a derived `archetypes` field (array) to every player in players.json:
Power, Precision, Short Game, Putting, Clutch, Steady.

Derive from existing `stats` and `style_tags` fields (write a one-time script
in /scripts/, e.g. derive_archetypes.js, do not hand-tag):
- Power ← driving_distance / style_tags.power
- Precision ← driving_accuracy + greens_in_regulation / style_tags.accuracy
- Short Game ← scrambling
- Putting ← birdie_rate
- Clutch ← stats.pressure_index
- Steady ← style_tags.consistency

For each player, assign the top N archetypes by their derived score, where N
depends on tier:
- Hero: 3 archetypes
- Platinum: 2
- Gold: 2
- Silver: 1
- Bronze: 1

### 2.2 Course archetype
Add a single `archetype` field (one of the 6 above) to each venue in
venues.json, derived from existing hidden course tags (map power_factor-heavy
courses to Power, etc. — use judgment based on existing tag fields, document
the mapping decisions in MEMORY.md).

### 2.3 Chemistry tier hierarchy (replaces continuous-score-only model)
Chemistry between two players now resolves to the **highest tier that
applies**, with limited stacking (see below), not a single blended percentage.
This logic lives in scoring-engine.js as a new function, e.g.
`getChemistryTier(p1, p2)`, returning `{ tier, label, detail }`:

1. **Partnership** (highest) — `hasBond(p1, p2)` is true. Label: "Proven Pair."
2. **Cup Teammates** — `ryder_cup_years` overlap (filtered to each player's
   card year as existing logic already does). Label: "Cup Teammates '{year}"
   using the most recent shared year.
3. **Style Match** — archetype sets overlap (shared archetype) OR satisfy a
   defined complementary-pair list (e.g. Power+Putting, Precision+Short Game,
   Clutch+Steady — finalize this list and document it in MEMORY.md). Label:
   "Style Match: {archetype}."
4. **Neutral** — none of the above. No badge shown.

**Stacking rule:** if tier 1 (Partnership) AND tier 2 (Cup Teammates) both
apply, treat as an enhanced top tier ("Proven Pair · Cup Teammates") with a
small additional flat bonus (define exact value in scoring-engine.js, keep
it modest — this should read as "extra special," not double-count toward
imbalance).

This tiered result feeds the existing `calculatePairingChemistry` /
`calculateMatchProbability` pipeline as an additional input — do not remove
the existing continuous stat-based math, the tier system sits alongside it
as the player-facing explanation layer; the underlying number can still be
informed by continuous stats for simulation accuracy. Keep this distinction
clear in code comments: tiers are for **display**, continuous score is for
**simulation math**. They should be directionally consistent (a Partnership
pair should never display as worse than a Neutral pair).

---

## 3. Live draft header — Talent / Chem / Total

### 3.1 Persistent header bar
Add a header bar to the draft screen (render function for the draft round,
likely near the existing "Pick X of 12" header) showing three live numbers,
visible and updating throughout the draft. Note: a separate companion prompt
introduces a 13-round draft (12 player slots + 1 dedicated captain slot that
does NOT consume a player slot). If that prompt has been implemented, update
"Pick X of 12" style labels to reflect 13 rounds, and Talent/Chem should only
accumulate from player picks — a captain pick fills its own separate slot and
is never counted toward Talent or Chem:

```
Talent: {sum}    Chem: {sum}    Total: {sum}
```

- **Talent**: running sum of composite score for all current picks.
- **Chem**: running sum of chemistry value added by each pick at the time it
  was made (see 3.2 for how each pick's contribution is computed and locked).
- **Total**: Talent + Chem.

Do NOT draw connector lines between slots — this was considered and
explicitly rejected because slots are not positionally fixed (players are
drafted as a free-form 12, not into typed positions like Griddy's QB/RB/WR/TE
grid). The header bar is the entire live-feedback mechanism for this version.

### 3.2 Per-pick chemistry contribution
When a new player is picked (rounds 2–12; round 1 has no existing picks to
compare against), compute their chemistry contribution as follows:
- Run `getChemistryTier` (from Section 2.3) against every existing pick.
- Take the single best-tier match found (if multiple existing picks tie at
  the same top tier, just use the first/any one — do not sum across all
  pairs, this is about the *best new connection*, not total board chemistry).
- Add that tier's point value to the running Chem total.
- Store this pick's contribution (tier, partner name, point value) on the
  pick object itself so it can be displayed in the history view (3.3) and so
  the value doesn't get recalculated/changed later if board state shifts.

### 3.3 Tap-to-expand history
Tapping the Chem number (or a small chevron/icon next to it) expands a list
showing each pick made so far and its locked-in chemistry contribution from
3.2, e.g.:
```
Tiger Woods — +0 (first pick)
Scottie Scheffler — +6 — Style Match: Clutch
Patrick Reed — +15 — Proven Pair (with Jordan Spieth, picked later — note:
   contribution only shows for the SECOND of a pair to be picked, not both)
```
Collapsible/dismissible, doesn't block the draft screen, no need for a full
modal — a simple expand/collapse panel beneath the header is sufficient.

### 3.4 Toast on pick
In addition to the persistent header and expandable history, show a brief
toast/pulse animation at the moment a pick is confirmed if (and only if) it
added chemistry > 0, e.g. "Chem +15 — Proven Pair with Jordan Spieth." Auto-
dismiss after ~2.5s. No toast needed for round 1 or for picks that add 0
chemistry (avoid noise).

---

## 4. Auto-optimal lineup (Standard mode pairing assignment)

Replace the current pairing assignment logic (the "Foursomes: best 8 by
composite, paired 1+2, 3+4..." greedy approach referenced in CLAUDE.md Section
"Pairing Assignment") with a proper optimization pass:

- Goal: maximize total chemistry tier value (Section 2.3) summed across all
  16 pairing slots (4 foursomes AM + 4 foursomes PM + 4 fourball AM + 4
  fourball PM), while respecting the existing fatigue rule (no pair structure
  that forces more players into 4-session overload than necessary).
- This can be a reasonably simple greedy-with-backtracking or a small
  brute-force-with-pruning approach given only 12 players — it does not need
  to be a fully general assignment-optimization algorithm, just meaningfully
  better than positional sort-by-composite.
- This is backend-only. The existing Review screen UI, "Reshuffle Pairings"
  button, and Advanced mode are unaffected — Reshuffle should still cycle
  between a small number of near-optimal options (keep existing
  `computePairingOptions` structure, just make the options it generates
  better-informed by chemistry tiers, not just composite score).
- Advanced mode (manual builder) remains fully separate and unchanged — it
  already surfaces chemistry percentages and bond/venue badges correctly,
  per the existing renderAdvancedPairing function. No changes needed there
  except updating its chemistry display to also show the new tier label
  (e.g. "Proven Pair" / "Cup Teammates '16" / "Style Match: Power") alongside
  the existing percentage, reusing the chem-dot pattern already in place.

---

## 5. Mobile / visual polish

### 5.1 Card art (jersey + flag treatment)
Replace the current empty-placeholder card art with a simple generic
treatment, since real headshots are not usable (DMCA precedent — see Griddy's
own pivot away from player photos). For each player card:
- A jersey silhouette icon, colored by nationality (USA: navy/red, EUR: navy/
  gold — match existing brand palette, do not introduce new hex values
  outside the current --bg/--surface/--gold/--green system without reason).
- Since both teams only have 2 possible colorways (no 32-team variety like
  Griddy), differentiate cards visually via:
  - Tier color treatment (already exists — border/background tint) — keep.
  - A subtle "era" treatment: cards from earlier years (e.g. pre-2010) get a
    slightly desaturated/vintage filter vs. modern (2018+) full-saturation
    treatment. Pick a clean implementation (CSS filter on the art layer is
    fine) rather than generating distinct art assets.
- Card shape: change from current `aspect-ratio: 1/1` to a taller ratio,
  roughly 0.62:1 (width:height) to match standard trading-card proportions
  and leave room for the jersey art without cramping the name/year/tags.
  Apply this to .player-card and any other place that assumes square cards
  (.pick-cards-row children, .ai-reveal-cards children, .picks-grid children
  — audit all card-rendering contexts, not just the main draft cards).

### 5.2 Chemistry indicator sizing
- Increase `.chem-dot` and `.card-chem-dot` minimum size to 14-16px (currently
  8-9px) for visibility and tap-friendliness on mobile.
- Pair color with a shape distinction, not color alone, for colorblind
  accessibility: e.g. filled circle = Partnership/strong, half-filled =
  Style Match/moderate, outlined-only = Neutral. Implement via CSS
  (border-style or a small inset shape) rather than new icon assets where
  possible.
- Replace any reliance on `title` attribute tooltips for chemistry info
  (these don't work on touch) with inline visible text or the tap-to-expand
  pattern from Section 3.3.

### 5.3 Responsive draft grid
Add a mobile-specific breakpoint (suggest `max-width: 480px`, matching iPhone
widths) for `.pick-cards-row` and similar 3-up grids: switch from
`grid-template-columns: repeat(3, 1fr)` to a stacked single-column layout
(3 full-width rows) below this breakpoint, so each card has room for the new
taller card art without text/art cramming. Verify against common widths
(375px, 390px, 428px) — test in browser dev tools device emulation if
possible.

### 5.4 Text sizing
Audit all `font-size` values under 13px (e.g. `.card-year` at 12px, Advanced
mode chemistry percentage text at 11px) and raise to a 13px floor for any
text that conveys information (not purely decorative labels). This avoids
mobile browser auto-zoom-on-focus behavior and improves legibility for an
older golf-fan demographic.

### 5.5 Tier color contrast
Hero tier color (`#38bdf8`, blue) and Platinum (`#c084fc`, purple) are too
close in perceived brightness against the dark green background at a glance.
Shift Hero tier toward a warm color (suggest testing in the `#ff6b4a`–`#ff8c5a`
range) to read as clearly distinct and "rarer" against both the background
and the other tier colors. Update TIER_COLORS and any hardcoded references.

---

## Acceptance checklist (verify before considering this done)
- [ ] scoring-engine.test.js passes with no regressions
- [ ] New bonds appear correctly and symmetrically in players.json
- [ ] Every player has 1-3 archetypes per the tier rule; every venue has 1
- [ ] Draft screen header shows live Talent/Chem/Total, updates each pick
- [ ] Tap-to-expand chem history works and matches toast values exactly
- [ ] Toast fires only when chem contribution > 0, never on round 1
- [ ] Auto-optimal pairing produces a measurably higher total chemistry tier
      score than the old greedy method on at least 3 test drafts (log before/
      after totals in MEMORY.md)
- [ ] Advanced mode chemistry display shows new tier labels alongside existing %
- [ ] Card aspect ratio updated everywhere cards render, not just main draft view
- [ ] Mobile breakpoint tested at 375/390/428px widths
- [ ] No tooltip-only (title attribute) chemistry info remains
- [ ] CLAUDE.md and MEMORY.md updated to reflect all decisions above
