## Continuity ledger

Maintain one repo-scoped ledger at `<REPO_ROOT>/CONTINUITY.md` for durable current state and context compaction.

## When to read or create

- Resolve the active repo root; confirm with `git rev-parse --show-toplevel` when available.
- Read the ledger before edits, after compaction, and when switching repos.
- If durable state is needed and the ledger is missing, create it from `.github/instructions/templates/CONTINUITY.TEMPLATE.md`.

## Multi-repo work

- Treat each repo independently and update only that repo's ledger.
- Summarize each changed repo only when useful.

## Content rules

- `Snapshot`: <= 25 lines.
- `Done (recent)`: <= 7 bullets.
- `Working set`: <= 12 paths.
- `Receipts`: last 10-20 entries.
- Compress older details into milestone bullets with pointers to commits, PRs, logs, or docs. Do not paste raw logs.
- Record facts, not transcripts. Include a date or ISO timestamp plus `[USER]`, `[CODE]`, `[TOOL]`, or `[ASSUMPTION]`.
- Mark unknowns as `UNCONFIRMED`; do not guess.
- Supersede changed facts explicitly instead of silently rewriting history.
- Record durable choices as `D001 ACTIVE: <title> (YYYY-MM-DD) [TAG] <note>`.
- For recurring issues, keep a small incident capsule: symptoms, evidence pointers, mitigation, status.

## Use in replies

- Use task plans for execution steps; use the ledger for durable state.
- Print the full ledger only when it materially changed or the user requests it.
