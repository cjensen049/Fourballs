# ERROR.md — Known Issues & Resolutions

This file tracks bugs, edge cases, and broken behavior encountered during development.
Log every error here with its resolution or current status.
Claude Code should check this file before attempting any fix — the issue may already
be documented with a known solution.

---

## How To Log an Error

```
### [ERROR-###] Short description
- **Status:** Open | Resolved | Wont Fix | Deferred
- **Discovered:** [phase or session when found]
- **Symptom:** What the user or developer observes
- **Root Cause:** What actually caused it (fill in when known)
- **Resolution:** What fixed it (fill in when resolved)
- **Affected Files:** Which files were involved
```

---

## Active Errors

None yet. Project not yet in build phase.

---

## Resolved Errors

None yet.

---

## Known Edge Cases to Watch For

These are not yet bugs but known risky areas that need careful handling:

### Year Randomization
- **Risk:** Random year selector may struggle to enforce "no back-to-back" and
  "max 3 appearances" simultaneously in late picks if the available year pool is
  exhausted by those constraints.
- **Mitigation:** Build a weighted year pool at game start, pre-validate that
  12 picks can always be satisfied. If pool gets too constrained in late rounds,
  relax the back-to-back rule before relaxing the max-3 cap.
- **Status:** Not yet encountered — flag if year selector errors appear.

### Tier Pool Exhaustion
- **Risk:** Some years may have very few Silver or Bronze players on one nationality,
  causing the tier weighting to fail if a Bronze pick is required but no Bronze
  players exist for that year.
- **Mitigation:** Implement a fallback — if target tier has no players available
  for the selected year, slide up one tier. Log when this happens.
- **Status:** Not yet encountered — depends on final players.json completeness.

### Probability Sum Validation
- **Risk:** Adjustment factors applied cumulatively may cause win + halve + loss
  to not sum to exactly 100% due to floating point arithmetic.
- **Mitigation:** After all adjustments, normalize the three values so they always
  sum to 100 before passing to simulateMatch().
- **Status:** Not yet encountered — implement normalization defensively from the start.

### Hero Boost Double Application
- **Risk:** Hero stat boost could be applied twice if a player object is reused
  across multiple calculations without resetting to base stats.
- **Mitigation:** Apply hero boost to a copy of the player object, never mutate
  the source data. Store base stats in players.json, apply boost at calculation time.
- **Status:** Not yet encountered — design defensively.

### AI Draft Same Player as User
- **Risk:** AI drafts from opposite nationality so this should not occur, but if
  nationality tags are incorrectly assigned in players.json, AI could surface
  the same player the user sees.
- **Mitigation:** Validate all players.json entries have correct nationality field.
  Add a runtime check that AI pool and user pool never share player IDs in the same round.
- **Status:** Data validation step in Part 1 should catch this.

### localStorage State Corruption
- **Risk:** If the user refreshes mid-simulation, localStorage may contain a partial
  results state that causes the results screen to render incorrectly.
- **Mitigation:** Store game phase explicitly in localStorage
  (draft | captain | simulation_complete). On load, check phase and route accordingly.
  If phase is mid-simulation, restart simulation from saved team data rather than
  trying to resume from partial results.
- **Status:** Not yet encountered — design state management carefully upfront.

### Captain Bonus Overflow
- **Risk:** Captain flat probability bonuses applied on top of other adjustments
  could push total adjustment beyond the ±25% cap if not included in the cap calculation.
- **Mitigation:** Captain bonus must be included in the cumulative adjustment total
  that is checked against the ±25% cap, not applied after the cap.
- **Status:** Not yet encountered — ensure scoring-engine.js applies cap after all
  factors including captain.

### Singles Order
- **Risk:** If singles order is auto-assigned and a very weak player ends up in the
  anchor position (match 12), the dramatic final match reveal may feel anticlimactic.
- **Mitigation:** Auto-sort singles by composite score descending, then distribute
  as real captains do — best players in matches 1, 6, and 12 (top, middle, anchor).
  Do not simply line them up strongest to weakest.
- **Status:** Design decision pending — see MEMORY.md open questions.

---

## Debugging Reference

### Scoring Engine
Test all four exported functions before wiring to UI:
```
calculateVenueFit(player, venue)         → should return 0–100
calculatePairingChemistry(p1, p2, fmt)   → should return 0–100
calculateMatchProbability(...)           → win + halve + loss must === 100
simulateMatch(probability)               → must return "win" | "halve" | "loss"
```

### Data Validation Checks
Run before Part 2 build:
- Every year 2000–2023 has at least 8 USA and 8 EUR player entries
- Every player entry has all required fields (id, name, year, nationality, tier, stats,
  style_tags, format_fit, ryder_cup_record, flavor_text)
- All tier values are one of: platinum | gold | silver | bronze | hero
- All nationality values are one of: USA | EUR
- No duplicate player IDs
- All venue entries have hidden_tags with all five fields
- All captain entries have complete bonus objects
- Probability functions sum to 100 across 1000 simulated runs (distribution check)
