# Role Contracts

## Planner

- Read-only.
- Uses the task and generated context pack.
- Produces allowed files, forbidden files, risks, and validation requirements.

## Implementer

- Workspace-write.
- Follows the accepted plan.
- Edits only the allowed scope.
- Records changed files.
- Cannot declare its own work accepted.

## Validator

- Deterministic local commands only.
- Does not use an LLM to decide whether tests passed.

## Reviewer

- Read-only.
- Compares task, plan, diff, context, and validation results.
- Returns `APPROVE`, `REPAIR`, or `BLOCK`.

## Repair

- Optional.
- One attempt by default.
- Receives concrete validator/reviewer findings only.
- Cannot broaden scope.
