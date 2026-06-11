# How this fork works

This is Lundalogik's maintained fork of
[jgroth/kompendium](https://github.com/jgroth/kompendium), published on npm as
[`@limetech/kompendium`](https://www.npmjs.com/package/@limetech/kompendium).

The goal is **not** to diverge from upstream. Every change made here should
also be offered upstream as a pull request, and upstream is merged back
continuously. The fork exists so that releases are not blocked on upstream
review capacity.

## Branch model

| Branch  | Role                                                                    |
| ------- | ----------------------------------------------------------------------- |
| `main`  | Pure mirror of upstream `main`. Never commit to it.                     |
| `lime`  | Default branch. `main` + our not-yet-accepted patches. Releases happen here. |

The delta between `lime` and `main` should only ever be:

1. Fork infrastructure (this file, `.releaserc.json`, the `release-lime.yml`
   and `sync-upstream.yml` workflows, the package rename in `package.json`).
2. Patches that have an open PR against upstream.

## Landing a change

1. Branch off `main` (so the patch applies cleanly upstream):
   `git checkout -b my-fix origin/main`
2. Open a PR against `jgroth/kompendium`.
3. Also open a PR against `lime` in this repo. This publishes it under
   `@limetech/kompendium` without waiting for upstream. (`lime` and `main`
   are protected by rulesets: maintainers merge PRs — only the sync
   automation and org admins can push to the branches directly.)
4. When upstream accepts the PR, nothing needs to be done here: the daily
   sync merges upstream `main` into `lime`, and since the identical change is
   already on both sides, it merges as a no-op. The delta shrinks by itself.

The list of open PRs against upstream **is** the canonical description of the
fork's current delta.

## Automation

- **`sync-upstream.yml`** (daily + manual): fast-forwards `main` to upstream
  `main`, mirrors upstream tags, merges `main` into `lime`, and triggers a
  release if `lime` changed. On a merge conflict it opens an issue and fails;
  resolve locally (usually by keeping upstream's version of a patch upstream
  has modified-and-accepted) and push `lime`. Pushing the resolved merge
  commit requires ruleset bypass privileges (org admins) — a merge commit
  cannot be landed through a rebase-merged PR.
- **`release-lime.yml`** (push to `lime` + called by the sync): runs
  semantic-release.

`lime` must remain the repository's **default branch** — scheduled workflows
only run from the default branch, and `main` must stay a pure mirror.

Upstream's own release workflow (`release.yml`, named "CI") is disabled in
this repository's Actions settings. Do not re-enable it: it would try to
publish the unscoped `kompendium` package on pushes to `main`.

## Versioning and releases

- semantic-release on `lime` uses `tagFormat: lime-v${version}`
  (`.releaserc.json`), so the fork's versioning is independent of upstream's
  `v*` tags and there are no tag collisions.
- The fork config deliberately drops `@semantic-release/changelog`, `exec`
  and `git`: releases create a tag, a GitHub release and an npm publish, but
  **no commits** on `lime`. This keeps `CHANGELOG.md` and `package.json`
  untouched by our releases so they never conflict with upstream's release
  commits. Release notes live in this repo's GitHub releases.
- The `version` field in `package.json` on `lime` is whatever upstream last
  released; the actual published version is computed by semantic-release.
- npm publishing uses [trusted publishing
  (OIDC)](https://docs.npmjs.com/trusted-publishers/) — there is no npm token
  secret.

## Using `@limetech/kompendium` in a consumer

To switch a consumer without touching imports or binary names, use an npm
alias so the package still lands in `node_modules/kompendium`:

```json
"devDependencies": {
    "kompendium": "npm:@limetech/kompendium@^1.1.1"
}
```

## Known limitations

- `validate-lime-elements.yml` only triggers on PRs targeting `main`, so it
  does not run for PRs against `lime`. It also `npm link`s the package by its
  upstream name, which the rename breaks. Making it work for `lime` PRs would
  require fork-specific changes to that workflow; until then, PRs against
  `lime` are covered by `pr-checks.yml` only.
