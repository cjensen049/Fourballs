# PROMPT-ITERATION1.md — Playtesting Fixes \& Feature Updates

This prompt covers the first major iteration pass after initial build.
Apply all changes below. Read CLAUDE.md, MEMORY.md, and ERROR.md before starting.
Update MEMORY.md and ERROR.md as changes are made.

\---

## 1\. Terminology Change: "Tired" → "Fatigued"

Find and replace every instance of "tired" (and "Tired") used to describe
player match load status with "fatigued" / "Fatigued".
This applies to UI labels, tooltips, any status indicators, and code comments.
Do not change unrelated uses of the word "tired" in flavor text if any exist.

\---

## 2\. Pairing Logic Overhaul — Distribute Load Across All Sessions

### Problem

Current logic locks the same 4 foursomes players into both AM and PM sessions,
causing certain players (especially F1) to play 3 team matches plus a singles.
In reality, even anchor players sit one session. The current model creates
unrealistic fatigue accumulation and limits strategic depth.

### New Pairing Rules

**General principle:** Platinum players may play all 4 team matches, gold players cannot play all 4. Silver and Bronze may play up to 2. Hero players should act as Gold.

**Fatigue indicator:**
If a player plays all 4 team matches, display a "Fatigued" tag on their card
in the team sheet view. Fatigued players receive a -3% adjustment to their
singles match probability (they are tired going into Sunday).
Show a tooltip explaining this when the user hovers/taps the tag.

**AI pairing logic:** AI follows the same rules. Optimal pairing selection within
the same constraints.

\---

## 3\. Player Card UI Redesign

### Selection Cards (during draft — the 3 options shown each round)

Make these smaller. They should feel like compact tiles, not large cards.
The focus during draft is scanning and deciding quickly, not reading detail.

**Show on selection cards:**

* Player name (bold, prominent)
* Year badge
* Tier color indicator (border + tile shading)
* Three key attribute bars or icons (e.g. Power, Accuracy, Clutch) — visual only
* Hero glow effect if Hero tier (subtle blue shimmer)
* Chemistry preview indicators (see Section 5)

**Remove from selection cards:**

* World ranking
* Number of wins
* Do not add these back. Stats are conveyed through attribute bars only.

### Already-Picked Cards (the growing team board)

Make these larger and more prominent than the selection cards.
Your assembled team should feel like it's building into something significant.
Reference the Griddy screenshot provided — picked cards are the focal point,
selection options are secondary.

**Show on picked cards:**

* Player name
* Year
* Tier color indicator
* Attribute summary (compact or emoji)
* Chemistry links to other picked players (see Section 5)



\---

## 4\. Chemistry Formula Overhaul

### Philosophy

Chemistry should feel discoverable and reward golf knowledge.
It should never be fully explained upfront — players learn it through play.
The formula runs silently but its effects are visible through chemistry indicators.

### Chemistry Score Components

Calculate a chemistry score between any two players (or between a player and captain).
Score is 0–100. Used in pairing chemistry calculation and as a modifier on
individual match probabilities for players who play together.

**Component 1: Same Year (+15)**
Both players are from the same year entry (e.g. Tiger 2006 + Phil 2006).
They were on tour together at the peak of their powers simultaneously.

**Component 2: Historical Ryder Cup Teammates (+20)**
Players who actually appeared on the same Ryder Cup team in any year.
Store a `ryder\_cup\_years` array on each player entry listing years they played.
If two players share any year in their ryder\_cup\_years arrays, apply this boost.
Example: Molinari + Fleetwood (2018 "Moliwood" partnership) gets this + a named
partnership bonus (see Component 6).

**Component 3: Playing Style Compatibility (+0 to +15)**
Derived from style\_tags. Foursomes rewards complementary styles (one accurate,
one powerful). Fourball rewards at least one highly aggressive player.
Calculate compatibility score from style\_tag deltas — reward balance in foursomes,
reward peak aggression in fourball.

**Component 4: Same Nationality Bonus — European Specific (+8)**
Apply only to EUR players. European Ryder Cup teams historically build stronger
regional bonds (Spanish contingent, British contingent, Scandinavian contingent, etc.).
USA players do not receive this bonus — their team dynamic is more individual.

**Component 5: Real-Life Friendship / Tour Bond (+12)**
Hardcode known real-life close relationships in a `bonds` array on each player entry.
These are well-documented friendships and partnerships:

* Justin Thomas + Jordan Spieth
* Patrick Cantlay + Xander Schauffele
* Rory McIlroy + Shane Lowry
* Tommy Fleetwood + Francesco Molinari ("Moliwood")
* Sergio Garcia + Jon Rahm (Spanish bond)
* Bubba Watson + Webb Simpson
* Lee Westwood + Paul Casey
* Henrik Stenson + Justin Rose
Add others that are well documented. Each player's `bonds` array contains
the IDs of players they share a bond with (e.g. "jordan\_spieth" in JT's bonds array).
If two players in a pairing share a bond, apply the +12 bonus.

**Component 6: Named Partnership / Legacy Pairing (+15)**
Certain pairings are legendary and get an additional named bonus on top of others.
Hardcode these in a `legendary\_pairings` array in a separate data structure:

* Molinari + Fleetwood → "Moliwood" (+15, displayed as a named bonus in UI)
* Garcia + Rahm → "La Furia Roja" (+15)
* Cantlay + Schauffele → "The Locals" (+12)
* Thomas + Spieth → "College Boys" (+12)
* Rose + Stenson → "The Viking and The Rose" (+10)
* Poulter + Rose → "English Lions" (+8)
Add others that are well established. Named pairings should surface in the UI
when they occur — show the pairing name as a small label on the chemistry indicator.

**Component 7: Venue Connection (+10)**
If a player has a known connection to the venue (won there, played it on tour,
their home country hosts the venue), apply a bonus.
Store a `venue\_connections` array on player entries listing venue IDs.
Example: European players get a connection bonus at European venues generally (+5),
specific players who won at a venue get the full +10.
Jon Rahm at Valderamma (European venue, Spanish pride) = +10.
Ian Poulter at any European venue = +8 (home support).

**Component 8: Captain Affinity (+0 to +20)**
Each captain has a `player\_affinities` array listing player IDs who get an
enhanced bonus under their captaincy (beyond the flat captain bonus).
Examples:

* Seve Ballesteros: Sergio Garcia +20, Jon Rahm +15, Jose Maria Olazabal +18
* Paul Azinger: Keegan Bradley +15, Phil Mickelson +10, Boo Weekly +10
* Paul McGinley: Poulter +15, McDowell +12
* Montgomerie: Westwood +12, Kaymer +10

When a player with a captain affinity is on your team and that captain is selected,
that player's individual match probabilities receive an additional boost
(separate from the flat captain format bonus).
Display this in the UI as "\[Captain Name]'s Pick" on the player's card.

### Chemistry Score Cap

Total chemistry score between any two players: 0–100.
If components sum above 100, cap at 100.
Chemistry score feeds into calculatePairingChemistry() as the primary input.

### Chemistry Display During Draft (Post-Pick Reveal)

Chemistry is revealed AFTER a player is picked, not before.
Do not show chemistry indicators on the 3 selection cards while the user is deciding.
The discovery of chemistry is a reward for the pick, not a tip for which pick to make.

**Reveal flow:**

1. User picks a player from the 3 options
2. The picked card animates into their team board
3. As it lands, chemistry connections light up between the new pick and any
already-picked players who share chemistry with them
4. A brief toast or inline label appears naming the connection:
e.g. "Ryder Cup Teammates" / "College Boys" / "Spanish Bond"
5. The connection lines or glows persist on the team board for the remainder of the draft

**Chemistry indicators on the team board (post-pick):**

* Strong chemistry (score > 65): green connection line or glow between cards
* Moderate chemistry (35–65): amber indicator
* No notable chemistry (< 35): red indicator shown
* Named/legendary pairings: show the pairing name as a small label on the connection
* On tap/hover of a connection: show the breakdown of which components contributed
(e.g. "Ryder Cup teammates +20 • Real-life bond +12 • Same year +15")
but do not show numeric scores — show reason text only

**Tutorial step 4 update (see Section 5):**
Update the tutorial copy to reflect post-pick chemistry reveal:
"After each pick, watch for chemistry connections lighting up on your team board.
These bonds will win you points when it matters most."

### Chemistry Display on Team Sheet

* Draw visible connection lines between players who have strong chemistry (> 65)
* Label legendary pairings by name when they appear in the same slot group
* Color-code by chemistry strength
* Chemistry lines update live if user reorganizes slots (pairing chemistry
is format-specific, so moving a player from Foursomes to Fourball may
change which connections are highlighted)

\---

## 5\. Tutorial for First-Time Players

### Trigger

Show automatically on first visit (check localStorage for `tutorial\_seen` flag).
Can be dismissed at any point. Once dismissed, set `tutorial\_seen: true` in localStorage.
Add a "?" button persistent in the corner of every screen that re-opens the tutorial.

### Format

Overlay tooltip sequence, not a separate screen. Steps highlight the relevant UI
element while the rest of the screen is dimmed.

**Tutorial steps:**

Step 1 — Pick Your Side
"Choose USA or Europe. Your opponent AI will take the other side and
draft simultaneously from the opposing team."
Highlight: side selection buttons

Step 2 — Venue Reveal
"Your venue is drawn randomly. The course shape is hidden, but it influences
every match. Pay attention to the descriptors — they tell you what kind of
team to build."
Highlight: venue descriptors / user\_descriptors pills

Step 3 — Captain Selection
"Pick your captain before the draft begins. Their bonus applies across the
whole event — and certain captains have special affinity with specific players.
Choose wisely before you know who you'll draft."
Highlight: captain card and bonus breakdown

Step 4 — Draft Cards
"Each round, a year is randomly selected and three players are offered.
Earlier picks tend to feature elite talent — but a Hero can appear any round."
Highlight: the 3 selection cards, tier color dot

Step 5 — Chemistry Reveal
"After each pick, watch for chemistry connections lighting up on your team board.
Ryder Cup teammates, real-life bonds, legendary pairings — they all add up.
The more you build chemistry, the better your chances."
Highlight: chemistry connection lines appearing on the team board after a pick

Step 6 — Pairings
"Once your squad is set, pairings are generated automatically based on chemistry
and course fit. Not happy with them? Shuffle until you find a lineup you trust."
Highlight: auto-generated pairings and the re-randomize button

Step 7 — Simulate
"Lock in your pairings and simulate the full Ryder Cup.
Results play out session by session — Friday, Saturday, Sunday."
Highlight: Simulate button

Each step has a "Next" button and an "X" to dismiss entirely.
Progress dots shown at bottom of tooltip.

\---

## 6\. Probability Model Fix — Zero-Sum Adjustments

### Problem

Current model adds bonuses to one side independently, which means both teams
can accumulate boosts simultaneously, causing total adjustments to exceed 100%
or produce nonsensical win probabilities.

### Fix: Zero-Sum Probability Model

All adjustments are zero-sum. A "5% boost" means +2.5% to the user's win
probability and -2.5% to the opponent's win probability simultaneously.
The perceived swing is 5 points but neither side inflates independently.

**Implementation:**

Base: User win% = 45, Halve% = 10, AI win% = 45.

For each adjustment factor, calculate a raw boost value (positive = favors user).
Split it symmetrically: apply +half to user win%, -half to AI win%.
The halve% remains fixed at 10 throughout.
After all adjustments: userWin + aiWin must always equal 90.

Cap the total net delta at ±15 percentage points.
This means user win% moves between 30% and 60% at most (45 ± 15).
A ±15 delta represents a 30-point total swing which is decisive without
making any match feel predetermined.

**Adjustment factors — stated as full swing values, applied as half each side:**

1. Talent delta:
fullSwing = (myCompositeScore - opponentCompositeScore) / 10 \* 3
Max contribution: ±9 full swing (±4.5 each side)
2. Venue fit delta:
fullSwing = (myVenueFit - opponentVenueFit) / 100 \* 6
Max contribution: ±6 full swing (±3 each side)
3. Format fit delta:
fullSwing = (myFormatFit - opponentFormatFit) / 100 \* 4
Max contribution: ±4 full swing (±2 each side)
4. Pairing chemistry delta (team matches only):
fullSwing = (myChemistry - opponentChemistry) / 100 \* 6
Max contribution: ±6 full swing (±3 each side)
5. Captain modifier delta:
fullSwing = myCaptainFormatBoost - aiCaptainFormatBoost
(each captain's boost is defined in captains.json per format)
Max contribution: capped at ±4 full swing
6. Ryder Cup history delta:
fullSwing = (myNormalizedRecord - opponentNormalizedRecord) \* 3
Max contribution: ±3 full swing (±1.5 each side)
7. Fatigue penalty (singles only):
If user's player is Fatigued: fullSwing = -4 (opponent gains 2, user loses 2)
If opponent's player is Fatigued: fullSwing = +4
Only applies to singles matches.
8. Hero boost and captain affinity: applied to composite scores before
talent delta is calculated. They flow through factor 1 naturally,
not as separate line items.

**Applying the split:**

```
totalFullSwing = sum of all fullSwing values
totalFullSwing = clamp(totalFullSwing, -15, +15)  // ±15 cap on net delta
delta = totalFullSwing / 2
userWin = 45 + delta
aiWin = 45 - delta
halve = 10
// Floor/ceiling: userWin and aiWin must each be between 5 and 80
```

**Final validation before passing to simulateMatch():**

* userWin + aiWin + halve === 100 (always)
* userWin >= 5 and userWin <= 80
* aiWin >= 5 and aiWin <= 80

Update calculateMatchProbability() in scoring-engine.js to implement this model.
Update scoring-engine.test.js to validate the zero-sum constraint across
50 different input combinations.

\---

