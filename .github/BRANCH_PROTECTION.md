# Branch Protection Setup

This document explains how to configure branch protection rules for the `main` branch of `piano_lessons` to enforce best practices.

## Recommended Settings

Navigate to: **Settings** → **Branches** → **Add branch protection rule**

### Branch name pattern
```
main
```

### Protection Rules

#### ✅ Require a pull request before merging
- **Require approvals**: 1
- **Dismiss stale pull request approvals when new commits are pushed**: ✅
- **Require review from Code Owners**: ❌ (optional)

#### ✅ Require status checks to pass before merging
- **Require branches to be up to date before merging**: ✅

**Required status checks:**
- `lint-and-build` (from CI workflow)

#### ✅ Require conversation resolution before merging
Ensures all PR comments are addressed before merging.

#### ✅ Require linear history
Prevents merge commits, keeping the history clean and readable.

#### ✅ Do not allow bypassing the above settings
Administrators must follow the same rules.

#### ✅ Restrict who can push to matching branches
Only allow PRs to merge into `main` (no direct pushes).

---

## Step-by-Step Setup

### 1. Navigate to Repository Settings

Go to: `https://github.com/joris-decombe/piano_lessons/settings/branches`

### 2. Add Branch Protection Rule

Click **"Add branch protection rule"** or **"Add rule"**

### 3. Configure Pattern

- **Branch name pattern**: `main`

### 4. Enable Required Settings

Check the following boxes:

```
☑ Require a pull request before merging
  ☑ Require approvals (1)
  ☑ Dismiss stale pull request approvals when new commits are pushed

☑ Require status checks to pass before merging
  ☑ Require branches to be up to date before merging

  Search for status checks:
  ☑ lint-and-build

☑ Require conversation resolution before merging

☑ Require linear history

☑ Do not allow bypassing the above settings

☑ Restrict who can push to matching branches
```

### 5. Save Changes

Click **"Create"** or **"Save changes"**

---

## Testing Branch Protection

After setting up, verify protection works:

### Test 1: Direct push should fail
```bash
git checkout main
echo "test" >> README.md
git commit -m "Test direct push"
git push origin main
```

**Expected**: ❌ Push rejected with message about requiring a pull request

### Test 2: PR without approval should not merge
1. Create a branch: `git checkout -b test-pr`
2. Make a change and push
3. Open PR on GitHub
4. Try to merge immediately

**Expected**: ❌ Merge button disabled until CI passes and approval received

---

## GitHub Actions Integration

The branch protection integrates with our CI workflow (`.github/workflows/ci.yml`):

### Required Checks
- `lint-and-build` job must pass:
  - ✅ Lint check (`npm run lint`)
  - ✅ Build check (`npm run build`)
