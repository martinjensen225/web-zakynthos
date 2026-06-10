## Bicep validation

- Use official Microsoft Azure Verified Modules where applicable.
- Prefer standalone `bicep` over `az bicep`; resolve in order: `PATH`, `$HOME\.Azure\bin\bicep.exe`, `$HOME\.azure\bin\bicep.exe`.
- Local checks: `bicep lint <template>.bicep`, `bicep build <template>.bicep --stdout`, `bicep build-params <parameters>.bicepparam --stdout`.
- If `az bicep` is required, first run `az config set bicep.check_version=false bicep.use_binary_from_path=true`.
- Do not run deployment commands as a substitute for local validation.
- Use deployment what-if only when the repo allows it, the target is safe, and the user explicitly approves it.
