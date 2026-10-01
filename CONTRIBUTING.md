# Contributing

## Long-lived branches

- `main` contains stable, releasable code.
- `dev` is the integration branch for ongoing work.

## Working branches

Git branch names use slash-separated prefixes. Git does not store branch
folders; the slash creates a readable namespace in branch lists.

Create routine working branches from `dev`:

- `feature/<short-description>` for new product work
- `fix/<short-description>` for regular bug fixes
- `refactor/<short-description>` for behavior-preserving code changes
- `docs/<short-description>` for documentation changes
- `chore/<short-description>` for maintenance and tooling
- `test/<short-description>` for test-only changes

Create `hotfix/<short-description>` from `main` for urgent production fixes.
Merge a completed hotfix into `main`, then merge the same change back into
`dev`.

Use `release/<version>` from `dev` only when a release needs a stabilization
branch. Merge the release into `main` and back into `dev`.

Keep names lowercase and hyphenated, for example
`feature/search-results-layout` or `hotfix/payment-timeout`.

## Pull requests

- Open routine pull requests against `dev`.
- Open hotfix and release pull requests against `main`.
- Keep each pull request focused on one change.
- Delete the working branch after merge.
