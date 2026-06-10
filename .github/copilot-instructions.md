## Global working agreements

- Follow instruction files from the repo root to the working directory. If `CONTINUITY.md` exists, read it early.
- Explore read-only first. Before edits, writes, deployments, API writes, or non-trivial troubleshooting, share a short plan and wait for the exact word `Approved`.
- Keep writes inside the active workspace or repo. Never delete outside it; ask the user to delete external files manually.
- Protect secrets: do not expose, print, commit, invent, or store credentials, tokens, keys, private connection strings, or sensitive log values.
- Treat remote APIs as read-only by default. For requested writes, use a dry run when available and never perform destructive production actions.
- Fail fast for missing required dependencies, invalid configuration, and broken invariants. Do not add silent fallbacks that hide failures.
- Prefer local project docs and MCP servers before internet search for project-specific information.
- Use clear names. Update docs when behavior, interfaces, configuration, operations, onboarding, or user workflows change.
- Verify with the smallest relevant local checks and report what ran or was skipped.
- End code-change work with a conventional commit message. For multiple repos, provide one message per repo with changed files and purpose.

## Documentation voice

Write docs for future readers, not the current chat. Use neutral product wording, explain intent and ownership, and avoid temporary examples, local workspace state, or implementation-checklist phrasing.
