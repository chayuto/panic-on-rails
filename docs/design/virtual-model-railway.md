# Design: A Virtual Model Railway

> Status: **direction set 2026-09-29.** The phased plan and checkboxes live in
> [`docs/ROADMAP.md`](../ROADMAP.md). This document explains *why* and *what*.

## 1. Who it's for

**Primary:** people who love model trains but can't take part the real way.

- **Money:** a Kato M1 starter oval with a power pack is about US$100, before a single train.
  A modest layout with turnouts, a few trains and a station is soon US$500–2,000.
- **Space:** even N scale needs a table; an M1 oval is 1337 × 677 mm.
- **Time:** building and maintaining a layout takes both.

**Secondary:** modelers planning a real layout. They want to know it will fit and close before
they buy, and to get a shopping list of the exact products to buy.

What they want from the game:

- the moment of opening a box;
- following the manual and seeing the oval close;
- trains that run the way models do;
- the long journey of a growing layout.

## 2. Pillars

1. **Authentic.**
   - Real products, real part numbers, real geometry.
   - A boxed set contains exactly what the real box contains.
   - Plans come from the real manuals.
   - Tests prove every plan closes with the real dimensions, the same way the real pieces do.
2. **Running is the reward.**
   - A power-pack throttle with momentum, scale speeds and real car lengths.
   - Track and trains that look like the models.
3. **The hobby is endless.**
   - Start with a starter set, earn virtual hobby money by operating, and buy the next box.
   - There is no last level, just a bigger railway.
   - Real money is never involved.
4. **Panic.**
   - A switch left the wrong way sends two trains into each other.
   - Crashes are spectacular, cost repairs, and are always the dispatcher's fault.

## 3. The real hobby maps onto a game progression

Manufacturers already sell the hobby as a ladder: a starter set, then numbered expansions, each
with a plan in its manual that extends the previous layout. That ladder is our progression. It
needs no invented levels.

| System | Starter | Expansion ladder | Notes |
|--------|---------|------------------|-------|
| **Kato Unitrack** (N) | Master sets **M1** 20-852 (basic oval, 1337 × 677 mm) and **M2** 20-853 (oval and siding, 2019 × 751 mm) | Variation sets **V1–V7** (single track: passing siding, viaduct, yard, siding, inner and outer loops, double crossover) and **V11–V17** (double track) | Our first system: exact geometry is already in the catalog. |
| **Hornby** (OO) | Train sets with a TrakMat | **Track Extension Packs A–F** build the TrakMat plan step by step | Needs Setrack geometry (R1–R4 radii). |
| **Märklin C-track** (H0) | Start up sets | Extension sets **C1–C5**: siding, passing siding, curved turnouts, double slip and yard | Needs curved turnouts and a double slip. |
| **Brio / IKEA** (wooden) | Starter sets | Expansion packs | The generic wooden parts need product mapping. |

### What's in a real box (Kato)

- **M1 Basic Oval (20-852):**
  - 4× 248 mm straight (20-000)
  - 1× 124 mm straight (20-020)
  - 1× 124 mm rerailer/road-crossing track
  - 1× 62 mm straight (20-040)
  - 1× 62 mm feeder track
  - 8× R315-45° curve (20-120)
  - Accessories: Power Pack Standard SX, rerailer, UniJoiner remover and a plan variation guide.
- **V1 Mainline Passing Siding (20-860):**
  - 6× 248 mm straight
  - 2× 64 mm straight
  - 2× R718-15° curve
  - #6 turnout left and right
  - 2 turnout control switches
- **V5 Inside Loop (20-864):**
  - The same straights, feeder and road-crossing track as M1
  - 8× R282-45° curve
  - It forms an oval 33 mm inside the M1 oval: 315 − 282 = 33 mm, the Unitrack double-track
    spacing.
- **V6 Outside Loop (20-865):** V5 with R348 curves, making an oval 33 mm outside the M1 oval.

Exact contents and sources for every shipped set live in its JSON file
(`src/data/sets/kato/*.json`, `referenceUrl`).

## 4. Can we build that? (feasibility, 2026-09-29)

| In the real box | In the game | Gap / phase |
|-----------------|-------------|-------------|
| Straights, curves (R216–R718) | ✅ Exact Kato geometry; the M1 oval closes to 0.01 mm in tests | — |
| #4 / #6 turnouts, #2 wye, 90° and 15° crossings, #4 single crossovers | ✅ | — |
| Feeder, rerailer and road-crossing straights | ✅ as their own parts (same geometry, own product number) | Their visuals: Phase 5 |
| Bumpers | ✅ Buffer-stop ends: not connectable, trains can't pass | — |
| The manual's layout plans | ✅ Plans as part chains, proved to close | — |
| Double crossover (V7) | ❌ | Needs the general part topology (Phase 6) |
| Viaducts and elevation (V2, V12, V13) | ❌ | Elevation (Phase 6) |
| Curved turnouts, double slip (Märklin C3–C5, Hornby) | ❌ | General part topology (Phase 6) |
| Power pack | ❌ Trains run at a fixed speed | Throttle with momentum (Phase 4) |
| The train in a train set | Partial: generic coloured trains | Rolling stock as data (Phase 4) |
| Buying the next box | ❌ | Collection, wallet and shop (Phase 3) |

## 5. The endless loop

```
run trains ──▶ earn hobby money ──▶ buy a box / parts / a train in the hobby shop
    ▲                                              │
    └──────────── build a bigger layout ◀──────────┘
```

- **Collection:**
  - Owned sets and loose parts form an inventory.
  - The parts bin shows counts; placing a piece uses one and removing it gives it back.
  - You can only build with what you own. The real constraint becomes the puzzle.
- **Earning** is a pure function of simulation events, so it can be tested headlessly:
  - scale distance operated;
  - later, station stops and on-time runs;
  - an operating-session bonus.
  - Crashes cost repairs.
- **Prices** follow real street prices, so the virtual shelf feels like the real one.
- **Free-build / planner mode** ignores the inventory. It is for designing a real layout and
  produces a shopping list.

## 6. Data model

| Concept | Where | Notes |
|---------|-------|-------|
| Part | `src/data/catalog/parts/<brand>.json` | A real product and its geometry |
| Set (box) | `src/data/sets/<brand>/*.json` | Contents, accessories, `extends`, footprint, plans |
| Layout plan | inside a set | A chain of parts; `resolvePlan()` places them from catalog geometry |
| Collection | Phase 3 | The owned sets and parts |
| Rolling stock | Phase 4 | Real-ish locomotives and cars with lengths and top speeds |

The plan format and its rules are in [`src/data/sets/README.md`](../../src/data/sets/README.md).

## 7. Sources

- Kato USA, M1 set: https://katousa.com/product/product-182/
- Kato Unitrack set line-up: https://www.unitrack-kato.com/line-up-electric-turntable-1
- Kato USA, Master and Variation sets: https://katousa.com/n-unitrack-mastervar-2/
- Kato USA, N track list: https://katousa.com/wp-content/uploads/2021/03/Download-N-Tracklist.pdf
- V1 20-860 contents: https://www.trainz.com/products/kato-20860-n-mainline-passing-siding-set-unitrack-variation-1
- V5 20-864 contents: https://lombardhobby.com/kato-n-20-864-unitrack-v5-inside-loop-track-set/
- M2 20-853: https://midwestmodelrr.com/kat20-853/
- Hornby Track Extension Pack A: https://uk.hornby.com/products/extension-pack-a-r8221
- Märklin C1 extension set 24900: https://www.marklin.com/products/details/article/24900
- Earlier project research: `docs/research/20260104_Kato N Scale Parts and Sets.md`
