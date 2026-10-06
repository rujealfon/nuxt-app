# Releases

Use this guide for release candidates, promotion, hotfixes, and repository branch
settings. For Vercel configuration and the manual production action, follow
[deployment](deployment.md).

## Version calculation

The manual production workflow calls semantic-release after its deployment gate
passes. [`.releaserc.json`](../.releaserc.json) defines release analysis and
publishing. Semantic-release reads Conventional Commits since the last release,
calculates the next version, and publishes a tag and GitHub release with notes.
It does not update repository files, commit changes, or create a PR. Release
notes live in GitHub rather than a repository changelog.

`fix` and `perf` produce a patch, `feat` produces a minor, and breaking changes
produce a major. `ci`, `docs`, and `chore` normally produce no release. Dependency
updates ship with the next change that warrants a release. Use
[`commitlint.config.js`](../commitlint.config.js) for accepted commit types.

Keep `conventional-changelog-conventionalcommits` at 9.3.x. Version 10 requires
writer 9, while `@semantic-release/release-notes-generator` 14 ships writer 8.
Dependabot ignores that major because writer 8 cannot render the newer preset.

## Release workflow

Use `develop` for integration, `release/<candidate>` for a fixed candidate, and
`main` for accepted releases. Staging and UAT are deployment environments.

| Pull request | Merge method | Purpose |
| --- | --- | --- |
| Feature branch into `develop` | Squash | One Conventional Commit per reviewed change |
| Candidate fix into `release/*` | Squash | One Conventional Commit per fix |
| `release/*` into `main` | Merge commit | Preserve feature and fix commits for release analysis |
| `release/*` or `main` into `develop` | Merge commit | Bring release fixes back into integration |

1. Branch features from `develop`. Use a Conventional Commit PR title, including
   `!` for breaking changes, and squash reviewed changes into `develop`.
2. Cut `release/<candidate>` from the selected integration commit. The branch
   identifies the candidate; semantic-release determines its version later.
3. Deploy the candidate to staging and UAT. Record the tested commit SHA and all
   four deployment IDs in the promotion PR. Put candidate fixes on the release
   branch and repeat acceptance testing after each fix. Continue other feature
   work on `develop`.
4. After acceptance, open the release PR into `main`, for example
   `chore: promote accepted release candidate`, and merge with a merge commit.
   If conflict resolution or other changes alter the tested candidate, test the
   resulting candidate before promotion.
5. Wait for CI on the merged `main` commit, then follow
   [manual production deployment](deployment.md#manual-production-deployment).
   The highest required bump among preserved commits determines the version;
   the promotion PR title does not replace their history.
6. Merge released changes back into `develop` through a PR with a merge commit.
   Delete the release branch after its changes reach both `main` and `develop`.

A promotion is complete when the selected commit passes CI, the manual workflow
succeeds, and released fixes are back in `develop`. Check the workflow's mode:
[release-only runs](deployment.md#manual-production-deployment) publish without
making the apps live.

## Hotfixes

Branch from `main`, squash the reviewed fix into `main`, and follow the same CI
and manual deployment gate. Merge `main` back into `develop` and any active
release branch through PRs. Repeat candidate acceptance tests after the hotfix.
The hotfix is complete when deployment succeeds and both development and active
candidates include the fix.

## Repository settings

Configure GitHub before adopting the branch flow:

1. In pull request settings, enable squash and merge commits, disable rebase
   merging, and use the PR title as the default squash commit message.
2. Create rulesets for `main`, `develop`, and release branches. Require PRs and
   `verify`, `vite-doctor`, `coverage`, and `commitlint` checks. Keep linear
   history disabled where merge commits are required. Block force pushes and
   protect branch deletion, with an admin exception for completed release branches.
3. Initialize `develop` from `main`. Create release branches when a candidate
   is ready for acceptance testing.

[CI](../.github/workflows/ci.yml) checks PRs and pushes to `main`, `develop`, and
`release/**`. Superseded PR runs cancel; push runs finish. CI validates code;
the [manual production workflow](../.github/workflows/deploy.yml) and its
[reusable release workflow](../.github/workflows/release.yml) handle publishing.

## Candidate deployments

Staging and UAT deployment remains a configuration task. The production workflow
builds the selected `main` commit; it does not deploy or promote candidate
artifacts. Configure staging/UAT targeting and acceptance approvals in Vercel or
a separate pipeline before using the release flow.

For each app, use environment-specific origins and keep frontend API URLs,
`BETTER_AUTH_URL`, and `CORS_ORIGINS` aligned. Record the tested SHA and deployment
IDs. If a target environment requires a new build, test that deployment before
acceptance. A GitHub release alone is not proof of a live deployment, especially
for versions published in release-only mode or by the previous workflow.
