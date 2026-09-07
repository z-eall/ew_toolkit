# Preparation / How to Start page

Type: grilling
Status: resolved
Blocked by: 02

## Question

Write the "Preparation / How to Start" page: where EWP/WEC YAML files live on disk, and singleplayer vs. dedicated-server differences. One page — both are "know this before you touch anything" environment facts.

## Answer

New page at `ew_wiki/src/content/docs/ewp/preparation.mdx`, sibling to the existing "Start Here" page (matching the map's "Start Here/Prep" grouping — not nested under Concepts). Wired into `astro.config.mjs`'s sidebar directly after "Start Here" (`{ label: 'Preparation', slug: 'ewp/preparation' }`, same manual-list pattern as the other top-level EWP items).

**File locations** — sourced from the existing source guide `EWP_How_To_Use_Data.md` (Steam and Thunderstore Mod Manager client paths, `infinity_tools.yaml`, `data\data.yaml` and its auto-generation via `data save=`), extended with dedicated-server paths. None of the 6 v1 source guides covered dedicated-server paths — that part is new content.

**Dedicated-server facts verified via a signed-off web check** (user approved a quick search before I added a new external source, per the standing research-signoff rule): dedicated server is a separate Steam app (`896660` vs. the client's `892970`), own `BepInEx\config` folder beside `valheim_server.exe`/`valheim_server.x86_64`, common default SteamCMD install path on Windows. Sources: [Dedicated servers – Valheim Wiki](https://valheim.fandom.com/wiki/Dedicated_servers), [BepInEx dedicated-server discussion](https://github.com/BepInEx/BepInEx/discussions/1194), [How to Add/Install Mods to a Valheim Server – XGamingServer](https://xgamingserver.com/blog/how-to-add-install-mods-to-a-dedicated-valheim-server/).

**One claim initially left out, now confirmed by the maintainer**: whether a dedicated server also picks up a saved YAML edit live, without restarting. The source guide confirmed this for the client only ("no relaunch required"); no web source confirmed it server-side. Maintainer confirmed from direct experience: live-editing works the same on a dedicated server, no restart needed. Page updated to state this.

Build verified clean via WSL (native node22, mirrored to `~/ew_wiki_verify/`, never installed against the Windows-mounted path) — 9 pages now, `/ewp/preparation/index.html` added, same two pre-existing warnings as ticket 02 (chunk size, sitemap `site` option), no new errors.

## Reopened — maintainer found factual/scope errors

The above was published on a wrong understanding: I asserted several facts (the `infinity_tools.yaml` reference, a single shared `data.yaml` path, SP and Dedi treated as one flow) without confirming them first, against the standing "never guess, confirm on fog" expectation. Corrections from the maintainer:

1. Tone should be warmer (not clinical) — this is a reader-facing interactive guide, not spec text. Don't overcorrect into fluff.
2. SP and Dedi are separate decisions upfront, not one clamped-together flow. SP has its own file structure/paths/EWP behavior. Proposed shape: a short SP note, then steer the reader toward setting up in Dedi mode as the guide's main path.
3. Dedi setup needs both the local-self-host concept and the remote/FTP-hosted-server concept explained.
4. `infinity_tools.yaml` is not part of EWP+WEC — drop it as a reference entirely.
5. `data.yaml` location is commonly confused: WEC's `data save=`/`data dump=` write to the **client's own local Valheim install**, not the server. EWP on the server reads its **own separate** `BepInEx\config\data\data.yaml`. These are two different files on two different machines/installs — not one shared path.
6. Correct WEC path (client): `C:\Program Files (x86)\Steam\steamapps\common\Valheim\BepInEx\config\data\data.yaml`. Correct server path (local self-hosted dedi): `C:\Program Files (x86)\Steam\steamapps\common\Valheim dedicated server\BepInEx\config\data`. The workflow is: capture with `data save=`/`data dump=` client-side, then manually extract and copy the entry into the server-side file.
7. Drop generic "how to install the mod" content. Replace with "how to install a script/data" — i.e., either downloading an existing script from a source, or writing a new one — since mod installation itself is a different (probably out-of-scope) prerequisite.
8. Resequence the page as needed once the above lands.

## Standing-rule additions that came out of this correction

Both of the following were written and confirmed with the maintainer, and now live in dedicated files rather than duplicated here:

- New [`ew_wiki/AGENTS.md`](../../../ew_wiki/AGENTS.md) — content voice/depth rules (warm tone, simple-language-but-full-depth for beginners, dedicated-server-is-default, mod-install-out-of-scope) plus a source-verify rule pointing at the new [`ew_wiki/docs/sources.md`](../../../ew_wiki/docs/sources.md) trusted-sources file. This — not the House-style ticket — is where the beginner-depth rule landed: House-style (still blocked by 03/04) keeps its original narrower job of distilling `Steps`/`Aside`/`Tabs`/splitting conventions from the three content-review reports once 03 and 04 exist. Putting the depth rule there instead would have meant writing this page's rewrite without it, then redoing it again once House-style resolved — the same reverse-correction trap this whole reopen was about.
- `ew_toolkit/AGENTS.md` (and its Cursor-worktree mirror) — new "Confirm, don't guess" section: don't state an external/domain fact without a citation or maintainer confirmation; ask or get signoff before checking a new source. Root `AGENTS.md`'s pointer sentence also now names `ew_wiki/AGENTS.md`, matching the existing `ewp_validator/AGENTS.md` pattern.

## Final resolution

Confirmed decisions applied to the rewrite:
- **SP/Dedi scope, wiki-wide (not just this page):** dedicated server is the default working assumption for every future guide too — recorded in `ew_wiki/AGENTS.md`, not just this ticket, so 04/06/07 don't need to re-decide it.
- **Mod installation (BepInEx/EWP/WEC itself) is out of scope for the whole wiki** — already covered by GitHub/Thunderstore/Gale. No mod-manager path list needed anywhere on this page, since SP isn't being explained in path-level detail.
- **"Installing" a script** = saving the `.yaml` into the server's `BepInEx\config` folder, regardless of whether it was downloaded or hand-written — no separate "how to install the mod" section.
- **`data.yaml` is two separate files, not one:** WEC's `data save=`/`data dump=` write to the *client's* `BepInEx\config\data\data.yaml`; EWP on the server reads its own separate copy at the same relative path under the *server's* install. Workflow is manual: capture client-side, copy the entry, paste into the server's file. No auto-sync.

Page rewritten at `ew_wiki/src/content/docs/ewp/preparation.mdx`: SP gets one `<Aside>` note (not a parallel walkthrough); Dedi section covers both self-hosted and rented/FTP hosting; a "Getting a script onto your server" section (download-or-write, same one install step) replaces the old "how to install the mod" content; a "Getting data onto your server" section with a `<Steps>` walkthrough covers the client-capture-then-server-paste workflow, with a `<Caution>` Aside on the two-file confusion. Dedicated-server facts already signed off in the first pass (Steam app id, folder placement) carried over unchanged and are now tracked in `ew_wiki/docs/sources.md`, tier "community."

Build verified clean via WSL (native node22, `~/ew_wiki_verify/`) after the rewrite — 9 pages, same two pre-existing warnings (chunk size, sitemap `site` option), no new errors. Rendered page checked in the browser preview end-to-end (all four sections, both `<Steps>` blocks, both `<Aside>` callouts).

## Follow-up correction pass

Maintainer review of the rewrite caught four more things:

1. SP note replaced with maintainer's exact wording (one grammar fix confirmed first: "leaning towards be written" → "leans toward being written").
2. "Setting up a dedicated server" wasn't meant to teach server setup — the local-vs-hosted split was only ever about where the YAML files live. Section retitled "Where your dedicated server's YAML files live," reworded to drop any setup-instruction framing.
3. Script install path corrected to `BepInEx\config\expand_world` — EWP scans every subfolder, but `expand_world` is the folder it auto-generates and uses by convention, so the guide should point there specifically rather than "any subfolder works."
4. New "Rule of thumb: load data before scripts" section: unused/unloaded data causes no problems, but a script referencing data that isn't loaded yet errors; resaving a script's `.yaml` after new data loads is what makes EWP re-check it against that data (confirmed mechanism, not guessed).

Items 3 and 4 are maintainer-confirmed domain facts with no citable doc — logged in `ew_wiki/docs/sources.md` under "Community-observed, no single source" per the source-verify rule, rather than stated unmarked.

Re-verified: build clean (9 pages, same two pre-existing warnings), full page text checked via the browser preview — all sections render in order, both `<Steps>` blocks and every `<Aside>` intact.

## Second follow-up pass

1. Dropped the Steam app-id detail (`896660`/`892970`) from "Where your dedicated server's YAML files live" — too technical for what it was buying. Kept the core point (separate install, own `BepInEx\config`, not your client's folder) in plain words instead.
2. Reordered sections: SP note → where files live → **rule of thumb (data before scripts)** → data → script. Rule of thumb now taught before the two sections it governs, not tacked on after — avoids the reverse-correction pattern this whole ticket started from.
3. Rule-of-thumb section rewritten warmer and longer — framed as a habit/best-practice suggestion ("you don't have to, but it'll save you head-scratching"), with the actual mechanical reason spelled out (a script errors on a missing reference; unused data doesn't error) rather than stated as a bare technical rule.
4. Media (screenshots/video) — genuinely never scoped on this map before now. Not folded into this page; logged as its own entry in the map's "Not yet specified" instead, since it's a wiki-wide question, not specific to Preparation. Decision: static screenshots/diagrams stay fair game per-guide going forward; video deferred, no current content needs it.

Re-verified: build clean (9 pages, same two pre-existing warnings), no new errors.

## Media placeholders filled

Added a numbering convention to `ew_wiki/AGENTS.md`'s Media placeholders rule (`#1`, `#2`, ... per page, in reading order) so the maintainer can point at a spot without re-describing it.

Maintainer supplied 3 real screenshots. Two blockers surfaced and got resolved:
- No way to save a pasted chat image to disk — maintainer dropped the files into a new `ew_wiki/.media-drafts/` folder (gitignored, raw drop-off only) instead.
- No image-editing tool on the machine — installed ImageMagick via `winget` (maintainer approved) to crop/merge/highlight.

Final images built with ImageMagick (highlight boxes on address bars and the relevant row) and placed at `ew_wiki/src/assets/ewp/preparation/`:
- `config-root.png` — the `config` folder listing with `expand_world` highlighted. Used for both Media placeholder #1 (where files live) and #3 (script folder) — same shot covers both spots.
- `data-yaml-comparison.png` — the two supplied `data` folder screenshots (server, client) stacked into one comparison image, each with its address bar and `data.yaml` row boxed. Used for Media placeholder #2.

Wired into `preparation.mdx` via `astro:assets`' `Image` component (Astro auto-optimizes to WebP on build — confirmed in the build log). All three `Aside` placeholders replaced; none remain on this page. Re-verified: build clean (9 pages, images optimized, no new errors), full page checked in the browser preview — all three images render in the correct spots.

## Two touch-ups

1. Swapped "Rented hosting" and "Self-hosted, common default path" paragraph order — the self-hosted path paragraph now sits immediately before the self-hosted screenshot, so the image no longer trails the rented-hosting paragraph (was reading as if the image belonged to rented hosting).
2. Media #2's highlight boxes were too broad — boxed the whole address bar when only `Valheim dedicated server` vs `Valheim` was the actual point of difference (`steamapps\common\...\BepInEx\config\data` is identical either way, not worth highlighting). Re-cropped and iterated on exact pixel bounds per image until the box tightly frames just that one differing path segment; `data.yaml` row box unchanged. Re-merged into `data-yaml-comparison.png`.

Re-verified: build clean, updated image reflected in the build's optimized-image log (new content hash), no new errors.

## Two more fixes

- **Stale preview, not a stale build.** Maintainer reported not seeing an update that was actually live — root cause: Astro's dev `/_image` endpoint serves `cache-control: public, max-age=31536000` on a URL with no content hash, so the browser kept the very first response forever across normal reloads/navigations. Not a bug in this page — a hard refresh (Ctrl+Shift+R) always showed the current file. Worth remembering for any future preview session on this Tool: a "not showing" report needs a hard refresh check before assuming the build is stale.
- **Box padding was too tight** — the box bottom edge ran through the text baseline, visibly cutting into letters (confirmed by cropping and zooming 3x on the exact region). Redrawn with real clearance on all sides (`2,2`→`37` padding instead of hugging the glyph bounds) on both halves of Media #2's comparison image, re-merged, re-verified zoomed-in and in the live preview.

