Execute ONE task from an implementation plan using the process described below.

1. Read the implementation plan file ( `verification-plan.md` ). Select the SINGLE most important next task.
2. Launch up to 2 parallel Explore subagents (use `subagent_type: "Explore"`) to:

- Find files relevant to the selected task
- Identify existing patterns and conventions
- Locate test files and testing patterns
- Map dependencies and interfaces

Consolidate findings before proceeding. 3. Write or update any tests that would be useful to have 4. Implement the changes. 5. Run the tests and type/lint checks that are relevant to the code you wrote. 6. Invoke code review Sonnet subagents to evaluate your changes. Address feedback and request another review. Repeat until approved. 7. Update implementation plan.

- Mark the completed task as done (e.g., `[x]` or strikethrough)
- Add any new tasks discovered during implementation
- Clean out old completed items if the file is getting large (use a subagent)

**Update CLAUDE.md if needed:**

- Add operational learnings (correct commands, gotchas)
- Keep it brief and operational only

**Commit and push:**

```bash
git add -A                                                                               git commit -m "feat: <description of what was implemented>"
git push
```

## Critical Guidelines

### One Task Only

Complete exactly ONE task per execution. Fresh context for each task prevents pollution and maintains quality.

### No Placeholders

Implement functionality completely. Stubs and TODOs waste future effort redoing the same work.

### Single Source of Truth

No migrations or adapters. If unrelated tests fail, fix them as part of this increment.

### Continuous Plan Maintenance

- Update the plan with learnings using a subagent
- Document discovered bugs even if unrelated to current work
- Future iterations depend on accurate plan state

### Documentation Discipline

- **CLAUDE.md**: Operational info only (commands, setup, gotchas)
- **Implementation plan**: Status updates, progress notes, discovered issues
- **Tests/code comments**: Capture the "why", not just the "what"

### Debugging

Add logging as needed to diagnose issues. Remove or gate behind flags before committing if excessive.

## Handling Issues

**Discovered bugs unrelated to current task:**

1. Immediately add to implementation plan as new task item. Use subagent to make the file edit.
2. Continue with current task unless the bug blocks you
