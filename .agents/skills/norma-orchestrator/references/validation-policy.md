# Validation Policy

- Use the repository's existing scripts and package manager.
- Run the narrowest relevant validation first.
- Use path-aware validation categories:
  - orchestrator changes
  - shared core/runtime changes
  - application/interface changes
  - schema or generated-code changes
  - documentation-only changes
- Dry-run mode must show commands without executing them.
- Required command failure produces `BLOCKED`.
- Do not fabricate success for skipped, missing, timed-out, or failed commands.
- Do not automatically run migrations, publishing, dependency installation, or
  destructive commands.
