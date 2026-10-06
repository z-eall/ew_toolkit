# WSL recipe for npm in ew_toolkit

Use WSL (a small Linux system inside Windows) for every npm command that installs packages or writes `package-lock.json`. Use WSL for the tests too.

## Why

- Windows npm writes a `package-lock.json` that breaks Linux CI. In `ewp_validator`, the app build uses `vite@^5` (esbuild 0.21.5) and `vitest@^4` brings `vite@8` (esbuild 0.28.2). Two esbuild versions need overlapping `@esbuild/*` platform packages. Windows npm then writes a broken lock: it moves the 0.28.2 platform packages (for example `@esbuild/netbsd-arm64`) to the top level and marks them not optional. CI runs `npm ci` on Linux and fails with `EBADPLATFORM` or `EUSAGE`. This happened two times on 2026-08-17.
- The rule is the same for every Tool, because one Tool can hit the same fault later.
- `node_modules` here holds Linux native packages (for example `@esbuild/linux-x64`). Windows node cannot run the tests with them.

## Do not run on Windows

Do not run `npm install`, `npm i`, `npm ci`, `npm add` or `npm update` on Windows in this repo. A Claude Code hook blocks these commands. The `pretest` script in each Tool with tests stops `npm test` on Windows.

A Windows install without the lock file (`npm install --no-package-lock`) can start `astro dev` on Windows. Do it only in a scratch copy of the Tool, never in the real folder. The install changes `node_modules` and can break the WSL tests.

## Run a command in WSL

From a Windows terminal:

```
wsl -e bash -lc "source ~/.nvm/nvm.sh && cd /mnt/<drive>/<path to repo>/ewp_validator && npm test"
```

Use node 22 (`nvm use 22`). If `node` is not found, the login shell has no node on `PATH`. Put the nvm node folder on `PATH` first.

## Regenerate a lock file

1. Make a mirror folder inside the WSL file system (not under `/mnt`), for example `~/build/ew_toolkit/<tool>/`. Copy the Tool there. Copy the sibling folders that the Tool imports with a relative path (for example `ew_toolkit/shared/`), so imports resolve the same way as in the real repo.
2. Run `npm install` in the mirror.
3. Copy only `package-lock.json` back to the real repo. Never copy `node_modules` back.
4. For `ewp_validator`, check that `@esbuild/netbsd-arm64` shows `optional: true` and `extraneous: false` in the lock.
5. Push, then watch the CI run.
