## Repo onboarding

At the beginning of each repo task, read `.agents/ONBOARDING.md`.

## Continuity ledger

- Resolve the repo root with `git rev-parse --show-toplevel` when available.
- Read `<REPO_ROOT>/CONTINUITY.md` before edits, after context compaction, or when switching repos.
- If missing, create it from `.agents/templates/CONTINUITY.TEMPLATE.md`.
- Keep it bounded:
  - Snapshot: ≤ 25 lines
  - Done: ≤ 7 bullets
  - Working set: ≤ 12 paths
  - Receipts: last 10–20 items
- Update the ledger when durable state changes.

## Documentation indexing

- When creating, renaming, moving, or deleting docs, update the closest `INDEX.md`.
- Keep indexes short: links plus one-line descriptions.
- Use `.agents/templates/INDEX.TEMPLATE.md` when creating a new index.

## Repo policies

- Never run direct deployment commands.
- Use what-if only when explicitly allowed and safe.
- For Bicep work, follow `.agents/BICEP.md`.
- For `bicep-action` changes, update all version references according to the repo release policy.
