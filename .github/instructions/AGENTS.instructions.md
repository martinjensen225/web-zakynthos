## Repo addendum

Reusable repo-level rules. Keep repo-specific conventions in the final section.

## Startup

- Resolve the repo root with `git rev-parse --show-toplevel` when available.
- Read `CONTINUITY.md` when it exists, before edits, after context compaction, or when switching repos.
- Use `.github/instructions/ONBOARDING.md` only when onboarding to an unfamiliar repo or creating the repo support files.

## Continuity

- Update `CONTINUITY.md` only for durable state: goal, status, next step, open questions, decisions, receipts.
- Keep it bounded: Snapshot <= 25 lines, Done <= 7 bullets, Working set <= 12 paths, Receipts last 10-20.
- If a ledger is needed but missing, create it from `.github/instructions/templates/CONTINUITY.TEMPLATE.md`; see `.github/instructions/LEDGER_RULES.md` for details.

## Docs and policy

- When docs are created, moved, renamed, or deleted, update the closest `INDEX.md`; keep entries to links plus one-line descriptions.
- Never run direct deployment commands. Use what-if or dry-run only when explicitly approved and safe.
- For Bicep changes, follow `.github/instructions/BICEP.md`.
- For `bicep-action` changes, update all version references required by the repo release policy.

## Repo-specific addendum

Add stable repo conventions here: package manager, build/test commands, deployment boundaries, ownership, or release policy. Keep temporary task notes in `CONTINUITY.md`.
