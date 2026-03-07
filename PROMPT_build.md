Execute ONE task from the docs implementation plan using the process described below.

1. Read `DOCS_TODO.md`. Select the SINGLE next unchecked checkbox (Write before Review within a task). Each checkbox is one unit of work.

2. Determine whether you selected a **Write** or **Review** task, then follow the corresponding process.

---

## Write Task Process

1. **Explore.** Find files relevant to the task. Read the Design Reference section at the bottom of `DOCS_TODO.md` for shared conventions (CSS tokens, nav structure, file format). Study existing docs files for patterns to follow.

2. **Implement.** Create or modify the docs files described in the task. Implement completely — no stubs, no TODOs, no placeholder content. All HTML, CSS, and JS must be fully functional.

3. **Mark complete.** Check off the Write checkbox (`[x]`) in `DOCS_TODO.md`.

4. **Exit.** The next loop iteration will pick up the Review task.

---

## Review Task Process

1. **Launch a docs review subagent.** The subagent verifies accuracy of the docs content against the actual source code in `src/`. Key files to check against:
   - `src/index.ts` — public API (createEffect, createEffectOnScroll, exports)
   - `src/types.ts` — Color, GradientDirection, EasingFunction
   - `src/effects/*.ts` — effect configs and defaults

2. **The review agent does NOT change source code.** It only reads source to verify docs accuracy. It may edit docs files to fix inaccuracies.

3. **If inaccuracies are found:** Make the docs edits to fix them. Do NOT mark the Review as complete. Exit. The next agent in the loop will re-pick this Review task and verify the fixes.

4. **If everything is accurate:** Mark the Review checkbox as `[x]` in `DOCS_TODO.md`. Exit.

---

## Critical Guidelines

### One Task Only

Complete exactly ONE checkbox per execution. Fresh context for each task prevents pollution and maintains quality.

### No Placeholders

Implement functionality completely. Stubs and TODOs waste future effort redoing the same work.

### Continuous Plan Maintenance

- Update `DOCS_TODO.md` with learnings and discovered issues
- Add new tasks for problems found during implementation
- Future iterations depend on accurate plan state

### Handling Issues

**Discovered bugs unrelated to current task:**

1. Add to `DOCS_TODO.md` as a new task item.
2. Continue with current task unless the bug blocks you.
