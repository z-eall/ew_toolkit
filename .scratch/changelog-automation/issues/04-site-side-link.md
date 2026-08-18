Type: grilling
Status: resolved

## Question

Since the changelog surfaces on GitHub Releases rather than an in-site page (decided during destination-naming), should the EW Toolkit hub link to it at all — e.g. a "Changelog" entry in the persistent top nav (alongside Home, Tools, Support — see [Hub map ticket 18](../ew_toolkit/issues/18-landing-page-prototype.md)) pointing off-site to the GitHub Releases page? Or is that unnecessary chrome for a mostly non-technical audience, better left undiscoverable except to GitHub-savvy users?

## Answer

Yes, link it — placed beside the theme toggle in the sticky top nav's right-hand slot (`grid-column: 3`), not as a full nav item on par with Home/Tools/Support, and not in the footer. Rationale from the comparison mockup: it stays visible without scrolling on every page (unlike a footer link, which sits below the fold on longer pages like the validator), while still reading as secondary utility chrome next to the toggle rather than competing with the primary nav items. Label text is plain "Changelog" — no external-link arrow/symbol. Mockup: [Changelog Link Placement](https://claude.ai/code/artifact/0ec269de-3801-40f8-8460-49938533795f) (Option B, symbol removed per final review).

Implementation note for whoever picks this up: add a `<a class="mock-changelog-link">`-equivalent real link in `nav.ts`'s `navHtml()`, inside `.mock-nav-right`/`site-nav`'s right slot, pointing to the repo's GitHub Releases URL, `target="_blank" rel="noopener"` since it's off-site.
