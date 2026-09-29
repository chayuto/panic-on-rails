# Boxed Sets

One JSON file per real product, in `src/data/sets/<brand>/`. Files are loaded automatically
(`index.ts`), validated by `schema.ts`, and checked by `__tests__/sets.test.ts`.

## Rules

- **Contents are the real box.** Copy the manufacturer's contents list: part numbers and
  quantities. Put the source in `referenceUrl`.
- **Every part must exist in the catalog** (`src/data/catalog/parts/<brand>.json`). If a part
  in the box is missing, add it there first, with real geometry.
- **Plans must close.** A plan may only leave the number of connectors open that it declares
  in `openEnds`. The default is 0.
  - Connectors meet when they are within 0.5 mm and face each other.
  - Some real plans are 1–2 mm off on paper and close only thanks to UniJoiner play; Kato's #4
    and #6 sidings are the known cases. Such a plan sets `tolerance` (at most 3 mm) and says why
    in its `description`.
- **Plans may only use what's in the box**, plus the sets listed in `extends`. For example,
  a V1 plan may use the M1 oval it extends.
- **The first plan uses every piece in the box**, except the pieces listed in `spares`. For
  example, V4 ships two of each S60 cut straight, and its plan needs one of each.
- **A starter set's first plan must measure what's printed on the box**, within 1.5%. Each
  piece is swept by its catalog `width`: 25 mm of Kato roadbed, or 69 mm for the road-crossing
  rerailer.
- Some makers state the table a layout needs, rounded up, rather than a box size. Märklin
  does. Mark those `"footprint": { ..., "space": true }`. The first plan must then fit that
  table and fill at least 85% of each side.
- Never loosen a test to make a plan pass. A plan that doesn't close means the plan or the
  catalog geometry is wrong.

## Writing a plan

A plan is a chain of steps, read like the manual's diagram:

```json
{
  "id": "m1-oval",
  "name": "Basic oval",
  "steps": [
    { "part": "kato-20-000" },
    { "part": "kato-20-000" },
    { "part": "kato-20-120" },
    { "part": "kato-20-202", "at": 1 },
    { "part": "kato-20-150", "at": { "piece": 3, "connector": "branch" } },
    { "part": "kato-20-120", "via": "B" }
  ],
  "trains": [{ "piece": 0, "color": "#E74C3C" }]
}
```

Each field of a step:

- `part`: the catalog part id.
- `at`: where the piece attaches.
  - Leave it out to attach to the previous step.
  - A number means another earlier step. The piece attaches to that step's **through exit**:
    - a straight or curve: its other end;
    - a turnout entered at `entry`: `main` (`right` for a wye);
    - a turnout entered at `main` or `branch`: `entry`;
    - a crossing or crossover: the opposite end of the same track (`A1`↔`A2`, `B1`↔`B2`);
    - a topology part (curved turnout, double slip, double crossover): the other end of the
      first route listed through the connector it was entered at.
  - `{ "piece": n, "connector": "branch" }` names the connector explicitly.
  - `{ "alongside": n, "offset": 33 }` does not attach. It starts a **separate, parallel run**:
    - The piece is placed exactly like step `n`, shifted `offset` mm to the right of its
      direction of travel. A negative offset shifts it left.
    - Example: Kato V5's inner oval starts 33 mm inside the M1 oval, which is Unitrack's
      double-track spacing.
- `via`: which connector of the new piece attaches.
  - The default is the primary connector: `A` for straights and curves, `entry` for turnouts,
    `A1` for crossings, the first listed connector for topology parts.
  - Curves turn **right** (clockwise on screen) from `A`. Attach a curve with `"via": "B"` to
    turn **left**.
- Connector names:

  | Part | Connectors |
  |------|------------|
  | Straight, curve | `A`, `B` |
  | Turnout | `entry`, `main`, `branch` |
  | Wye | `entry`, `left`, `right` |
  | Crossing, crossover | `A1`, `A2`, `B1`, `B2` |
  | Topology part | The names in its catalog entry: Kato's WX310 double crossover and Märklin's double slip have `A1`, `A2`, `B1`, `B2`; Märklin's and Hornby's curved points `entry`, `inner`, `outer`; Hornby's double level crossing `A1`, `A2`, `B1`, `B2` |

The first step sits at the origin, heading east (right), placed from the part's own origin
whatever its `via`. To put a two-track piece (such as a double level crossing) with its second
track above the first, attach it later in the chain `via` that track's connector. The builder places everything else
from catalog geometry, then pairs connectors that meet face to face within 0.5 mm and 0.5°. The
last piece of a loop is proved to meet the first this way.

## Checking your work

```bash
pnpm test --run src/data/sets
```

The test prints the plan, the step and the open connectors of any plan that doesn't close. To
inspect one plan, call `resolvePlan(plan)` in a test. It returns `openEnds`, `joints` and the
`billOfMaterials`.
