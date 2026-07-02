# Chemistry System v2 (Pods and Connections) — supersedes chemistry_system_spec.md

## Context

This replaces the two-pillar computeChemistry model (stat complementarity plus a
capped 0 to 10 shared history score). That model flattened everything into a
narrow band, two total strangers and two players with eight real shared Ryder
Cups apart scored within a point of each other, because shared history capped
out at just four shared years. This version removes the cap entirely and
rewards topology: how many of a player's podmates they are meaningfully
connected to, not just how strong any single connection is.

This is a full replacement, not an addition. The old Pillar 1 (stat
complementarity via average stat divergence divided by 4) and Pillar 2 (shared
history capped at 10) are both gone. Once this is implemented, fold the
finished state into CLAUDE.md and archive chemistry_system_spec.md.

Depends on the pod based team builder screen (captain hub plus three pods of
four players, described separately). The scoring functions below can be built
and unit tested independently of that UI, but the live in-draft chemistry
display cannot show anything meaningful until pod assignment exists. Build the
math first, wire the UI once pods land.

---

## 1. Player connection categories

Computed pairwise, for every relationship a player has with a podmate. A pod
holds 4 players, so every player has up to 3 pairwise relationships to sum
across. Categories are additive within a single relationship, a pair can
trigger more than one at once.

| Category | Points | Condition |
|---|---|---|
| Ryder Cup teammates | 1 | Both cards share the same year and nationality, and both have `made_team: true` |
| Ryder Cup champion | 1 | Only applies alongside "teammates" above. The shared year was also a win for that nationality (`cup_results.json[year] === nationality`) |
| Same season, not teammates | 1 | Same year, same nationality, but at least one of the two has `made_team: false` on that year (a snub or near miss, e.g. a player left off the actual roster that year) |
| Complementary styles | 1 | The two players' dominant style tags form one of the pairings listed below |

"Teammates" and "champion" only co-occur when both are true for the same
shared year, giving a two point base for a real winning-team pairing. "Same
season, not teammates" and "teammates" are mutually exclusive for a given
shared year, since they depend on opposite made_team values. Complementary
styles is independent and can stack on top of either.

Maximum for a single relationship: 3 points (teammates 1, champion 1,
complementary styles 1).

### Complementary style pairings

Dominant style tag is whichever of the five derived tags (Power, Accurate,
Short Game, Consistent, Clutch) is highest for that player, same tags already
shown as chips on the card today. No new computation needed, reuse the
existing derivation.

- Power + Short Game
- Accurate + Clutch
- Short Game + Clutch
- Power + Accurate
- Power + Clutch

Order does not matter (Power+Accurate = Accurate+Power). If both players share
the same dominant tag, no complementary point.

### Worked example (validates the 2012 case that anchored this whole redesign)

Four EUR players from the 2012 (winning) Ryder Cup team, all four `made_team:
true`, in one pod together. For any pair among them:
- Teammates: 1
- Champion: 1 (2012 was a EUR win)
- Complementary styles: 0 or 1, depends on the specific pair's style tags

Baseline per relationship (ignoring style): 2 points. Three relationships per
player: 6 points minimum, comfortably clearing the 4 point green threshold
even before any complementary style bonus.

---

## 2. Player dot thresholds

Sum a player's points across all of their pod relationships (up to 3), then
look up the tier:

| Tier | Threshold | Reward |
|---|---|---|
| Green | 4 or more | +11 |
| Yellow | 2 to 3 | +6 |
| Red | 0 to 1 | +0 |

This reward is added once per player (not per relationship) to the team's
total chemistry score.

---

## 3. Captain

The captain feeds the same chemistry point pool as players, this is not a
separate multiplier system layered on top. A captain aligned with their squad
raises the team's total chemistry score directly, same mechanism as a
well built pod, just scored against a different, larger set of relationships
(potentially all 12 drafted players, not just 3 podmates) and against a
different category list.

### Captain connection categories

| Category | Points | Condition |
|---|---|---|
| Captained at the selected venue | 1 | The randomly drawn venue for this game matches a year/venue this captain actually led |
| Captained a drafted player | 1 each | For every drafted player who was actually on this captain's real Ryder Cup roster in a year they captained. Stacks, can trigger once per drafted player, not capped at one |
| Won a Ryder Cup | 1 each | Once per year this captain's team actually won, not a flat one time flag. A captain who won twice gets 2 points here, not 1. Chosen deliberately: multi-win captains are rare and already sit in the hero tier, they should feel like it |

### Captain dot thresholds

Higher bar than players, since the captain's relationship pool is potentially
4x larger (up to 12 players instead of 3 podmates).

| Tier | Threshold | Reward |
|---|---|---|
| Green | 8 or more | +15 |
| Yellow | 5 to 7 | +10 |
| Red | 0 to 4 | +0 |

---

## 4. What this replaces

- `computeChemistry(p1, p2, allPlayers, cupResults)` in scoring-engine.js is
  fully rewritten around this point model rather than the old
  complementarity plus capped history formula.
- The style complementarity math (average stat divergence divided by 4) is
  gone. Style now contributes through the discrete complementary pairings
  table in Section 1, reusing the existing derived style tag chips instead of
  raw stat fields.
- `talent_scores.json` is untouched, talent score is a separate, already
  working part of the barometer and this change does not touch it.

---

## 5. Explicitly deferred to v2 (do not build now)

Cross pod connections. Whether a player's chemistry with someone in a
different pod should count for anything (even partially, even just as a
visual "you're leaving value on the table" indicator) is an open question.
Punted intentionally. Do not add any cross pod scoring or lines in this pass.

---

## 6. Open items for the dev

- Confirm `made_team: false` rows exist broadly enough in the current dataset
  for the "same season, not teammates" category to actually fire in practice,
  not just for the handful of documented snubs (Keegan Bradley 2023/2025 was
  the example used to design this, worth spot checking coverage isn't limited
  to just that one player).
- The in-draft chemistry chip UI needs redesigning around pods, this doc only
  covers the scoring math. Do not attempt to wire the chip to this model until
  pod assignment exists in the UI.
