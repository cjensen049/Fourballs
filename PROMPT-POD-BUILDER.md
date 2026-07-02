# PROMPT-POD-BUILDER.md — Team Builder Screen (Captain Hub + Pods) and Drag and Drop

This is the UI and interaction layer for the chemistry v2 system. Read
chemistry-system-v2.md and card-art-spec.md in full before starting, this
prompt assumes both are already implemented and builds the visual layer on
top of them. Do not attempt this prompt before chemistry-system-v2.md's
scoring functions exist and are tested, the screen described here has nothing
meaningful to render without them.

This replaces the current flat "YOUR SQUAD" grid (the 4 column by 3 row
numbered slot layout shown at the top of the draft screen today) entirely.
The round by round choose one of three draft flow at the bottom of the screen
is unchanged, only the squad display above it changes.

---

## 1. Layout

Captain sits in the center of the squad area, not at the top. Three pods of
four player slots each surround the captain: one pod above, one pod below
and to the left, one pod below and to the right. The captain node is
slightly larger than the player nodes, reinforcing its role as the anchor
without needing a separate label to explain it.

Each pod slot is empty (dashed placeholder circle, tier neutral color) until
a player is placed there. The captain hub is similarly an empty dashed
placeholder until a captain is placed, since captain selection can happen in
any round 1 through 13, not only round 13. Reuse the existing "No Captain
Selected" state language for this placeholder.

Card art in each slot reuses the polo icon from card-art-spec.md at a reduced
size appropriate to this denser layout (roughly 40px, smaller than the 80px
draft selection card version, this is a squad overview, not a selection
screen). Captain hub uses the blazer icon, sized up modestly relative to the
player nodes per the sizing note above.

---

## 2. Connection lines

Drawn between every pair of filled nodes within the same pod (up to 6 lines
per fully filled pod), plus one line from the captain hub down to each pod
(3 lines total, only once a captain is selected). Do not draw lines to or
from empty slots.

Colors, matching the tier system already established:
- Green: this pair's connection points place them at or above the pod
  relationship contribution needed for a green dot outcome, see
  chemistry-system-v2.md Section 2 for the underlying math. The line color is
  a per relationship read, the dot at the end of the draft is a per player
  summed read, these are related but not the same number, do not conflate
  them when implementing.
- Yellow: moderate connection.
- Red: no meaningful connection.
- Gold (captain to pod lines only): this is the force multiplier
  relationship, not a player to player chemistry read, keep it visually
  distinct from the green and yellow player lines so it is never mistaken
  for a strong or weak chemistry line.

Each filled node also carries its own dot indicator (green, yellow, or red)
once all of its pod relationships are known, per the per player threshold
table in chemistry-system-v2.md Section 2. A pod with only 2 of 4 slots
filled can still show a partial dot for each filled player, based on however
many relationships currently exist, this will change as more players join
the pod, that is expected and fine, do not hide the dot just because the pod
is not yet full.

---

## 3. Drag and drop interaction

The pick action itself is a drag, not a tap to select followed by a separate
placement step. When a round presents its 3 cards, the player drags the
chosen card directly from the tray to the slot they want it in. A player
card can only be dropped on a pod slot. A captain card can only be dropped
on the captain hub. Dragging a card toward an invalid target (a player card
toward the captain hub, or a captain card toward a pod slot) should reject
the drop, either by disabling those targets visually during the drag or by
snapping the card back to the tray if released there.

Dropping onto an already filled slot swaps the incoming card with whatever
was already there, the displaced card returns to an open slot rather than
being lost.

After a card has been placed, whether just now or earlier in the draft, it
remains freely draggable to any other valid slot at any point, including
after the draft itself ends, up until pairings are submitted. This is the
same swap behavior as above, just not tied to the moment of picking.

A "Submit to Pairings" button is present once all 12 player slots and the
captain slot are filled. Before that point, the button is disabled or
hidden, matching the existing pattern where the review screen is only
reachable once the draft is complete.

Dragging must work on both desktop (mouse drag) and mobile (touch drag),
this game is mobile first per CLAUDE.md, do not ship a desktop only
interaction.

---

## 4. Header during the build, and the final score at the end

The trophy grade badge idea (Bronze/Silver/Gold squad, shown live during the
build) is on hold. It needed invented tier thresholds with no real anchor,
and doesn't fit as cleanly as a number that is already fully real.

During the build, the header above the captain and pods area shows Talent
and Chem as plain running numbers, same as before, just without a grade
badge attached to them.

At the end of the match simulation, once all 28 points have been resolved,
show a single combined final score: Talent plus Chem plus the actual number
of Cup points won that game (the player's final point total out of 28, not a
multiplier, not a differential against the opponent, just the real points
they won). This is the "how good was this Ryder Cup performance" number,
and every part of it is already computed elsewhere in the app, nothing new
needs to be invented to produce it.

> Open item: exact placement of this number on the results screen (its own
> card, folded into the existing shareable result card, somewhere else) is
> not yet decided. Flag this for a follow up prompt once the results screen
> work is scoped, this prompt is scope limited to the build screen itself.

---

## 5. Pairing generation changes

The actual Foursomes and Fourball pairing generation (generateFoursomePairings
and generateFourballPairings in scoring-engine.js) should now weight toward
keeping podmates together when generating real match pairings, rather than
only sorting by composite score as today. A well built pod (players who
scored well together) should translate into those same players actually being
paired together in real matches more often than a scattered arrangement
would.

This is a preference weight, not a hard rule, the existing fatigue rules and
session structure (4 unique pair sets, players 1 through 4 appearing in both
AM and PM) still apply and take priority over pod preference where they
conflict.

The AI opponent does not use pods, the AI has no drag and drop screen. AI
pairing generation should instead directly optimize for chemistry v2 scores
across its own 12 picks when assigning pairs, essentially skipping the pod
step and going straight to what a well arranged human pod would produce.
This keeps the two sides on a fair, comparable footing rather than the AI
pairing purely by composite score while the human's pairing quality depends
on pod arrangement.

---

## 6. Explicitly out of scope for this pass

Cross pod connections and any visual indicator for chemistry that spans pods
rather than staying within one, this was deferred to a future pass in
chemistry-system-v2.md Section 5 and stays deferred here.

A fully manual pairing builder (dragging specific players into specific AM or
PM match slots) is a different, larger feature that was intentionally tabled
earlier in favor of this pod based approach. Do not build it as part of this
prompt.

---

## Acceptance checklist

- [ ] Flat squad grid removed, replaced by captain hub plus three pods of four
- [ ] Captain sits in the center, one pod above, one pod below left, one pod
      below right
- [ ] Captain node is sized slightly larger than player nodes
- [ ] Empty captain and pod slots render as dashed placeholders, not blank space
- [ ] Player and captain card art reused from card-art-spec.md at reduced size
- [ ] Connection lines drawn only between filled nodes, colored per
      chemistry-system-v2.md thresholds
- [ ] Captain to pod lines are gold and visually distinct from player to
      player green and yellow lines
- [ ] Per player dot renders and updates as pod fills, does not wait for the
      pod to be completely full
- [ ] Picking a card is itself a drag from the round tray to a slot, not a
      tap to select followed by a separate placement step
- [ ] Player cards can only be dropped on pod slots, captain cards can only
      be dropped on the captain hub, invalid drops are rejected or disabled
- [ ] Dropping on a filled slot swaps the two cards rather than losing the
      displaced one
- [ ] Manual drag to any valid slot works at any time up to submission,
      including after the draft ends
- [ ] Drag and drop works on touch, not just mouse
- [ ] Submit to Pairings only enabled once captain and all 12 player slots
      are filled
- [ ] Header shows plain Talent and Chem numbers during the build, no grade
      badge
- [ ] Results screen shows a final combined score (Talent plus Chem plus
      actual Cup points won) once the match simulation completes
- [ ] generateFoursomePairings and generateFourballPairings weight toward
      podmates without breaking existing fatigue and session structure rules
- [ ] No cross pod lines or scoring implemented
- [ ] No manual per match pairing builder implemented
- [ ] CLAUDE.md and MEMORY.md updated to reflect the new screen and the
      pairing generation change
