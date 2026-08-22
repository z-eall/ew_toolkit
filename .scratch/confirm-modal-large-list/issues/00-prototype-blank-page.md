# Prototype blank page — broken asset paths

Type: research
Status: resolved

## Question

Why did `prototype-confirm-modal.html` render a blank white page in Cursor browser and Chrome?

## Answer

Vite `base` is `/ew_toolkit/ewp_validator/`. The HTML used **root-absolute** paths (`/src/...`, `/shared/theme.css`) which resolve to `localhost:5173/src/...` — **404**. The module never loaded, so `#prototype-root` stayed empty and the page looked white.

**Fix:** relative script path `./src/prototype/confirm-modal-large-list.ts`; drop HTML `<link>` tags (CSS loads via TS imports); open via `npm run dev:prototype-confirm-modal` which uses the base-prefixed URL.

**Do not** open the `.html` file directly from disk (`file://`) — Vite dev server required.
