# Repository Workflow

This file stores durable collaboration rules for this repository.

## Source of Truth

- GitHub repository history is the long-term record across Codex conversations.
- `PROGRESS.md` is the handoff log for current state, design decisions, validation, and next steps.
- `README.md` is the public-facing project overview and setup guide.
- `WORKFLOW.md` is the durable place for collaboration rules and repository update policy.

## Default Rule

After each completed, verified small task:

1. Update the project files locally.
2. Update `PROGRESS.md` if current state, design decisions, validation, or next steps changed.
3. Update `README.md` only if setup, usage, or public project description changed.
4. Update `WORKFLOW.md` whenever a durable collaboration rule changes.
5. Commit coherent finished changes.
6. Push them to GitHub.

## Do Not Push

- Half-finished exploratory edits unless explicitly requested.
- Unverified changes that are still in active investigation.

## Code Comments

- Add concise comments for code that is hard for the user to read later, especially physics response, state transitions, coordinate transforms, capture rules, and tuning constants.
- For tuning constants and gameplay counters, explain what the value represents and what raising or lowering it changes, especially capacity, coins, collector range, physics strength, collision stability, and visual motion.
- Comments should explain intent or design constraints, not restate obvious code mechanics.
- Prefer a few helpful comments near important logic over dense line-by-line annotation.

## Branch and PR Habit

- Small, self-contained fixes may be committed and pushed directly when that matches the current working style.
- When branch-based review is useful, create a task branch, push it, and open a PR so `gh pr status` remains meaningful.

## Rule for Future Sessions

When a new durable working agreement is made in conversation, write it into this repository and push it, instead of leaving it only in chat context.
