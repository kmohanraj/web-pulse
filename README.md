# WebPulse QA

Universal website validator browser extension (React, TypeScript, Redux Toolkit, SCSS, Manifest V3).

## Application structure

```text
popup.html / dashboard.html
src/popup, src/dashboard     extension entries
src/components               providers, page frame, loading, error, empty states
src/app                      hash router, error boundary, integrated scan, dashboard connections
src/shell                    sidebar, header, responsive layout
src/store                    Redux store, redux-persist, root reducer
src/modules                  links, network, images, seo, accessibility, security, performance, health, reports, settings
src/content, src/background  page collection and service worker
public/manifest.json         Manifest V3
```

Hash routes: `#/dashboard`, `#/network`, `#/images`, `#/seo`, `#/accessibility`, `#/security`, `#/performance`, `#/settings`, `#/reports`.

Run full scan from the dashboard. It runs every module, keeps going when one fails, and refreshes the health score. Category cards use live module results and open the matching page.

## Pages

- Popup (`popup.html`) — compact shell with the same navigation, header, and theme switcher.
- Dashboard — scan overview, category status, and a 0–100 health score from Links, APIs, Images, SEO, Accessibility, Security, and Performance.
- Network — live Fetch, XMLHttpRequest, and GraphQL capture.
- Images — broken images, missing alt text, empty sources, and 403/404 responses.
- SEO — title, description, canonical, H1, Open Graph, Twitter, robots, and an SEO score.
- Accessibility — labels, alt text, heading hierarchy, ARIA, empty buttons, empty anchors, and an accessibility score.
- Security — HTTPS, mixed content, CSP, HSTS, cookie flags, XSS protections, iframe restrictions, and a security score.
- Performance — TTFB, FCP, LCP, CLS, and INP from the page Performance APIs, with a score and Chart.js charts.
- Settings — dark mode, export preferences, validation timeout, retry count, and scan depth, persisted with redux-persist.
- Reports — saved scan history, with PDF, Excel, JSON, and HTML export.

Open the full layout from the popup, or load `dashboard.html` directly. Hash routes: `#/dashboard`, `#/network`, `#/images`, `#/seo`, `#/accessibility`, `#/security`, `#/performance`, `#/settings`, `#/reports`.

Reload the target page after loading the extension so the network hook runs before page scripts.

```bash
npm install
npm run build
```

Load the `dist/` folder as an unpacked extension in Chrome or Edge.
