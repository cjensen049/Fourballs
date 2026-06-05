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
- Vanilla HTML/CSS/JS in a single file, OR React with component separation
- No backend, no API calls during gameplay
- All game data is hardcoded in /data/ JSON files
- Scoring logic lives exclusively in /src/scoring-engine.js
- Game state persisted in localStorage

## Project Structure
```
/data/
  players.json          # All player-year entries, both nationalities
  venues.json           # All Ryder Cup venues with hidden course tags
  captains.json         # Legendary captains with bonus structures
/src/
  scoring-engine.js     # Pure JS module, no UI dependencies
  scoring-engine.test.js
/index.html             # Game entry point (or /src/ if React)
CLAUDE.md               # This file
MEMORY.md               # Running design decisions and state
ERROR.md                # Known issues and resolutions
```

## Build Order — Do Not Skip Steps
1. Build and validate /data/ files first (Part 1)
2. Run scoring-engine tests before touching UI
3. Build UI screens in order: Landing → Nationality → Venue Spinner → Draft → Team Sheet → Simulation → Results
4. Wire game logic last, after UI shells are confirmed working

## Core Game Rules

### Landing Flow
1. Landing page: "Start New Game" button only
2. Nationality selection: user picks USA or EUR
3. Venue spinner: animated random draw from venues.json, reveals selected venue
4. Draft begins

### Venue
- One venue drawn randomly at game start from venues.json, revealed via animated spinner
- Course style tags are hidden from the user but drive probability calculations
- Venue is shown with user-friendly descriptors (e.g. "Power Course", "Links Test")
  mapped from hidden tags — do not expose raw tag values

### Draft (Rounds 1–12)
- Each round: 3 player cards shown, drawn from ANY year (2000–2023) based on tier weighting
- No year is announced — the year is displayed on each player card instead
- Player uniqueness: once a player (by name) appears in any round's options, they cannot
  appear again in a subsequent round — prevents repeat Montgomeries / Johnsons
- Players shown match the user's chosen nationality (USA or EUR)
- After user picks, show AI round: display the 3 options the AI saw (opposing nationality,
  same round tier weighting) and highlight which player the AI selected
- AI sees 3 random options and picks the highest composite stat score

### Tier Weighting Per Pick
Every round has a 5% fixed chance of producing a Hero card regardless of pick number.
Remaining probability distributed across tiers as follows:

| Pick  | Platinum | Gold | Silver | Bronze | Hero |
|-------|----------|------|--------|--------|------|
| 1–2   | 80%      | 15%  | 0%     | 0%     | 5%   |
| 3–4   | 15%      | 65%  | 15%    | 0%     | 5%   |
| 5–6   | 0%       | 45%  | 45%    | 5%     | 5%   |
| 7–8   | 0%       | 15%  | 55%    | 25%    | 5%   |
| 9–10  | 0%       | 0%   | 25%    | 70%    | 5%   |
| 11–12 | 0%       | 0%   | 5%     | 90%    | 5%   |

### Hero Tier Rules
- Hero cards can appear in ANY round at 5% probability
- Heroes are fan favorites, cult legends, Ryder Cup icons (e.g. Ian Poulter, Sergio Garcia,
  Keegan Bradley, Paul McGinley era players)
- Heroes receive a hidden 5–10% stat boost applied before all probability calculations
- The boost is silent — users see base stats, not boosted values
- Heroes are NOT labeled as Hero tier to the user — tier badges show color only

### Slot Assignment
- Below the player selector, three persistent grids of 4 slots: Foursomes | Fourball | Wildcard
- Drafted players appear in an unassigned pool; drag and drop into any grid slot
- Players can be dragged between grids and reordered within a grid at any time before simulation
- Final slots must be filled before captain pick: 4 Foursomes / 4 Fourball / 4 Wildcards
- Each player card in the grid shows name, year, tier color badge, and composite score

### Captain Pick (Round 13)
- 3 random captains shown from the user's chosen nationality
- Each captain card shows name, year captained, and full bonus breakdown
- Bonuses are clearly communicated — no hidden captain effects
- Captain is locked in after selection

## Scoring Structure
- Foursomes: 8 points (4 pairings × 2 sessions: AM and PM)
- Fourball: 8 points (4 pairings × 2 sessions: AM and PM)
- Singles: 12 points (all 12 players, 1 match each)
- Total: 28 points — first to 14.5 wins

### Pairing Logic (Foursomes + Fourball)
Players ordered F1 (best) through F4 (protected pick):
- Match 1: F1 + F2
- Match 2: F1 + F3
- Match 3: F3 + F4
- Match 4: F2 + F3

Each pairing plays AM and PM = 8 total match slots per format.
F1 plays 3 matches. F4 plays 1.

### Win Probability Model
Base per match: Win 45% / Halve 10% / Loss 45%

Adjustment factors (applied in order, total cap ±25%):
1. Talent delta: per 10-point composite gap → ±3–5%
2. Venue fit: player style vs course hidden tags → ±5%
3. Format fit: player's format_fit score for assigned format → ±3%
4. Pairing chemistry: complementary style tags in team matches → ±4%
5. Captain modifier: flat format-specific bonus from captain.json
6. Ryder Cup history: prior match play record → ±2–4%

Hero boost (5–10%) is applied to base stats before this pipeline runs.

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
- Score ticker always visible during draft
- Mobile-first but desktop playable
- Shareable result card generated at end

## What Not To Do
- Do not expose hidden venue tags or hero boost values in the UI
- Tier shown as colored text badge (Platinum/Gold/Silver/Bronze/Hero) — colors: platinum=#c084fc, gold=#c9a84c, silver=#94a3b8, bronze=#a0522d, hero=#38bdf8
- Do not simulate results before user locks in captain
- Do not allow slot reassignment after simulation begins
- Do not hardcode probability outcomes — always run through scoring-engine.js
- Do not skip the data validation step before building UI
