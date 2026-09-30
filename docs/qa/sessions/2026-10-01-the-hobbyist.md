# Session: the returning Kato hobbyist (2026-10-01)

- **Charter:** build V1's passing siding by hand onto M1. Do the pieces behave like Unitrack:
  the snap, which way a turnout goes, the short pieces where the manual puts them?
- **Persona:** a hobbyist who knows Unitrack by its product numbers.
- **Setup:** fresh storage, free build, M1 built from the shop, 1440 × 900, the dev server,
  through `playwright-cli`.
- **Budget:** about 25 moves.

## What happened

1. Took an S248 out of M1's back straight with the Delete tool, leaving a 248 mm gap.
2. Dragged in a #6 Turnout Left. It joined at the gap's left end, its points facing the curve,
   and left a 62 mm gap: Unitrack's #6 turnout is 186 mm, and V1 packs short straights for this.
3. From the keyboard, focused the S62 card and pressed Enter. It went on the turnout's main
   exit, not its branch, and closed the gap, joined at both ends.
4. Still from the keyboard: an S64 on the branch, then an R718 15° curve with Right arrow.
   The siding came round parallel to the main line, as in the V1 manual.

The pieces behave like Unitrack. The one finding was in the QA tooling.

## Findings

| # | Severity | Finding | Outcome |
|---|----------|---------|---------|
| H1 | 1 (tooling) | The QA lens named a set of points after the track joined at them ("Curve R315-45°"), not the turnout. It read the points' first connection, which is the older piece's when a turnout joins track already there. | It names the turnout's own route, as the tooltip does. The e2e checks the lens and the tooltip agree, and that a turnout laid onto a straight is named after itself. Neither reproduces the session's merge order, so they pin the lens's contract rather than fail on the old code. |

## Notes for the tools

- An HTML5 drag through `playwright-cli` needs a second move at the target before `mouseup`.
  Chromium dispatches `dragover` lazily, so without it the piece lands at the last waypoint.
- A drag started just after scrolling the parts bin with `scrollIntoView` may not start at
  all: take the card's position after the scroll, then drag.
