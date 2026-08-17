# Rebrand project id from `ewp_toolkit` to `ew_toolkit`

Type: task
Status: open
Blocked by: (none)

## Question

Rename the whole project from the EWP-specific `ewp_toolkit` / "EWP Toolkit" to
the umbrella `ew_toolkit` / "EW Toolkit", because the vision has widened: the
site is no longer just the EWP YAML validator, but a home that can host multiple
tools for **any** ExpandWorld (EW) mod. The EWP validator becomes tool #1 under
that umbrella, not the whole product.

**Decided now (this ticket's locked part):**

- Technical id everywhere → `ew_toolkit` (repo name, Pages path, local folder,
  package name as `ew-toolkit` per npm hyphen convention).
- Interim display name → "EW Toolkit". The final display name / tagline / visual
  branding is NOT settled here — see "Still open" below.

**Settled by [ticket 15](15-multi-tool-site-reframe.md) (the reframe grilling):**

- Display name → **"EW Toolkit"**, branded after the ExpandWorld flagship line.
  "EW" = ExpandWorld; no separate scope-honest rename now (YAGNI on the
  speculative far-future general-Valheim-world-editing scope).
- The map's Destination does NOT widen — this map ships the validator standalone;
  the multi-tool hub is a separate future map. So this rename is the *only*
  reframe-driven change to this map.
- Tagline (optional descriptive subtitle) is the one genuinely-open cosmetic bit;
  can be decided during execution or left off.

## Rename plan — order of operations

The one edit that breaks the live site if missed is **`vite.config.ts`'s
`base`**, which must exactly equal the GitHub repo name (project-Pages sites
serve from `z-eall.github.io/<repo>/`, so assets 404 if `base` and repo name
disagree). So the repo rename and that edit must ship together, repo first.

1. **[USER — GitHub settings]** Rename the repo `ewp_toolkit` → `ew_toolkit`
   (repo → Settings → rename). GitHub auto-redirects old URLs and clone paths,
   so nothing breaks in the interim. Pages URL becomes
   `https://z-eall.github.io/ew_toolkit`. *This is the only step Claude cannot
   do — it's an account/settings action.* Do it **first** so the push in step 4
   lands against the renamed repo.

2. **[CLAUDE — critical]** `vite.config.ts`: `base: "/ewp_toolkit/"` →
   `"/ew_toolkit/"`. Must match step 1 exactly or the deployed JS/CSS 404s.

3. **[CLAUDE]** Re-point the local remote:
   `git remote set-url origin https://github.com/z-eall/ew_toolkit.git`.

4. **[CLAUDE] Display/text edits (cosmetic, safe anytime):**
   - `index.html` `<title>`
   - `src/main.ts` header `<b>EWP Toolkit</b>`
   - `README.md` H1, `CONTEXT.md` H1
   - `package.json` `"name": "ewp-toolkit"` → `"ew-toolkit"`

5. **[CLAUDE] Planning-doc sweep (internal, low risk):** `map.md` title +
   references, GitHub URLs in tickets 01/10/11/12 (auto-redirect anyway, but
   tidy). Optional: rename the `.scratch/ewp-toolkit/` folder →
   `.scratch/ew-toolkit/` — internal relative links survive, breaks nothing.

6. **[CLAUDE]** Commit + push → CI rebuilds and redeploys to the new Pages path.
   Verify the live site loads (assets resolve under `/ew_toolkit/`).

7. **[USER or a later session — NOT mid-session]** Rename the local folder
   `C:\Users\Ultimate\Claude\ewp_toolkit` → `ew_toolkit`. Git tracks contents,
   not the folder name, so this is safe — but doing it while a session's working
   directory points at the old path is messy, so leave it for last / offline.

## Answer

(pending — starts once the user renames the GitHub repo in step 1)
