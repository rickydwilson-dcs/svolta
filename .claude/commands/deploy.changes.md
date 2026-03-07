# Deploy Changes

Commit (if needed) and push all changes through the full git workflow: develop → staging → main.

**This command runs `/update.docs` first** to verify documentation is accurate before deploying.

---

## Step 1: Verify Branch

```bash
git branch --show-current
```

Must be on `develop`. If not, STOP and inform the user. Never push from the wrong branch.

---

## Step 2: Verify Documentation

Run the `/update.docs` command. If issues are found, fix them before proceeding — they will be included in the commit.

---

## Step 3: Pre-commit Verification

Before committing anything, verify the codebase is healthy.

Run each check as a separate command. Do NOT chain with `&&` — run them sequentially so failures are clear:

```bash
npm run type-check
```

```bash
npm run lint
```

```bash
npm run build
```

If any step fails, STOP. Report the failure and do NOT commit broken code. The user should fix the issue first.

If test scripts are available, also run:

```bash
npm run test
```

Only proceed to committing once all verification passes.

---

## Step 4: Commit if Needed

```bash
git status --porcelain
```

If there are uncommitted changes (staged or unstaged):

1. Stage all changes: `git add -A`
2. Review what's staged with `git diff --cached --stat`
3. Generate a commit message that summarises the changes. Use a HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
[summary of changes]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

If the working tree is already clean, check there are commits ahead of remote:

```bash
git log origin/develop..HEAD --oneline
```

If nothing to commit AND nothing ahead of remote, STOP: "Nothing to deploy."

---

## Step 5: Push to Develop

```bash
git push origin develop
```

Wait for CI to pass:

```bash
gh run watch
```

If CI fails, STOP. Diagnose the failure, fix it, commit to develop, and restart from Step 5.

---

## Step 6: Merge to Staging

```bash
git checkout staging
git merge develop
git push origin staging
```

Wait for CI (E2E tests run on staging):

```bash
gh run watch
```

If CI fails, STOP and diagnose. Do not proceed to main with failing CI.

---

## Step 7: Deploy to Main

Svolta uses a deployment script that verifies staging CI passed before merging to main:

```bash
./scripts/deploy-to-production.sh
```

This script:
1. Confirms staging E2E tests passed (Husky hook verification)
2. Merges staging → main
3. Pushes main
4. Verifies the production deployment

Wait for the Vercel deployment to complete. If the script exits with an error, STOP and report what failed.

---

## Step 8: Return to Develop

```bash
git checkout develop
```

---

## Step 9: Report

Report the final state:

- Commit SHA deployed to main
- CI/deploy status for all three branches (develop, staging, main)
- Vercel deployment URL (if available)
- Any issues encountered

---

## Rules

- **NEVER skip a branch** — always go develop → staging → main
- **NEVER force push** to any branch
- **NEVER proceed** if CI is failing at any stage
- **NEVER bypass the deploy script** — it enforces that staging passed before main is updated
- If any step fails, STOP and inform the user with the error details
- Always return to the `develop` branch when done
- This command is **not** for deploying feature branches — merge to develop first
