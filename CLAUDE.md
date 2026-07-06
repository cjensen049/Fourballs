# CLAUDE.md — Ryder Cup Draft Game

## Session Protocol

* After every response, provide a brief recap of what changed and save it to memory.
* Auto-compact conversation when context reaches 75%

## Project Overview

A browser-based golf draft game where the user builds a 12-man Ryder Cup team by drafting
players based on tier weighting, then simulates a full 28-point Ryder Cup match against an
AI-assembled opposing team. The game features venue selection, captain picks, pairing chemistry,
and a dramatic session-by-session results reveal.

## Tech Stack

* Vanilla HTML/CSS/JS in a single file (index.html)
* No backend, no API calls during gameplay
* All game data is hardcoded in /data/ JSON files
* Scoring logic lives exclusively in /src/scoring-engine.js
* Game state persisted in localStorage (key: `fourballs_state_v9`)

## Project Structure

```
/data/
  players.json          # \~682 player-year entries (USA/EUR, 1999–2025). Most Ryder
                         # Cup years (1999, 2002-2025) now carry full real rosters via
                         # `made\_team` (true/false — actually made that year's real
                         # team vs. was in contention/strong tour year but didn't);
                         # null on entries where this hasn't been researched. Shown in
                         # UI as a small "✓ Made the Team" badge (playerCardHTML /
                         # playerPickedHTML) — used by the chemistry system's teammate
                         # and champion connection categories (see Chemistry System below).
  talent\_scores.json    # tier -> flat baseline talent score (hero:20, platinum:15,
                         # gold:10, silver:7, bronze:3). Looked up at calculation time
                         # from a card's tier, not stored on the player record.
  cup\_results.json      # Ryder Cup year -> winning nationality. Used by the chemistry
                         # system's champion connection category.
  venues.json           # 19 Ryder Cup venues (real history, pre-2000 included for
                         # flavor) with hidden course tags — 7 hidden\_tags dimensions:
                         # power/accuracy/short\_game/wind/pressure/putting/consistency
  captains.json         # Captains with bonus structures. `tier` (hero/platinum/gold/
                         # silver/bronze) drives the in-draft pool — intentionally
                         # bottom-heavy (hero:2, platinum:3, gold:7, silver:15,
                         # bronze:9 of 36) since most real captains were unremarkable
                         # picks. `prestige` (legendary/hero/standard) is the older
                         # 3-value scale, now display-only (card color treatment) —
                         # no longer drives any draw logic.
/src/
  scoring-engine.js     # Pure JS module, no UI dependencies
  scoring-engine.test.js
/index.html             # Game entry point — single-file vanilla HTML/CSS/JS
CLAUDE.md               # This file
MEMORY.md               # Running design decisions and state
ERROR.md                # Known issues and resolutions
chemistry\_system\_spec.md # ACTIVE implementation spec for the talent/chemistry rework —
                         # treat this as authoritative for chemistry logic until it's
                         # fully implemented, at which point fold its contents into this
                         # file and archive it.
```

## Chemistry System

* Talent score: flat per-tier value from `talent\_scores.json`, looked up at calc time.
* Pairwise chemistry: `computeChemistry(p1, p2, _, cupResults)` → 0–3 points per pair.
  Four additive connection categories (each worth 1 pt):
  * **Teammates** — both cards share the same `year` and `nationality`, both `made\_team: true`
  * **Champion** — only with teammates; that shared year was a win (`cup\_results.json[year] === nationality`)
  * **Same season, not teammates** — same year + nationality, but at least one has `made\_team: false`
  * **Complementary styles** — dominant style tags form one of: Power+ShortGame, Power+Accurate,
    Power+Clutch, Accurate+Clutch, ShortGame+Clutch. Dominant tag derived from `stat\_*` fields
    (same logic as ATTR\_META chips), not `style\_*` fields.
* **Player pod score**: `computePlayerChemScore(player, podmates, _, cupResults)` sums pairwise
  pts across up to 3 podmates. Tier: green ≥4 (+11 reward), yellow 2–3 (+6), red 0–1 (+0).
* **Captain score**: `computeCaptainChemScore(captain, drafted, _, venue, cupResults)` — venue
  match +1, +1 per drafted player on a real roster the captain led, +1 per cup win by that captain.
  Tier: green ≥8 (+15), yellow 5–7 (+10), red 0–4 (+0).
* **Player-captain connection**: `computePlayerCaptainConnection(player, captain, cupResults)` → 0–2 pts.
  +1 if player's year is in captain.years, same nationality, made_team: true. +1 if that year was a win.
  Captains have no stat_* fields so complementary styles do NOT apply to player-captain pairs.
* **Team chem score**: `computeTeamChemScore(pods, captain, venue, cupResults)` → total number.
  Sums (points + reward) for every player across all pods, plus captain's (points + reward). Used
  for the live Chem counter and end-of-game Performance Rating.
* In-match effect of rewards not yet wired — do not invent a conversion formula without design input.
* `chemistry_system_v2.md` is the authoritative spec; `chemistry_system_spec.md` is archived.

## Pod Builder (Squad Hub — active during Draft screen)

* The flat 4×3 slot grid is replaced by a captain hub + 3 pods of 4 player slots each.
* Layout: Pod A above, captain hub (gold dashed border) center, Pods B and C below-left and below-right.
* `G.pods = [[null,null,null,null],[null,null,null,null],[null,null,null,null]]` — 3 pods × 4 slots.
  All 12 player slots live here; `G.picks` is still the authoritative flat pick list.
* **Pick interaction is drag-only**: tray cards (`.tray-card[data-pid]` or `.tray-card[data-cid]`)
  are dragged to pod slots or the captain hub. Click-to-pick no longer exists for the pod builder
  (Advanced Mode still uses `handlePick()` but that is a separate flow not yet updated).
* Pointer Events API (`pointerdown` / `pointermove` / `pointerup`) handles mouse and touch.
  Ghost element (`.drag-ghost`) follows cursor; source opacity dims to 0.3 during drag.
* Drop rules: player cards → pod slots only; captain cards → captain hub only. Invalid drops snap back.
* Dropping on a filled slot displaces the existing player to the first empty pod slot.
* After draft ends, rearranging pods (dragging pod-to-pod) is free until "Submit to Pairings".
* **Submit to Pairings** button appears only when `G.picks.length === 12 && G.captain !== null`.
  Calls `submitToPairings()` which runs `computePairingOptions(G.picks, 4, G.pods)` — pods param
  threads a +5 bonus into `_scoreMatching` for same-pod pairs, nudging podmates into real matches.
* SVG connection lines overlay the hub area (`.conn-svg`, `position:absolute; inset:0`):
  — Between filled players in the same pod: green (chem ≥2), yellow (1), red (0)
  — Captain to each pod group: gold dashed (not a chemistry read, kept visually distinct)
* Each filled node shows a chem dot (green/yellow/red) based on current pod pairwise points.
* After round 13, `advanceFromAIReveal()` returns to the draft screen (pod builder view) instead of
  jumping to review — the "Arrange Your Squad →" button brings user back to rearrange before submit.
* Cross-pod chemistry is intentionally absent — no lines or scoring across pod boundaries.
* Advanced Mode is NOT updated for pods yet — deferred.

## Game Flow (in order)

1. Landing page — "Start New Game" button
2. Nationality selection — user picks USA or EUR
3. Venue spinner — animated slot-machine draw from venues.json, reveals selected venue
4. Draft — 13 rounds: 12 player slots + 1 dedicated captain slot, captain selection
happens inside the draft itself (see Captain Pick below) — there is no standalone
pre-draft captain screen. Picks are made by dragging tray cards to pod slots or the
captain hub (Pod Builder — see below).
5. After each pick, a "Next Selection" prompt (inline on the draft/pod builder screen,
not a separate screen) shows the user's pick and the opponent's pick, then advances
to the next round on click
6. After round 13: returns to draft/pod builder screen — user may rearrange pods freely,
then clicks "Submit to Pairings" to advance
7. Auto-assigned pairings → Review screen
8. Simulation → Results

## Venue

* One venue drawn randomly at game start from venues.json, revealed via animated spinner
* Course style tags are hidden from the user but drive probability calculations
* Venue is shown with user-friendly descriptors (e.g. "Power Course", "Links Test")
mapped from hidden tags — do not expose raw tag values
* Course profile bar displayed during draft: shows venue name,
user\_descriptors, and the top-3 demand chips (from courseProfileHTML's DEMAND\_META,
still Power / Accurate / Short Game / Consistent / Clutch — 5 labels only) using the
same colors as player style tag chips
* `hidden\_tags` has 7 dimensions: power\_weight, accuracy\_weight, short\_game\_weight,
wind\_factor, pressure\_factor, putting\_weight, consistency\_weight. The last two are
additive (added for venue-archetype mapping support) and are NOT yet wired into any
UI — `DEMAND\_META`'s "Consistent" chip still reuses `wind\_factor` as a proxy (a
pre-existing simplification from before these fields existed, since the widget only
has 5 slots for 5 player style tags). Wiring the real `consistency\_weight`/
`putting\_weight` fields into the UI is intentionally left to whichever future pass
needs them — do not assume they're displayed anywhere yet.
* `user\_descriptors` are derived from a venue's hidden\_tags relative to the rest of the
pool (top dimensions where the venue ranks in roughly the top 40% across all venues,
not just its own internal top-3 — pressure\_factor in particular is high for nearly
every venue, so naive per-venue ranking degenerates into "High Pressure Venue"
everywhere). No single descriptor should exceed \~40% of the venue pool. `course\_type`
(links/heathland) contributes "Links Test"/"Heathland Challenge" directly rather than
through a numeric dimension; "Birdie Fest"/"Home Crowd Advantage" are hand-assigned
narrative tags, not derived from any tag score.

## Captain Pick (Inside the Draft)

* No standalone captain screen. The draft is 13 rounds: 12 player slots + 1 dedicated
captain slot. Taking a captain does NOT consume a player slot — the draft always
runs the full 13 rounds regardless of which round the captain is taken in.
* Each round's 3 card slots roll a tier first (same graduated odds table as below),
then draw at random from players AND captains combined at that tier (filtered to
the user's nationality) — a captain is just another card that can show up in any
tier bucket, not a separately-weighted system.
* Captains have a `tier` field (hero/platinum/gold/silver/bronze) on the same scale
as players, used only for this combined draw. Their original 3-value classification
(legendary/hero/standard) is preserved as `prestige` and still drives the captain
card's color treatment.
* Once the human takes a captain, `G.captain` is set and captains stop appearing in
the human's future rounds for that draft.
* If round 13 is reached with no captain taken (all 12 player slots full), it is
overridden to show exactly 3 low-tier (silver/bronze) captains only — guarantees a
captain by draft's end; waiting costs a weaker captain, never a player slot.
* Captains shown as round options are NOT added to the permanent "seen" exclusion
list the way players are (see uniqueness rule below) — the captain pool is small
(4–9 per tier per side) and would be exhausted before round 13 if treated the same.
* Each captain card shows name, year(s) captained, and full bonus breakdown.
Bonuses are clearly communicated — no hidden captain effects.
* Captain affinity with specific players is applied during simulation.
* **The AI drafts its own captain through this exact same mechanism, in parallel.**
There is no separate one-shot AI captain draw. Every human round triggers one AI
action via `generateRoundCardsFor(opp(side), aiPicks, aiCaptain, aiSeenNames)` —
same combined player+captain tier draw, same low-tier-only forced fallback once
the AI has 12 players and still no captain. AI picks a captain mid-draft if a
hero/platinum-tier captain shows up alongside lower-tier players (see
`aiBestFromCards` Rule 1.5); otherwise it keeps prioritizing hero players and
chemistry the way it always has. The AI stops acting once it has 12 players AND
a captain — it may finish before or after the human's round 13.

## Draft (13 Rounds: 12 Players + 1 Captain)

* Each round: 3 cards shown — usually players, occasionally a captain (see above) —
drawn from ANY year (1999–2025) based on tier weighting
* No year is announced — the year is displayed on each player card
* Player uniqueness: once a player (by name) appears in any round's options, they cannot
appear again in a subsequent round — prevents repeat Montgomeries / Johnsons.
Captains are exempt from this rule (see Captain Pick above).
* Cards shown match the user's chosen nationality (USA or EUR)
* After user picks, the AI drafts its own pick in parallel (opposing nationality, same
tier weighting) and the draft screen shows a "Next Selection" prompt naming both picks
before advancing — there is no separate full-screen reveal of the AI's other options.
AI drafts exactly 12 players total — once it reaches 12, it stops drafting even if the
human's draft continues (e.g. the human's round-13 captain-only round).
* AI pick priority: (1) always draft a hero if one is available, (2) otherwise optimize
for pairing chemistry potential with its existing picks, (3) fallback to highest composite
score when no existing picks (round 1 only)
* Each of the 3 draft cards rolls its tier independently (per-card tier rolling). Tier
odds are keyed off how many players the human has picked so far, not the round number,
so taking the captain early never skips or repeats a row in the table below.

### Player Cards (Draft)

* Show: player name (bold), year badge, tier color indicator (border + background tint),
style tags (1–2 chips derived from stats)
* Do NOT show: composite score, world ranking, win count, hero bonus label (removed with hero_bonus schema)
* Style tags derived from stats: Power (driving distance), Accurate (DA+GIR avg),
Short Game (scrambling), Consistent (min DA/scrambling), Clutch (pressure\_index)
* Top tag always shown; 2nd tag shown only if within 5 pts of highest
* Hero glow effect if Hero tier

### Player Cards (Team Board / Review)

* Picked cards should be larger and more prominent than draft selection cards
* Show: name, year, tier color, style tags

### Tier Weighting Per Pick

Hero probability is graduated: 5% before any hero is drafted, 1% after one hero is drafted,
0% after two heroes are drafted. Remaining probability distributed across tiers:

|Pick|Platinum|Gold|Silver|Bronze|Hero|
|-|-|-|-|-|-|
|1–2|80%|15%|0%|0%|5%|
|3–4|15%|65%|15%|0%|5%|
|5–6|5%|40%|45%|5%|5%|
|7–8|0%|15%|55%|25%|5%|
|9–10|0%|0%|25%|70%|5%|
|11–12|0%|0%|5%|90%|5%|

When heroProb drops (1% or 0%), the total weight is recomputed dynamically so non-hero
tier probabilities are naturally weighted higher without manual adjustment.

### Hero Tier Rules

* Hero cards can appear in ANY round (graduated probability above)
* Heroes are fan favorites, cult legends, Ryder Cup icons
* Hero advantage is entirely tier-based: `getTalentScore('hero') = 20` (vs platinum's 15,
  gold's 10, etc.) — looked up from `talent_scores.json` at match-calculation time.
  There are no per-player `hero_bonus` objects, `home_boost`, `fatigue_immune`, or any
  other per-player bonus fields — those were removed when the schema migrated to flat
  `stat_*` / `style_*` fields.
* Heroes are NOT labeled as Hero tier to the user — tier color badge only

## Pairing Assignment

* Once the draft completes (12 player slots + captain slot both filled, always round
13), pairings are auto-assigned using resolveAIPairings logic
* User sees the Review screen with auto-generated foursomes pairs and fourball pairs
* "Re-randomize Pairings" button in review screen header shuffles and regenerates
* No manual pairing screen — auto-assignment only

### Pairing Structure

* 4 foursomes pairs (8 player slots)
* 4 fourball pairs (8 player slots)
* A player CAN appear in both foursomes and fourball (overlap allowed)
* All 12 drafted players play singles
* Simulation button and Re-randomize both accessible from top of review screen (no scroll required)

### Session Structure (4 unique pair sets)

Each format generates two independent sets of 4 pairs — no pair repeats between AM and PM.

* Foursomes AM: best 8 by composite, paired 1+2, 3+4, 5+6, 7+8
* Foursomes PM: top 4 cross-paired with bottom 4: 1+9, 2+10, 3+11, 4+12
* Fourball AM: best 8 by aggression+birdie, same structure
* Fourball PM: same cross-pair structure
Total: 16 unique team matches. Players 1–4 (best composite) appear in both AM and PM = 4 team matches = fatigued.

### Fatigue

* Players with **4+ team match appearances** across all 4 sessions are fatigued in singles.
  (Implemented as `>= 4` in `scoring-engine.js` `simulateFullEvent` — single rule, no ambiguity.)
* They receive a −2% win / +2% loss adjustment on their singles match probability
* In singles results, a `(f)` marker appears next to their name via `.rc-tired` CSS class;
  the review screen warning uses the word "Fatigued" in prose. No `fatigue_immune` exemption
  exists — that field was removed with the hero_bonus schema.

## Scoring Structure

* Foursomes: 8 points (4 pairings × 2 sessions: AM and PM)
* Fourball: 8 points (4 pairings × 2 sessions: AM and PM)
* Singles: 12 points (all 12 players, 1 match each)
* Total: 28 points — first to 14.5 wins

### Pairing Logic (Auto-assigned)

* Foursomes pairs: ranked by composite score — best players paired together
* Fourball pairs: ranked by aggression + birdie\_rate
* Same pairs play both AM and PM within their format
* AI pairings follow same logic

### Win Probability Model

Base per match: Win 45% / Halve 10% / Loss 45%

Adjustment factors (applied in order, total cap ±25%):

1. Talent delta: per 10-point composite gap → ±3–5%
2. Venue fit: player style vs course hidden tags → ±5%
3. Format fit: player's `fit_*` score for assigned format → ±3%
4. *(intentionally absent)* — reserved for pairing chemistry. `computeChemistry()` (0–3
   pairwise) and pod reward scores exist and drive pairing ranking / display, but their
   conversion into a win-probability delta is not yet designed. Do not invent a formula.
5. Captain modifier: flat format-specific bonus from captain.json
6. Ryder Cup history: prior match play record → ±2–4%
7. Home advantage: +5% foursomes / +1% fourball / +1% singles when venue.location
   matches player nationality.

## Results Presentation

* Friday AM: Reveal all 4 Foursomes morning matches 1 by 1
* Friday PM: Reveal all 4 Foursomes afternoon matches 1 by 1
* Saturday AM: Reveal all 4 Fourball morning matches 1 by 1
* Saturday PM: Reveal all 4 Fourball afternoon matches 1 by 1
* Sunday Singles: Reveal one match at a time, in order
* Running score shown after each session
* Singles matchups shown as they resolve — W / H / L appended inline, no list recreation
* "Reveal Next" button advances through singles; all team-format sessions appear in full

## UI Principles

* Dark background, rich green accents — premium golf feel, not generic
* Card-based layout with smooth transitions
* Tier shown as color badge only — no text labels on tier
* Tier colors: platinum=#c084fc, gold=#c9a84c, silver=#94a3b8, bronze=#a0522d, hero=#38bdf8
* Player card background tinted with 10% tier color; border tinted 30% tier color
* Score ticker always visible during draft
* Mobile-first but desktop playable
* "Continue" / action buttons at TOP of screens — no scrolling required to advance
* Shareable result card generated at end

## What Not To Do

* Do not expose hidden venue tags or hero boost values in the UI
* Do not show composite score on draft selection cards
* Do not simulate results before user locks in captain
* Do not allow slot reassignment after simulation begins
* Do not hardcode probability outcomes — always run through scoring-engine.js
* Do not skip the data validation step before building UI
* Do not re-introduce a manual pairing screen — auto-assign only

