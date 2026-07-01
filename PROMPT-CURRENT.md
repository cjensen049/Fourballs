# PROMPT-CURRENT.md — Talent/Chemistry Implementation + UI Polish + Doc Cleanup

This is the single active prompt for Fourballs right now. It replaces
PROMPT-PART1.md, PROMPT-PART2.md, PROMPT-ITERATION1.md,
fourballs\_chemistry\_overhaul\_prompt.md, and fourballs\_captain\_pool\_venue\_prompt.md,
all of which have been archived — they described earlier, superseded, or already-
completed designs and should not be read for context on this work.

Read CLAUDE.md, MEMORY.md, ERROR.md, and chemistry\_system\_spec.md in full before
starting. Work through the sections below in order — Section 0 is a verification
step that determines how much of Section 1 is already done; do not skip it.

\---

## 0\. Verify current state before changing anything

CLAUDE.md currently contains three flagged discrepancies against
chemistry\_system\_spec.md and the rest of its own content. Resolve these FIRST,
since they determine what Section 1 actually needs to build:

1. **Hero bonus fields.** `chemistry\_system\_spec.md` states `bonds`, `hero\_boost`,
and `hero\_bonus\_\*` have already been removed from `players.json`. CLAUDE.md's
"Hero Tier Rules" section still documents a live `hero\_bonus` object with keys
like `chemistry\_boost`, `singles\_loss\_ceiling`, `fatigue\_immune`. Grep
`players.json` for `hero\_bonus` to determine ground truth, then update
CLAUDE.md's Hero Tier Rules section to match reality (either confirm removal
and rewrite the section around the flat `talent\_scores.json` model, or note
that removal hasn't actually happened yet and this task includes doing it).
2. **Fatigue rule duplication.** CLAUDE.md has two different fatigue thresholds
("3+ team match appearances" vs. "appears in both foursomesPairs AND
fourballPairs"). Check `scoring-engine.js` for which one is actually
implemented, delete the other from CLAUDE.md, and confirm the UI label reads
"Fatigued" (not "(tired)" — this was supposed to be a global rename per an
earlier, now-archived prompt; verify it stuck).
3. **Win Probability Model factor 4.** Currently documented as inline
complementary-style-tag math. Once `computeChemistry()` exists (Section 1
below), this factor needs to source from it instead. Don't change this until
Section 1 is done — just be aware it's the reason Section 1 exists.

Log what you find for all three in MEMORY.md before proceeding, even if the
answer is "already correct as documented."

\---

## 1\. Talent score + chemistry system (see chemistry\_system\_spec.md for full detail)

Summary — full spec, edge cases, and rationale live in chemistry\_system\_spec.md;
this section is the checklist, that file is the source of truth if anything here
is ambiguous.

* \[ ] `talent\_scores.json` exists with the 5-tier flat lookup (hero:20,
platinum:15, gold:10, silver:7, bronze:3)
* \[ ] `cup\_results.json` exists mapping each Ryder Cup year to winning nationality
* \[ ] `computeChemistry(playerCardA, playerCardB, allRecordsForBothNames)` implemented
in scoring-engine.js, returning 0–20 (Pillar 1: stat complementarity 0–10,
Pillar 2: shared history 0–10, per the formulas in chemistry\_system\_spec.md
Section 3)
* \[ ] `getTalentScore(tier)` lookup implemented
* \[ ] Self-pairing guard: `computeChemistry` returns a sentinel (not a real score)
if both cards resolve to the same player name
* \[ ] Win Probability Model factor 4 (pairing chemistry) now sources from
`computeChemistry()` instead of the old inline style-tag math
* \[ ] Do NOT implement an in-match conversion formula for the 0–20 chemistry score
beyond wiring it into the existing factor-4 slot — that's explicitly deferred
per the spec, don't invent one

\---

## 2\. Mobile / visual polish

Salvaged from an earlier, now-archived chemistry prompt — this section is
independent of the chemistry logic above and can be done in either order.
This is also the starting point for the broader UI refresh: current card layout
is the old square (1:1) format and needs to move toward the taller trading-card
proportions below before further visual work builds on top of it.

### 2.1 Card art

* Replace empty-placeholder card art with a jersey-silhouette icon colored by
nationality (USA: navy/red, EUR: navy/gold — reuse existing --bg/--surface/
--gold/--green palette, no new hex values without reason)
* Differentiate cards visually via existing tier color treatment (keep as-is) plus
a subtle "era" filter: pre-2010 cards slightly desaturated/vintage, 2018+ cards
full saturation. CSS filter on the art layer, not separate art assets.
* Change card aspect ratio from `1/1` to \~0.62:1 (width:height), matching standard
trading-card proportions. Audit every card-rendering context, not just the main
draft view — `.player-card`, `.pick-cards-row` children, `.ai-reveal-cards`
children, `.picks-grid` children.

### 2.2 Chemistry indicator sizing

* Increase `.chem-dot` / `.card-chem-dot` minimum size to 14–16px (from 8–9px)
* Pair color with a shape distinction (not color alone) for colorblind
accessibility — e.g. filled circle = strong, half-filled = moderate, outlined
= neutral. CSS border-style or inset shape, not new icon assets.
* Replace any `title`-attribute tooltips for chemistry info (don't work on touch)
with inline visible text or a tap-to-expand panel

### 2.3 Responsive draft grid

* Add a `max-width: 480px` breakpoint for `.pick-cards-row` and similar 3-up
grids: switch to a stacked single-column layout below this breakpoint
* Test at 375px, 390px, 428px widths

### 2.4 Text sizing

* Raise any `font-size` under 13px that conveys information (not purely
decorative) to a 13px floor — avoids mobile auto-zoom-on-focus, improves
legibility

### 2.5 Tier color contrast

* Hero (`#38bdf8`) and Platinum (`#c084fc`) read too close in perceived
brightness against the dark background. Shift Hero toward a warm color
(test `#ff6b4a`–`#ff8c5a` range) so it reads as clearly rarer/distinct.
Update `TIER\_COLORS` and all hardcoded references — CLAUDE.md's "UI
Principles" section lists the current hex values, update it once this lands.

\---

## 3\. Documentation updates (do this last, once 1 and 2 are actually done)

* Fold the finished chemistry\_system\_spec.md implementation details into
CLAUDE.md's "Chemistry System" section, replacing the verification-note
version with the confirmed final state. Archive chemistry\_system\_spec.md once
this is done — CLAUDE.md becomes the sole source of truth again.
* Update CLAUDE.md's tier color hex values if Section 2.5 changed them
* Add a MEMORY.md decision entry summarizing what changed in this pass, per the
existing Session Protocol
* Log any new issues found along the way in ERROR.md using its existing format

\---

## Acceptance checklist

* \[ ] Section 0 verification complete and logged in MEMORY.md
* \[ ] All Section 1 checklist items complete
* \[ ] scoring-engine.test.js passes with no regressions
* \[ ] Card aspect ratio updated in every rendering context, not just main draft view
* \[ ] Mobile breakpoint tested at 375/390/428px
* \[ ] No tooltip-only (title attribute) chemistry info remains
* \[ ] CLAUDE.md fully accurate again, no outstanding ⚠️ verification notes
* \[ ] chemistry\_system\_spec.md archived once folded into CLAUDE.md
* \[ ] MEMORY.md and ERROR.md updated

