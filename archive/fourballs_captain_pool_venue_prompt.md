# Fourballs — Captain-in-Draft, Player Pool Balance, Venue Variety

## Context
This is a follow-up to the chemistry-system overhaul prompt (see
fourballs_chemistry_overhaul_prompt.md / whatever that work is named in your
history — read it if available so terminology stays consistent, e.g.
archetypes, chemistry tiers). This prompt is independent of that one in terms
of code paths touched, but both will eventually run against the same
players.json and the same draft loop, so flag any merge conflicts rather than
silently resolving them.

**Cross-dependency note:** this prompt changes the draft from 12 rounds to
13 rounds — 12 player slots plus 1 dedicated captain slot that does NOT
consume a player slot (see Section 1.1). If the chemistry overhaul prompt's
live Talent/Chem/Total header (its Section 3) is implemented either before
or after this one, reconcile its round-count assumptions and "Pick X of 12"
style labels with the 13-round structure described here. That header should
track player picks only — Talent/Chem should never include the captain pick,
since a captain isn't a player and doesn't have a composite score the same
way. Whichever prompt runs second should reconcile this; do not leave the
two at different round counts or assumptions.

Read CLAUDE.md, ERROR.md, data/players.json, data/captains.json,
data/venues.json, and the draft-related functions in index.html (renderDraft,
renderCaptain, renderNationality, renderVenueSpinner, renderVenueReveal)
fully before starting.

Work in the order below — Section 1 is a structural change to the draft loop
that Sections 2-3 don't depend on, but do Section 1 first since it's the
highest-risk change and easiest to validate in isolation before touching data.

---

## 1. Captain selection moves into the draft itself

### 1.1 Remove the standalone captain screen; draft becomes 13 rounds
Remove the current pre-draft "Choose Your Captain" screen (renderCaptain) and
its position in the flow. New flow order:

```
Landing → Nationality → Venue Spinner → Venue Reveal → Draft (13 rounds:
12 player slots + 1 dedicated captain slot) → Pairings/Review → Simulation
→ Results
```

The draft UI shows a dedicated captain slot alongside the 12 player slots.
This slot exists specifically to track whether a captain has been picked yet
— that single true/false state is what drives the eligibility rule in 1.2.
It is not a separately-weighted system and does not need its own odds logic.

The player enters the draft with `G.captain = null` and `G.picks = []` (12
max). The draft continues until `G.picks.length === 12 AND G.captain !== null`.
Filling both pools always takes exactly 13 picks, so **the draft always
takes exactly 13 rounds**, regardless of which round the captain is taken in.
**Taking a captain does NOT consume a player slot** — it fills the separate
captain slot, and the draft simply continues offering player-eligible rounds
until all 12 player slots are also full. Update any hardcoded "12"
round-count references (UI labels like "Pick X of 12", loop bounds, progress
bars) to reflect the new 13-round total — audit thoroughly, this number
likely appears in multiple places.

The moment a captain card is picked (any round, 1-12), `G.captain` is set and
captain cards stop appearing in all future rounds for that draft (see 1.2).
If `G.captain` is still null when round 13 is reached, round 13 is overridden
to show 3 low-tier captains only (see 1.3) — the player is guaranteed a
captain by the end of the draft, and this never costs them a player slot
since round 13 only exists once all 12 player slots are already full.

Update all downstream code that currently assumes `G.captain` is set before
the draft begins (e.g. anything reading captain perks during draft-time AI
reveal, if applicable) to handle a null captain gracefully until one is
picked.

### 1.2 Captain tier system (mirrors player tiers exactly)
Add a `tier` field to every captain in captains.json using the same five
values already used for players: hero, platinum, gold, silver, bronze.
Re-tier the existing "legendary" captains into this scale based on their
`chemistry_mult` and perk strength (use judgment; document the mapping
rationale in MEMORY.md). Captains with standout, signature perks (e.g.
Paul Azinger's real captaincy reputation) should land in hero tier; weaker
or more situational captains land in silver/bronze. This is a new sibling
pool to the player pool, not a merge of the two — keep captains.json and
players.json as separate files/arrays, just classified on the same tier
scale so they can be drawn from the same odds table.

When generating each round's 3 card slots, each slot independently rolls a
tier using the exact existing graduated odds table from CLAUDE.md ("Tier
Weighting Per Pick" — 80% platinum / 15% gold / 5% hero in rounds 1-2, etc.).
Once a tier is rolled for a slot, that slot draws from BOTH the player pool
and the captain pool at that tier (filtered to the player's chosen
nationality and not yet captain-locked), combined into one set, and picks
one at random from the combined set. This means a captain isn't weighted
separately or specially — it just sits in the same tier bucket as players
of that tier, and how often a captain actually appears vs. a player at a
given tier is a natural function of how many captains vs. players exist at
that tier (e.g. if there are 3 hero captains and 30 hero players total
across both nationalities, a hero-tier slot roll has roughly a 1-in-11
chance of resolving to a captain — no separate tuning constant needed,
unlike a prior draft of this prompt which proposed one).

Once `G.captain` is set, captains are removed from the eligible pool for all
subsequent rounds — every later tier roll draws from players only.

### 1.3 Round-13 fallback if no captain taken
If round 13 is reached and `G.captain` is still null (which, by definition,
means all 12 player slots are already full, since round 13 only exists once
the player pool is exhausted), override normal round generation: show
exactly 3 low-tier (silver/bronze) captains as round 13's only options,
instead of the normal tier-rolled mix. This guarantees the player exits the
draft with 12 players + 1 captain in every case — waiting costs you a
weaker captain, never a player slot (per prior discussion: "if no captain is
selected in rounds 1-12, 3 captains will appear from the lowest pool").

### 1.4 UI updates
- The draft header (or wherever the existing chemistry Talent/Chem/Total bar
  from the other prompt lives, if already built) should show "No Captain
  Selected" or similar until one is picked, then show the captain's name/perk
  summary once locked in.
- A captain card, when it appears as one of the 3 round options, should be
  visually distinct from a player card — reuse existing captain-card styling
  from the old renderCaptain screen (name, year captained, full bonus
  breakdown) rather than designing new treatment, just fit it into the
  pick-row card size/shape used for player cards in this round.
- Update or remove any "Step 1 — Captain" type labeling that assumed captain
  selection was a separate, first step.

### 1.5 AI opponent captain logic
The AI opponent's captain assignment is unaffected by this change — keep
existing AI captain logic as-is. This change only affects the human player's
experience picking from the draft pool; the AI's own draft (the alternating
picks already shown each round) should continue however it currently
determines its captain, AI side is out of scope here unless mixing captains
into AI's pool turns out to be required by shared code paths — flag if so.

---

## 2. Player pool balance fixes

### 2.1 Hero-tier imbalance (USA vs EUR)
Current state: USA has 6 hero-tier player-year entries across the whole pool,
EUR has 26 — a 4x+ imbalance. This makes the AI opponent's effective
difficulty asymmetric depending on which nationality the human picks (a EUR-
picking player faces a hero-heavy AI USA pool far less often than a USA-
picking player faces hero-heavy AI EUR pool, since "AI always drafts a hero
if available" per CLAUDE.md's AI pick priority rule).

Bring USA hero-tier count up toward rough parity with EUR (target: roughly
20-26 hero-tier USA entries, not necessarily exact 1:1 but same order of
magnitude). Do this by:
- Reviewing existing USA platinum-tier players for any who have legitimate
  "fan favorite / Ryder Cup icon" status (per CLAUDE.md's Hero Tier Rules
  definition) that may have been under-tiered — promote where justified
  (e.g. multi-year Ryder Cup mainstays with strong personality/moments).
- Where promotion isn't justified by an existing player's profile, do not
  force-promote — instead flag specific years/players in MEMORY.md where
  the USA hero pool is thin and a genuine hero-tier candidate doesn't
  currently exist in the dataset at all (this may be a true data gap, not
  a tiering error).
- Do NOT simply demote EUR heroes to fix the ratio — Poulter, Garcia, Clarke,
  etc. are correctly tiered based on real Ryder Cup history; the fix should
  come from the USA side being built up, not the EUR side being cut down.

### 2.2 Thin 2024/2025 coverage
2024 has only 9 player entries and 2025 has only 3, versus a 16-22 norm for
every other year 2000-2023. Expand both years to bring them in line with the
historical average (~18 entries), using real 2024/2025 Ryder Cup rosters and
form. Research actual squad members and stats for both years rather than
inventing entries — if reliable stats aren't available for a given player-
year, use reasonable estimates consistent with the existing stat scale
(0-100ish per the existing driving_distance/accuracy/etc. fields) and flag
estimated entries with a `"data_confidence": "estimated"` field so this is
auditable later, rather than presenting guessed numbers as verified history.

---

## 3. Venue variety

### 3.1 Descriptor flatness
Current state: "High Pressure Venue" appears on 12 of 16 venues (75%),
"Precision Required" on 9 of 16. Most venues read nearly identically to the
player at the reveal screen.

Rework `user_descriptors` so each venue gets a more distinctive 2-3 tag
combination — pull from the existing range of descriptors but vary
combinations more deliberately so no single descriptor appears on more than
~40% of venues. Add 1-2 new descriptor options if needed for variety (e.g.
something representing a Putting-heavy course, since the current descriptor
set doesn't clearly map to a "greens are the story here" venue — this also
sets up the venue-archetype mapping needed for the chemistry overhaul prompt's
Section 2.2, so coordinate field naming with that prompt if both are run by
the same session).

### 3.2 Course type variety
Current state: 13 of 16 venues are "parkland," only 2 links, 1 heathland.
Real Ryder Cup history includes more terrain variety than this. Where
historically accurate, correct `course_type` for venues that are mistagged
(verify against real course type for each venue — e.g. confirm Celtic Manor,
Le Golf National, etc. against their actual classification) and consider
whether the venue pool itself should be expanded with 2-4 additional
historically real Ryder Cup venues that add links/heathland/other variety
options, rather than only relabeling existing entries.

### 3.3 Hidden tags — add Putting and Steady weights
Current `hidden_tags` cover power_weight, accuracy_weight, short_game_weight,
wind_factor, pressure_factor — no field maps cleanly to Putting or Steady
archetypes (needed for the venue-archetype assignment in the chemistry
overhaul prompt's Section 2.2). Add `putting_weight` and `consistency_weight`
fields to every venue, scored 0-100 like the existing weight fields, based on
real course characteristics (e.g. notoriously fast/tricky greens → high
putting_weight; a course known for punishing inconsistency → high
consistency_weight). This is additive — do not remove or rename existing
hidden_tags fields, other scoring logic depends on them.

---

## Acceptance checklist
- [ ] Standalone captain screen removed; flow goes Venue Reveal → Draft directly
- [ ] Draft is exactly 13 rounds (12 player slots + 1 captain slot); "Pick X
      of 12" and similar labels updated everywhere they appear
- [ ] Taking a captain does NOT consume a player slot (test: taking a
      captain in round 3 still results in 12 players + 1 captain at draft's
      end, with the draft running the full 13 rounds either way)
- [ ] Captain tier field added to captains.json (hero/platinum/gold/silver/
      bronze), mapping documented in MEMORY.md
- [ ] Each round's 3 card slots roll tier first (existing odds table), then
      draw randomly from the combined player+captain pool at that tier —
      no separate captain-specific weighting constant
- [ ] No further captain cards appear once `G.captain` is set
- [ ] Round-13 fallback triggers correctly if no captain picked by round 13,
      showing exactly 3 low-tier captains
- [ ] USA hero-tier count meaningfully closer to EUR's (verify via the same
      Counter check used to find the original imbalance)
- [ ] 2024 and 2025 entries brought to ~18 each, estimated stats flagged
- [ ] No single venue descriptor exceeds ~40% usage across all venues
- [ ] course_type variety improved and verified against real-world accuracy
- [ ] putting_weight and consistency_weight added to every venue
- [ ] CLAUDE.md and MEMORY.md updated to reflect all decisions above
