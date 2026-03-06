---
name: commit-develop
description: >
  Commit, sync, and push the develop branch. Use when the user says /commit-develop,
  "commit and push develop", "sync develop with main", or wants to stage changes,
  merge main into develop, and push. Automates the full workflow: stage, commit with
  auto-generated message, fetch/merge main, and push.
---

# commit-develop

Automate the full develop branch commit-and-sync workflow.

## Workflow

### 1. Pre-flight checks

- Run `git status` to confirm on the `develop` branch. Abort if not.
- Run `git diff` and `git diff --cached` to see all staged and unstaged changes.
- If there are no changes to commit, skip to step 3.

### 2. Stage and commit

- Stage all modified and new files relevant to the changes (`git add` specific files, avoid secrets like .env).
- Analyze the diff to generate a commit message:
  - Title: concise summary under 72 chars describing the "why" (e.g. "Update shipping tax logic for proportional fallback").
  - Body: bullet list of key changes per file/area.
  - End with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`.
- Commit using a HEREDOC for the message.

### 3. Fetch and merge main

- Run `git fetch origin main`.
- Run `git merge origin/main`.
- If merge conflicts occur:
  - List conflicted files.
  - Attempt automatic resolution for trivial conflicts (whitespace, import ordering).
  - For non-trivial conflicts, show the conflict markers and ask the user how to resolve.
- After a successful merge, commit the merge if not already committed.

### 4. Push

- Run `git push origin develop`.
- Report the result: number of commits pushed and the remote URL.

## Rules

- Never force-push.
- Never skip hooks (no `--no-verify`).
- Never commit files that look like secrets (`.env`, `credentials.*`, `*.key`, `*.pem`).
- If any step fails, stop and report the error rather than continuing.
- Always confirm the branch is `develop` before making changes.
