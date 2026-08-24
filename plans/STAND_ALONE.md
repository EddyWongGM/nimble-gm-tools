# Stand-Alone Distribution

Last reviewed: 2026-08-24

## Goal

Let another person run their own copy of this app for their own table,
without needing to be comfortable with git/Node/npm to get there. Replaces
the earlier separate `PRODUCTIZE.md` stub, which was gesturing at the same
goal.

## What already works today

Self-hosting for a *technically comfortable* second user is already mostly
solved:

- Clone the repo, `npm install`, then run
  [scripts/Start-NimbleGMTools-Console.ps1](scripts/Start-NimbleGMTools-Console.ps1)
  (or the `-Hidden` variant) to build and run a production instance.
- Data is isolated per install: local MongoDB persists under `data\db`
  ([README.md](README.md#local-hosting)).
- `DEFAULT_ACCOUNT_LEVEL` in `.env` skips Patreon auth and the marketing
  landing page entirely, so a single-DM local instance needs no account
  system at all.

The gap is the toolchain: a non-technical recipient still needs Git and
Node.js installed and has to run commands in a terminal before any of the
above applies.

## Prerequisite: backup/restore safety first

See [IMPROVE_BACKUP_PLAN.md](IMPROVE_BACKUP_PLAN.md). Handing this app to
someone who doesn't have you nearby to fix a broken database raises the
stakes on restore being safe. Before doing any packaging work here, ship:

1. **Recommendation #1** - non-destructive "Add" import that can restore
   `Settings` (scene library) without clobbering characters/statblocks/
   encounters.
2. **Recommendation #4** - timestamped export filenames, so a recipient
   troubleshooting their own backups on their own can tell which file is
   which.

Recommendations #2/#3/#5/#6/#7 from that plan are not blocking - useful but
not specific to handing the app to someone else.

## Open question: how standalone does it need to be?

Not yet decided. Roughly two directions, in increasing order of effort:

- **Friendlier git/script path.** Keep the current clone + npm + PowerShell
  script flow, but polish it (bundled installer script that checks for/
  installs Node, clearer first-run instructions) rather than eliminating the
  toolchain requirement.
- **True standalone package.** Bundle a Node runtime with the app (e.g. via
  `pkg`/`nexe`) or wrap it in something like Electron, so a recipient
  downloads one file/installer and never touches git or npm.

Revisit this once the backup prerequisites above have shipped.
