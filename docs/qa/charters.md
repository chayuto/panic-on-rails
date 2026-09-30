# Agent playtest charters

Exploratory sessions an agent plays as a player, through `playwright-cli` (the recipe is in
`.claude/skills/high-fidelity-frontend-testing/SKILL.md`). The method is from
`docs/research/20260930_Agent QA and Testing Tools.md`. The scripted playtests
(`e2e/specs/playtest.spec.ts`) hold known goals to budgets; a charter looks for what nobody
has written a test for yet.

## A session

- **Charter:** what to explore, and why.
- **Persona:** who is playing, and what they know.
- **Setup:** storage (fresh, or a saved state), collection or free build, the viewport, and any
  seed.
- **Budget:** about 40 actions or 20 minutes. Stop there, or at a finding serious enough to
  fix first.
- **Oracles:**
  - no page or console errors;
  - the track stays whole (the playtest's `integrityProblems`);
  - every car stands on the rails;
  - the player never stalls, with no progress in 10 actions;
  - and what the persona would expect.
- **Evidence:** for each finding, the steps, a screenshot and the `look()` JSON.
- **Debrief:**
  - Rate each finding on [Nielsen's heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
    or Pinelle's game heuristics, with a severity from 0 (not a problem) to 4 (a catastrophe).
  - A finding becomes a failing test (a `Player` or e2e test, a Vitest case, or both) before
    it's fixed.
  - Record the session under `docs/qa/sessions/`.

## Charters

1. **The gift.** A new player who got a train set as a gift.
   - Setup: fresh storage, collection mode, 1440 × 900.
   - Charter: open the box, get the train running, earn, and buy the next box, going by what's
     on the screen alone.
   - Played 2026-10-01: [the session](sessions/2026-10-01-the-gift.md).
2. **The returning Kato hobbyist.** Knows Unitrack by its product numbers.
   - Setup: free build.
   - Charter: build V1 by hand from the manual. Do the pieces behave like Unitrack: the snap,
     which way a turnout goes, the feeder and rerailer where the manual puts them?
3. **The operator.** Keeps trains apart for a living.
   - Setup: M2 built, two trains.
   - Charter: run a ten-minute session on the passing siding without a wreck, using only the
     points and signals.
4. **The keyboard-only player who prefers reduced motion.**
   - Setup: reduced motion emulated (`set-reduced-motion reduce`).
   - Charter: build and run the M1 oval with the keyboard alone. Nothing may flash or shake.
5. **The phone-size player.**
   - Setup: 390 × 844.
   - Charter: open the shop, build M1, run the train, stop it.
   - Played 2026-10-01: [the session](sessions/2026-10-01-the-phone.md).
