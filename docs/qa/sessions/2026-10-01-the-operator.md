# Session: the operator (2026-10-01)

- **Charter:** run two trains on the M2 passing siding without a wreck, using the points.
- **Persona:** someone who keeps trains apart for a living, and reads the layout like a
  signalbox's diagram.
- **Setup:** fresh storage, free build, M2 built from the shop, 1440 × 900, the dev server,
  through `playwright-cli`. Time was stepped with `__PANIC_SIM__` between moves: a CLI
  command a move is too slow to operate in real time.
- **Budget:** about 20 moves. The full ten-minute session wasn't played; these came first.

## What happened

1. Built M2 and added a second train. Stepped 30 seconds: they ran round apart, no incident.
2. Stepped until a train stood on the left turnout, then clicked its points button: **the points
   were thrown, under the train** (finding O1). With the keyboard (hover and S, or the 1–9
   keys) the game refuses the same throw with a thud.
3. Hovered the track: the tooltip showed an edge ID, the part ID "kato-20-120", "Length:
   247px" (it's millimetres), "Type: arc" and the end nodes' types (finding O2). Hovering the
   points showed the curve beside them, not the points.

## Findings

| # | Severity | Heuristic | Finding | Outcome |
|---|----------|-----------|---------|---------|
| O1 | 3 | Consistency; error prevention | A click threw points under a train, where a key refused. The check also looked only at each train's front: a train leaving the points with its coaches still on them didn't count. | One lock for click and key (`utils/points.ts`): any car of a train on the points' routes locks them, with a thud and a red ripple. The track leading up to them doesn't count, so points can still be thrown in front of a train. |
| O2 | 2 | Match with the real world | The Simulate tooltip was a debugging aid: IDs, node types, "px" for millimetres. Over the points it showed the track beside them. | It speaks to the player: a piece's name, maker and size in mm; which way the points are set and whether a train locks them; a signal's aspect; what a click does. Each kind wins over the track under it. |

**Tests:**
- `utils/__tests__/points.test.ts`:
  - a train on the points locks them;
  - so does one leaving them with its coaches still on them (the old check missed it);
  - a train on the approach doesn't (the old check counted it);
  - a throw is refused while locked.
- The e2e hovers Switch Showdown's points: the tooltip names them, and says which way they're set and what a click does.
