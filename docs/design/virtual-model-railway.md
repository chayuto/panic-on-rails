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

Source: Kato's 2025 US Unitrack catalog (pages 5–7 for the sets, page 8 for "Standards &
Measurements"), cross-checked against Kato's set guides and Kato Japan's set pages.

| Box | Contents | Kato size (mm) | Game |
|-----|----------|----------------|------|
| **M1** 20-852 | S248×4, S124, S124C, S62, S62F, R315-45×8, Power Pack SX | 1337 × 677 | ✅ Measures 1337 × 677 exactly |
| **M2** 20-853 | M1 + V1 | 2019 × 751 | ✅ 2019 × 743 (the 8 mm is unexplained) |
| **V1** 20-860 | S248×6, S64×2, R718-15×2, #6 L + R | 1364 × 91 | ✅ Passing siding outside M1, at 66 mm centres |
| **V2** 20-861 | Viaduct loop on piers | 1655 × 911 | ❌ Needs elevation |
| **V3** 20-862 | S248×6, S186×2, S64×2, bumper×3, R718-15×3, #6 L×2 + R | 1571 × 250 | ✅ Three-track yard |
| **V4** 20-863 | S248×4, S62×2, R481-15×2, #4 L + R, S60L×2, S60R×2 | 992 × 58 | ✅ #4 siding inside M1, at 33 mm |
| **V5** 20-864 | M1's straights, R282-45×8 | 1271 × 611 | ✅ Inner oval, 33 mm inside M1 |
| **V6** 20-865 | M1's straights, R348-45×8 | 1403 × 743 | ✅ Outer oval, 33 mm outside M1 |
| **V7** 20-866 | WX310 double crossover, S248×2, S62×2 | 310 × 58 | ❌ Needs a double crossover part |
| **V11–V15** 20-870… | Double-track pieces, some superelevated or elevated | — | ❌ Needs double-track pieces |

What the measurements taught us:

- **Box dimensions are outer sizes.** They include the 25 mm roadbed and the S124C road
  crossing's 69 mm road plates. With part widths in the catalog, M1 measures exactly what the
  box says.
- **Some Kato plans are 1–2 mm off on paper.** The #6 passing siding is 1 mm short and the #4
  siding 2 mm long. The real UniJoiners absorb it, so those plans declare a small `tolerance`.
- **The real products corrected our catalog:**
  - 20-046/047 are bumpers, not S60 cut straights.
  - R414 exists only as the outer track of a double-track curve.
  - The #4 single crossovers were built with their turnouts diverging *away* from each other.
    They are now #4 + S60 + S62 on each track, which is Kato's own #4 geometry.

Exact contents and sources for every shipped set live in its JSON file
(`src/data/sets/kato/*.json`, `referenceUrl`).

## 4. Can we build that? (feasibility, 2026-09-30)

| In the real box | In the game | Gap / phase |
|-----------------|-------------|-------------|
| Straights, curves (R117–R718, 15°–45°) | ✅ Exact Kato geometry; M1 closes to 0.01 mm and measures 1337 × 677 | — |
| #4 / #6 / compact turnouts, #2 wye, 90° and 15° crossings, #4 single crossovers | ✅ | — |
| Feeder, rerailer/road-crossing straights, S60 cut straights | ✅ as their own parts, with product numbers | Their visuals: Phase 5 |
| Bumpers | ✅ Buffer-stop ends: not connectable, trains turn back | — |
| The manual's layout plans | ✅ Plans as part chains, proved to close | — |
| Double crossover (V7) | ❌ | Needs the general part topology (Phase 6) |
| Double-track pieces (V11–V15) | ❌ | Phase 6 |
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
- **Earning** is a pure function of simulation events, so it can be tested headlessly
  (`src/simulation/economy.ts`):
  - $1.50 per metre of model track run, per train. One train on the M1 oval earns about $9 a
    minute, so a V-set takes roughly ten minutes.
  - Each train in a crash costs a $20 repair.
  - Later: station stops, on-time runs and an operating-session bonus.
- **Prices** follow real 2025 US street prices, so the virtual shelf feels like the real one:
  - M1 $95, V1 $75, V5 $45;
  - a #6 turnout $33, a 248 mm straight about $2.
- **New players** start with a Kato M1 box and $20.
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

- Kato USA, 2025 US Unitrack catalog (sets on pp. 5–7, "Standards & Measurements" on p. 8):
  https://katousa.com/wp-content/uploads/2026/03/us_unitrack_1-40_20251028-%E8%BB%BD.pdf
- Kato USA, Starter Guide with every set's plan: https://katousa.com/wp-content/uploads/2025/12/M1-Guide.pdf
- Kato Japan, V-set pages with the official plans: https://unitrack.katomodels.com/products/line_set/v_line_set_series
- Kato USA, M1 set: https://katousa.com/product/product-182/
- Kato Unitrack set line-up: https://www.unitrack-kato.com/line-up-electric-turntable-1
- Kato USA, N track list: https://katousa.com/wp-content/uploads/2025/11/Download-N-Tracklist.pdf
- V1 20-860 contents: https://www.trainz.com/products/kato-20860-n-mainline-passing-siding-set-unitrack-variation-1
- V5 20-864 contents: https://lombardhobby.com/kato-n-20-864-unitrack-v5-inside-loop-track-set/
- M2 20-853: https://midwestmodelrr.com/kat20-853/
- Hornby Track Extension Pack A: https://uk.hornby.com/products/extension-pack-a-r8221
- Märklin C1 extension set 24900: https://www.marklin.com/products/details/article/24900
- Earlier project research: `docs/research/20260104_Kato N Scale Parts and Sets.md`
