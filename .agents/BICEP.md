## Bicep validation

- Use official Microsoft Azure Verified Modules where applicable.
- Prefer standalone Bicep CLI over `az bicep`.
- Resolve Bicep in this order:
  1. `bicep` from `PATH`
  2. `$HOME\.Azure\bin\bicep.exe`
  3. `$HOME\.azure\bin\bicep.exe`
- Validate with:
  - `bicep lint <template>.bicep`
  - `bicep build <template>.bicep --stdout`
  - `bicep build-params <parameters>.bicepparam --stdout`
- If `az bicep` is required, configure:
  - `az config set bicep.check_version=false bicep.use_binary_from_path=true`
- Do not run deployment commands as a substitute for local validation.
