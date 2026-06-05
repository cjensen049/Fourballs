# CLAUDE.md — Ryder Cup Draft Game

## Session Protocol
- After every response, provide a brief recap of what changed and save it to memory.
- Auto-compact conversation when context reaches 95%.

## Project Overview
A browser-based golf draft game where the user builds a 12-man Ryder Cup team by drafting
players based on tier weighting, then simulates a full 28-point Ryder Cup match against an
AI-assembled opposing team. The game features venue selection, captain picks, pairing chemistry,
and a dramatic session-by-session results reveal.

## Tech Stack
- Vanilla HTML/CSS/JS in a single file (index.html)
- No backend, no API calls during gameplay
- All game data is hardcoded in /data/ JSON files
- Scoring logic lives exclusively in /src/scoring-engine.js
- Game state persisted in localStorage (key: `fourballs_state_v3`)

## Project Structure
```
/data/
  players.json          # ~407 player-year entries (204 USA / 203 EUR, 2000–2025)
  venues.json           # All Ryder Cup venues with hidden course tags
  captains.json         # Legendary captains with bonus structures
/src/
  scoring-engine.js     # Pure JS module, no UI dependencies
  scoring-engine.test.js
/index.html             # Game entry point — single-file vanilla HTML/CSS/JS
CLAUDE.md               # This file
MEMORY.md               # Running design decisions and state
ERROR.md                # Known issues and resolutions
```

## Game Flow (in order)
1. Landing page — "Start New Game" button
2. Nationality selection — user picks USA or EUR
3. Venue spinner — animated slot-machine draw from venues.json, reveals selected venue
4. Captain selection — pick captain before you know who you'll draft (see Captain Pick below)
5. Draft — 12 rounds of player selection
6. AI reveal after each round — see what the AI saw and who they picked
7. Auto-assigned pairings → Review screen
8. Simulation → Results

## Venue
- One venue drawn randomly at game start from venues.json, revealed via animated spinner
- Course style tags are hidden from the user but drive probability calculations
- Venue is shown with user-friendly descriptors (e.g. "Power Course", "Links Test")
  mapped from hidden tags — do not expose raw tag values
- Course profile bar displayed during draft and AI reveal: shows venue name,
  user_descriptors, and 5 demand bars (Power / Accurate / Short Game / Consistent / Clutch)
  using the same colors as player style tag chips

## Captain Pick (Before Draft)
- After venue reveal, user picks their captain from 3 random captains (matching chosen nationality)
- Each captain card shows name, year captained, and full bonus breakdown
- Bonuses are clearly communicated — no hidden captain effects
- Captain is locked in before draft begins
- Captain affinity with specific players is applied during simulation

## Draft (Rounds 1–12)
- Each round: 3 player cards shown, drawn from ANY year (2000–2025) based on tier weighting
- No year is announced — the year is displayed on each player card
- Player uniqueness: once a player (by name) appears in any round's options, they cannot
  appear again in a subsequent round — prevents repeat Montgomeries / Johnsons
- Players shown match the user's chosen nationality (USA or EUR)
- After user picks, show AI round: display the 3 options the AI saw (opposing nationality,
  same round tier weighting) and highlight which player the AI selected
- AI pick priority: (1) always draft a hero if one is available, (2) otherwise optimize
  for pairing chemistry potential with its existing picks, (3) fallback to highest composite
  score when no existing picks (round 1 only)
- Each of the 3 draft cards rolls its tier independently (per-card tier rolling)

### Player Cards (Draft)
- Show: player name (bold), year badge, tier color indicator (border + background tint),
  style tags (1–2 chips derived from stats), hero bonus label if applicable
- Do NOT show: composite score, world ranking, win count
- Style tags derived from stats: Power (driving distance), Accurate (DA+GIR avg),
  Short Game (scrambling), Consistent (min DA/scrambling), Clutch (pressure_index)
- Top tag always shown; 2nd tag shown only if within 5 pts of highest
- Hero glow effect if Hero tier

### Player Cards (Team Board / Review)
- Picked cards should be larger and more prominent than draft selection cards
- Show: name, year, tier color, style tags, hero bonus label

### Tier Weighting Per Pick
Hero probability is graduated: 5% before any hero is drafted, 1% after one hero is drafted,
0% after two heroes are drafted. Remaining probability distributed across tiers:

| Pick  | Platinum | Gold | Silver | Bronze | Hero |
|-------|----------|------|--------|--------|------|
| 1–2   | 80%      | 15%  | 0%     | 0%     | 5%   |
| 3–4   | 15%      | 65%  | 15%    | 0%     | 5%   |
| 5–6   | 5%       | 40%  | 45%    | 5%     | 5%   |
| 7–8   | 0%       | 15%  | 55%    | 25%    | 5%   |
| 9–10  | 0%       | 0%   | 25%    | 70%    | 5%   |
| 11–12 | 0%       | 0%   | 5%     | 90%    | 5%   |

When heroProb drops (1% or 0%), the total weight is recomputed dynamically so non-hero
tier probabilities are naturally weighted higher without manual adjustment.

### Hero Tier Rules
- Hero cards can appear in ANY round (graduated probability above)
- Heroes are fan favorites, cult legends, Ryder Cup icons
- Each hero has a player-specific `hero_bonus` field with one or more optional keys:
  - `home_boost` / `away_boost`: flat % bonus based on venue location vs nationality
  - `chemistry_boost`: applied when paired with any partner in team formats
  - `singles_loss_ceiling`: caps loss probability after normalization
  - `foursomes_boost` / `fourball_boost` / `all_formats_boost`: format-specific flat bonus
  - `fatigue_immune`: player skips the singles fatigue penalty even if overplayed
- Hero boosts are silent — users see base stats, not boosted values
- Heroes are NOT labeled as Hero tier to the user — tier color badge only

## Pairing Assignment
- After round 12, pairings are auto-assigned using resolveAIPairings logic
- User sees the Review screen with auto-generated foursomes pairs and fourball pairs
- "Re-randomize Pairings" button in review screen header shuffles and regenerates
- No manual pairing screen — auto-assignment only

### Pairing Structure
- 4 foursomes pairs (8 player slots)
- 4 fourball pairs (8 player slots)
- A player CAN appear in both foursomes and fourball (overlap allowed)
- All 12 drafted players play singles
- Simulation button and Re-randomize both accessible from top of review screen (no scroll required)

### Session Structure (4 unique pair sets)
Each format generates two independent sets of 4 pairs — no pair repeats between AM and PM.
- Foursomes AM: best 8 by composite, paired 1+2, 3+4, 5+6, 7+8
- Foursomes PM: top 4 cross-paired with bottom 4: 1+9, 2+10, 3+11, 4+12
- Fourball AM: best 8 by aggression+birdie, same structure
- Fourball PM: same cross-pair structure
Total: 16 unique team matches. Players 1–4 (best composite) appear in both AM and PM = 4 team matches = fatigued.

### Fatigue (updated threshold)
Players with 3+ team match appearances across all 4 sessions are fatigued.
They receive -2% win / +2% loss in singles. `fatigue_immune` hero bonus bypasses this.
With the 4-session structure, the top 4 players naturally appear in 4 sessions (all 4 team matches).

### Fatigue
- Players appearing in BOTH foursomesPairs AND fourballPairs are considered overplayed
- They receive a −2% win / +2% loss adjustment on their singles match probability
- A "(tired)" label appears next to their name in the singles results reveal
- Exception: players with `fatigue_immune: true` in their hero_bonus skip this penalty
  (e.g. Francesco Molinari)

## Scoring Structure
- Foursomes: 8 points (4 pairings × 2 sessions: AM and PM)
- Fourball: 8 points (4 pairings × 2 sessions: AM and PM)
- Singles: 12 points (all 12 players, 1 match each)
- Total: 28 points — first to 14.5 wins

### Pairing Logic (Auto-assigned)
- Foursomes pairs: ranked by composite score — best players paired together
- Fourball pairs: ranked by aggression + birdie_rate
- Same pairs play both AM and PM within their format
- AI pairings follow same logic

### Win Probability Model
Base per match: Win 45% / Halve 10% / Loss 45%

Adjustment factors (applied in order, total cap ±25%):
1. Talent delta: per 10-point composite gap → ±3–5%
2. Venue fit: player style vs course hidden tags → ±5%
3. Format fit: player's format_fit score for assigned format → ±3%
4. Pairing chemistry: complementary style tags in team matches → ±4%
5. Captain modifier: flat format-specific bonus from captain.json
6. Ryder Cup history: prior match play record → ±2–4%
7. Home advantage: +5% foursomes / +1% fourball / +1% singles when venue.location
   matches player nationality. Hero home/away bonuses stack on top.

Hero boost and player-specific hero_bonus fields are applied to composite scores
and as flat adjustments before this pipeline runs.

## Results Presentation
- Friday AM: Reveal all 4 Foursomes morning matches at once
- Friday PM: Reveal all 4 Foursomes afternoon matches at once
- Saturday AM: Reveal all 4 Fourball morning matches at once
- Saturday PM: Reveal all 4 Fourball afternoon matches at once
- Sunday Singles: Reveal one match at a time, in order
- Running score shown after each session
- Singles matchups shown as they resolve — W / H / L appended inline, no list recreation
- "Reveal Next" button advances through singles; all team-format sessions appear in full

## UI Principles
- Dark background, rich green accents — premium golf feel, not generic
- Card-based layout with smooth transitions
- Tier shown as color badge only — no text labels on tier
- Tier colors: platinum=#c084fc, gold=#c9a84c, silver=#94a3b8, bronze=#a0522d, hero=#38bdf8
- Player card background tinted with 10% tier color; border tinted 30% tier color
- Score ticker always visible during draft
- Mobile-first but desktop playable
- "Continue" / action buttons at TOP of screens — no scrolling required to advance
- Shareable result card generated at end

## What Not To Do
- Do not expose hidden venue tags or hero boost values in the UI
- Do not show composite score on draft selection cards
- Do not simulate results before user locks in captain
- Do not allow slot reassignment after simulation begins
- Do not hardcode probability outcomes — always run through scoring-engine.js
- Do not skip the data validation step before building UI
- Do not re-introduce a manual pairing screen — auto-assign only
