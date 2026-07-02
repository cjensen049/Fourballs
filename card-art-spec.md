# Card Art Spec — Draft Cards (addendum to PROMPT-CURRENT.md Section 2.1)

This expands PROMPT-CURRENT.md Section 2.1 with the concrete card-art treatment
worked out in design. Slot this into Section 2 of the prompt (or keep as a
referenced file).

**Base icons are sourced from Tabler Icons** (open source, MIT-licensed, free
for commercial use, no attribution required — https://tabler.io/icons), not
hand-drawn. This replaces an earlier hand-authored version of this spec: the
jacket and shirt icons below are Tabler's `jacket` and `shirt` icons respectively,
chosen specifically because they share the same 24×24 grid, stroke convention,
and line weight — that shared origin is what makes the two card types look like
they belong to the same visual system instead of two different art styles. Trophy
crest and buttons are custom additions layered on top, everything else is stock.

---

## Overview

Two card-art shapes, chosen by card type:
- **Player card → Tabler `shirt` icon**
- **Captain card → Tabler `jacket` icon** (arms hanging at the sides, collar V,
  side pockets — all from the base icon, not custom-drawn)

Both are inline SVG, `stroke="currentColor"`-style (color set explicitly per
render rather than inherited, see below). Color is driven by two independent
inputs:
- **Outline stroke = tier color** (see mapping below)
- **Buttons + crest = gold** (`#c9a84c`) on every captain card regardless of tier
  — these are the only custom-drawn elements, layered on top of the stock jacket
  path

> Open decision for the dev: whether to encode NATIONALITY (USA vs EUR) into
> these icons at all. Current mockups use a single tier-colored outline with no
> fill (transparent body) because these draft cards are already filtered to a
> single nationality per draft, so nationality is implicit. If you want
> nationality legible on the card itself, that'd mean adding a fill color, which
> these icons don't currently have (stroke-only, `fill="none"`). Left as
> stroke-only for now.

---

## Tier color mapping (outline stroke)

Reuse the existing `TIER_COLORS` values (per CLAUDE.md UI Principles), applied as
the SVG stroke:

| Tier     | Stroke hex |
|----------|-----------|
| hero     | `#5ec8e8` (ice-blue) |
| platinum | `#c084fc` |
| gold     | `#c9a84c` |
| silver   | `#94a3b8` |
| bronze   | `#a0522d` |

**`TIER_COLORS.hero` changes system-wide to `#5ec8e8`**, not just for this icon.
The old value (`#38bdf8`) is retired everywhere, badges, borders, chips, so
there's a single hero-blue across the whole UI rather than two near-identical
values that read as inconsistent once both are on screen. Update CLAUDE.md's UI
Principles hex reference to match.

---

## Sizing

- Draft selection cards: render both icons at ~80px wide, `viewBox="0 0 24 24"`
  (native Tabler grid — no scaling artifacts since we're not stretching a
  larger custom viewBox down).
- Team board / review cards (larger per CLAUDE.md): render at ~100–110px.
- Stroke widths are intentionally thinner than Tabler's default 2px, since
  these render smaller than a typical icon-in-a-list use case. Final values
  below (already reduced twice from initial testing — thin, not thick):
  jacket `stroke-width="0.85"`, shirt `stroke-width="1.1"`. If either still
  reads too heavy once live in the actual card size/background, that's the
  first value to touch.
- Icon sits centered, above the player name. Year + flag/trophy row sits BELOW
  the name (not above the icon).

---

## Player card icon (Tabler `shirt`)

Source: https://tabler.io/icons/icon/shirt — used as-is, no custom edits beyond
color and stroke-width.

```html
<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="TIER_COLOR"
     stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M15 4l6 2v5h-3v8a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-8h-3v-5l6 -2a3 3 0 0 0 6 0" />
</svg>
```

Replace `TIER_COLOR` with the mapped stroke value at render time (see table
above). No fill, no added elements — this icon needs nothing layered on top.

---

## Captain card icon (Tabler `jacket` + custom buttons/crest)

Base source: https://tabler.io/icons/icon/jacket, used as-is for the body,
collar-V, and side pockets — arms-down silhouette, no custom-drawn shape.
Buttons and the trophy crest are custom additions layered on top in the same
24×24 coordinate space, positioned to sit on the jacket's front panel and
left breast.

```html
<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="TIER_COLOR"
     stroke-width="0.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <!-- Tabler jacket icon, unmodified -->
  <path d="M16 3l-4 5l-4 -5" />
  <path d="M12 19a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2v-8.172a2 2 0 0 1 .586 -1.414l.828 -.828a2 2 0 0 0 .586 -1.414v-2.172a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v2.172a2 2 0 0 0 .586 1.414l.828 .828a2 2 0 0 1 .586 1.414v8.172a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2" />
  <path d="M20 13h-3a1 1 0 0 0 -1 1v2a1 1 0 0 0 1 1h3" />
  <path d="M4 17h3a1 1 0 0 0 1 -1v-2a1 1 0 0 0 -1 -1h-3" />
  <!-- custom: 2 gold front buttons -->
  <circle cx="12" cy="12" r="0.5" fill="#c9a84c" stroke="none"/>
  <circle cx="12" cy="16" r="0.5" fill="#c9a84c" stroke="none"/>
  <!-- custom: gold trophy crest, left breast -->
  <circle cx="15.3" cy="8.6" r="1.6" fill="none" stroke="#c9a84c" stroke-width="0.55"/>
  <path d="M14.6 8.1h1.4v0.4c0 0.6 -0.5 0.7 -0.7 0.7c-0.2 0 -0.7 -0.1 -0.7 -0.7z" fill="#c9a84c" stroke="none"/>
</svg>
```

Replace `TIER_COLOR` with the mapped stroke value at render time — this also
recolors the buttons/crest ring outlines if they inherit stroke, but their
fills stay gold regardless (set explicitly, not inherited).

Button count is fixed at 2 for all captains regardless of tier (simplified
from an earlier 2-vs-3 variant — not worth the added complexity for a
cosmetic detail). If a 3-button variant is wanted later, add a third circle
at `cy="14"` and shift the existing two to `cy="11"` / `cy="17"`.

---

## Card type distinction (captain vs player)

Beyond the shape difference, captain cards also carry:
- A `CAPTAIN` pill (gold, with an award icon) next to the tier pill in the header
- A dashed border on the card (vs solid for players) — reinforces "different card
  type" before the icon is even parsed
- "Captained {year}" instead of a plain year, and no flag/trophy row (captains
  don't carry player made_team/won data)

---

## Flag / trophy indicators (player cards only)

Sits in the row below the player name, next to the year. Both are PER-CARD-YEAR
lookups — NOT aggregated across a player's whole career. A player who appeared in
4 Cups and won 2 shows the trophy lit ONLY on the specific year-entries their team
won.

- **Flag icon** (`ti-flag-3`): lit (ice-blue `#7dd3fc`) when this card-year's
  `made_team === true`; hidden/omitted otherwise.
- **Trophy icon** (`ti-trophy`): lit gold (`#c9a84c`) when this card-year's
  nationality won that year (look up `cup_results.json[year] === card.nationality`);
  dim gray (`#3a4a3a`) when they made the team but did not win.

This maps directly onto chemistry Pillar 2 (shared history + won-together bonus)
from chemistry_system_spec.md — same `made_team` and `cup_results.json` inputs,
just surfaced visually on the card.

**Explanation mechanism: tap-to-expand, reusing PROMPT-CURRENT.md Section 2.2's
existing pattern.** Don't build a second tooltip system for this. Section 2.2
already specifies tap-to-expand (not `title`, not inline text) for chemistry
indicators for the same touch-target reason — extend that exact component/pattern
to cover flag and trophy explanations too, so there's one "tap a small icon to
learn what it means" convention across the whole app rather than one per feature.
Inline text next to the icons (e.g. "2002 ✓") was considered and rejected — it
clutters a row that already holds the year plus two icons.

**Compact team board (`.picks-grid`, ~44px card height): skip flag/trophy AND
the shirt/jacket icon entirely.** At that height neither icon is legible, and
the compact board's job is fast tracking (name + tier color), not display —
forcing icons in there fights the card's purpose. Tier color border/background
already carries the "what did I pick" signal at that size. Full icon treatment
is for the draft selection cards and the larger team-sheet review cards only.

---

## Era desaturation (from PROMPT-CURRENT.md Section 2.1)

The card art (icon + card) gets the gradual year-based saturation ramp already
specified: linear-interpolate a CSS `filter` (saturation/grayscale) across the
full 1999–2025 range — oldest = desaturated floor, 2018+ = full saturation, no
hard cutoffs at 2010/2018. Apply to the art layer, not the text.

---

## Acceptance additions
- [ ] Player cards render the Tabler `shirt` icon with tier-colored stroke, no fill
- [ ] Captain cards render the Tabler `jacket` icon (unmodified base shape) with
      2 gold buttons and gold trophy crest layered on top, dashed border, CAPTAIN pill
- [ ] Both icons share the same stroke-linecap/linejoin style and comparable
      visual weight — no more stylistic mismatch between the two card types
- [ ] `TIER_COLORS.hero` updated to `#5ec8e8` system-wide (badges, borders,
      chips, icon stroke) — `#38bdf8` fully retired, not left in some contexts
- [ ] Flag/trophy indicators are per-card-year lookups, not career aggregates
- [ ] Trophy lit only when cup_results.json[year] === card.nationality
- [ ] Flag/trophy explanations use the same tap-to-expand component as chemistry
      indicators (Section 2.2) — not a separate tooltip system, not inline text
- [ ] Compact team board (`.picks-grid`) cards render with NO shirt/jacket icon
      and NO flag/trophy row — name + tier color only
- [ ] Era saturation ramp applied to the art layer
