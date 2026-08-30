# GitHub Repo Rename: nimble-gm-tools → nimblerpgapp

Last reviewed: 2026-08-30

## Goal

Rename the GitHub repository from `EddyWongGM/nimble-gm-tools` to
`EddyWongGM/nimblerpgapp`, and clean up the in-repo references that still
point at the old name — without breaking local dev, CI, or the Heroku
deploys.

## Why this is low-risk

GitHub redirects the old `owner/repo` path (clones, `git push`, web links,
issue/PR URLs) to the new one indefinitely, as long as nobody else claims
`EddyWongGM/nimble-gm-tools` afterward. The rename itself cannot be "undone"
by GitHub, but it also can't strand anyone who still has the old URL
bookmarked or cloned.

Two things are already decoupled from the repo name and need no change:

- The npm package name is already `nimblerpg-app`
  ([package.json:2](../package.json#L2)), not `nimble-gm-tools`.
- The Heroku apps (`nimble-gm-tools-dev`, `nimble-gm-tools-prod`) are
  independent identifiers with their own `*.herokuapp.com` URLs — a GitHub
  rename does not touch them. (Renaming those too is a separate, riskier
  decision — see "Out of scope" below.)

## Current references to the old name

Found via `grep -r "nimble-gm-tools"` and `grep -r "EddyWongGM"` across the
repo (excluding `node_modules`):

| File | What it is |
| --- | --- |
| [package.json:8](../package.json#L8) | `repository.url` field |
| [CONTRIBUTING.md:26](../CONTRIBUTING.md#L26) | Link to `help wanted` issues |
| [PRIVACY.md:11](../PRIVACY.md#L11) | Link to source code |
| [html/landing.html:126](../html/landing.html#L126) | Link to contributors graph |
| [client/Settings/Tips.ts:18](../client/Settings/Tips.ts#L18) | Commented-out tip, not rendered |
| [.github/workflows/node.js.yml:1](../.github/workflows/node.js.yml#L1) | Comment only, no functional reference |

None of these are load-bearing — CI, builds, and the Heroku Git remotes
don't depend on the repo name being hardcoded anywhere. This is a cleanup
pass, not a fix for something that would otherwise break.

## Steps

### 1. Do the rename on GitHub

- Repo → Settings → General → Repository name → `nimblerpgapp` → Rename.
- Confirm the redirect works: visiting
  `github.com/EddyWongGM/nimble-gm-tools` should land on the new URL.

### 2. Update local git remote

```
git remote set-url origin https://github.com/EddyWongGM/nimblerpgapp.git
```

The old URL keeps working via redirect, but pointing `origin` at the real
URL avoids relying on that indefinitely.

### 3. Verify Heroku's GitHub auto-deploy integration survives

Heroku's Deploy tab (for `nimble-gm-tools-dev`, and `nimble-gm-tools-prod`
if it's also GitHub-connected) tracks the linked repo. This *should* follow
a rename automatically, but confirm rather than assume:

- Heroku dashboard → each app → Deploy tab → check the connected repo still
  shows and a push to `development` still triggers CI-gated auto-deploy
  ([.github/workflows/node.js.yml](../.github/workflows/node.js.yml)).
- If it shows disconnected or points at a stale name, reconnect it to
  `EddyWongGM/nimblerpgapp` and re-enable auto-deploy from `development`.

### 4. Update in-repo references

Replace `github.com/EddyWongGM/nimble-gm-tools` with
`github.com/EddyWongGM/nimblerpgapp` in:

- [package.json](../package.json) — `repository.url`
- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [PRIVACY.md](../PRIVACY.md)
- [html/landing.html](../html/landing.html)
- [client/Settings/Tips.ts](../client/Settings/Tips.ts) (commented line —
  update or delete, since it's currently unused)
- [.github/workflows/node.js.yml](../.github/workflows/node.js.yml) (comment
  only)

### 5. Rename the local project folder (optional, cosmetic)

The working directory is currently
`...\VS Code Projects\nimble-gm-tools`. Renaming it to match
`nimblerpgapp` is purely local housekeeping — do it after everything above
is committed and pushed, then reopen VS Code at the new path. Not required
for anything to function.

### 6. Sanity check

- `npm run build` and `npm test` still pass (repo name isn't referenced by
  either).
- Push to `development`, confirm CI runs and Heroku dev auto-deploys.
- Spot-check the updated links in CONTRIBUTING.md / PRIVACY.md / the landing
  page render correctly.

## Out of scope (separate decisions, not needed for the GitHub rename)

- **Renaming the Heroku apps** (`nimble-gm-tools-dev`/`-prod` →
  `nimblerpgapp-*`). This changes the live `*.herokuapp.com` URLs, which
  means updating any bookmarks, the Patreon/Discord links pointing at the
  prod URL, and possibly OAuth callback URLs if any are registered against
  the current domain. Worth its own plan if wanted — don't bundle it with
  this rename.
- **Renaming the exported backup filename prefixes**
  (`nimble-gm-tools-*.json` in
  [LocalDataSettings.tsx](../client/Settings/components/LocalDataSettings.tsx),
  [AccountSyncSettings.tsx](../client/Settings/components/AccountSyncSettings.tsx),
  [LibrariesCommander.ts](../client/Commands/LibrariesCommander.ts)). These
  are internal string constants unrelated to the GitHub repo name — only
  relevant if aiming for full "Nimble RPG App" brand consistency in
  user-facing filenames. If done, update the three test files that assert
  on the exact filename too
  ([LocalDataSettings.test.tsx](../client/Settings/components/LocalDataSettings.test.tsx),
  [AccountSyncSettings.test.tsx](../client/Settings/components/AccountSyncSettings.test.tsx),
  [LibrariesCommander.scenes.test.ts](../client/Commands/LibrariesCommander.scenes.test.ts)).
