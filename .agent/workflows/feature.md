---
description: Implement a new feature for PanicOnRails
---

# Feature Implementation Workflow

## Prerequisites
- Read `docs/architecture/constitution.md` for project rules
- Read `AGENT.md` for identity and directives

## Steps

1. **Analyze Request**
   - Review the user's prompt thoroughly
   - Identify affected components (canvas, stores, utils)
   - Check existing patterns in similar files

2. **Plan Generation**
   - Create implementation plan artifact
   - Define architectural changes
   - List affected files with modification type (NEW/MODIFY/DELETE)
   - Propose state management updates if needed
   - **STOP** and request user approval on the plan

3. **Task Breakdown**
   - Generate task checklist in task.md artifact
   - Each task should be atomic and testable

4. **Implementation Loop**
   - For each task in checklist:
     - Implement the change
     - Run `pnpm typecheck` to verify types
     - Update task status to [x]

5. **Verification**
   - Run `pnpm test` (Vitest)
   - Run `pnpm lint` (ESLint)
   - For UI changes, visually verify in browser at `http://localhost:5173`

6. **Documentation**
   - Update README.md if public API changed
   - Add JSDoc comments to new functions
