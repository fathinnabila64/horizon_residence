# Horizon Residence

A condo marketing site for a demo. It helps a buyer choose a unit by sunlight: pick a period (whole year or a quarter), compare units by their average hours of direct sun, scrub or play the sun through the 3D tower, compare up to four units, then request a demo viewing.

Everything on the site is demo content. No personal data is collected or sent.

- **Live site:** https://horizon-residence.vercel.app/
- **Figma (desktop, mobile and iPad layouts):** https://www.figma.com/design/Fxk1u6umSxLqwVs7QJBTqn

## 1. Audience and primary action

- **Audience:** first-time condo buyers in Petaling Jaya who are deciding between units on the same floor plan. They want to know which unit gets hot afternoon sun, or bright mornings, before they book a viewing.
- **Primary action:** "Book a viewing". Secondary actions: explore units by sunlight, shortlist and compare units, read the FAQ.

## 2. Setup, run and build

Requirements: Node.js 20.9 or newer, npm.

```bash
npm install          # install dependencies
npm run dev          # local dev server at http://localhost:3000
npm run typecheck    # TypeScript check, no emit
npm run test:sun     # sun-position and shading sanity checks
npm run build        # production build
npm start            # serve the production build at http://localhost:3000
```

Browser tests (Chromium via Playwright, run against the production build):

```bash
pip install playwright
playwright install chromium
npm run build && npm start      # in one terminal
python3 tests/e2e.py            # in another; set SITE_URL to test another host
```

## 3. Stack and design rationale

**Stack:** Next.js (App Router) with React and TypeScript, React Three Fiber and three.js for the 3D view, plain CSS for styling, deployed to Vercel.

**Why this stack:**
- **Next.js** gives static prerendering, so the page loads fast and works without JavaScript for the content. The interactive parts are client components only.
- **React Three Fiber** keeps the 3D scene in React state, so the time slider, period and filters drive the scene directly without a second source of truth.
- **TypeScript** catches mistakes in the sun maths and the unit data at build time.
- **Plain CSS with tokens** keeps the styling easy to read in the handover. There is no utility framework to learn.
- **Vercel** has a free tier that covers a site like this, gives HTTPS by default, and redeploys from Git.

**Design decisions:**
1. **Sun hours split at solar noon, not 12:00.** In Malaysia the sun is highest around 1:15 pm on the clock. A 12:00 split would put a west-facing window's afternoon sun in the "morning" column.
2. **Ranking follows what the buyer says matters.** Three priorities (cool afternoons, bright mornings, most daylight) re-rank the list, so the choice of what to optimise for is visible.
3. **Averages, not a single day.** A buyer does not pick a date. Each unit shows its average hours of direct sun per day for the whole year or for a quarter, so the result does not depend on one day.
4. **The 3D view is a supporting visual, not the only route.** Every unit also appears in the list with its hours of sun, so the decision still works without WebGL. The page shows a message if 3D is not available.
5. **Brand rules:** warm cream background, deep teal for actions, sun amber only as fills and accents (never text, because amber fails contrast on cream), Fraunces for headings and DM Sans for text, 4 px spacing scale.

**Planned vs built:** the Figma plan had the explorer below the hero. The built page has a benefits section between them, because buyers need the reason for sun tracking before the tool.

## 4. Deployment

Deployed to Vercel, served over HTTPS at https://horizon-residence.vercel.app/. To deploy a copy of this repository:

1. Push this repository to GitHub.
2. In Vercel, choose **Add New Project**, import the repository, and keep the defaults (framework: Next.js, build: `npm run build`).
3. Deploy. Vercel gives a `*.vercel.app` HTTPS address.
4. Open the address in a private browser window and check the unit picker, the period selector, the 3D view, the shortlist and the enquiry form.

## 5. Tests

**Environment:** Chromium 141 (Playwright), Linux. Headless with software WebGL (SwiftShader).

**Widths tested:** 360, 768, 1280 and 1920 px.

**Results (tests/e2e.py, 42 checks):**
- No horizontal overflow at any tested width.
- No console errors or failed requests at any tested width.
- Filters, priority ranking, period selector (whole year and quarters), shortlist limit (4), compare table, time slider, playing through the months of a period, clicking a window in 3D (with the far side hidden behind the tower), "View in 3D" turning the camera to the unit's side, FAQ expansion.
- Enquiry form: empty submit shows an error summary that receives focus, field errors (email, phone, consent), valid submit shows the success state, and "make another request" resets the form.
- Keyboard: skip link first, then the tab order reaches buttons, inputs and links.
- Mobile menu opens with the button, closes with Escape.
- Reduced motion disables smooth scrolling.
- Without WebGL, a fallback message appears and the unit list still works.

**Sun-maths checks (`npm run test:sun`):** equinox solar noon and altitude, June and December noon altitude, morning sun in the east and evening sun in the west, and shading (east units get morning sun, west units get afternoon sun, and a neighbour shades low west floors).

## 6. Time spent

Approximately 24 hours in total, including planning, build, testing, Figma and this README.

## 7. Known limitations and what I would improve

- **Averages are an estimate.** Each period uses one sample day per month (the 15th), not every day of the year.
- **Shading is simplified.** Shadows come from two neighbouring boxes only. Balconies, trees, roof structures and haze are ignored. Real sun hours can differ.
- **Sun model accuracy:** the solar position is accurate to about 0.1°, but the 10-minute sampling step can miss a shadow that lasts a few minutes.
- **The 3D view shows one fixed day** (20 March) until the visitor presses play. Play moves through the months of the chosen period, at the time set on the slider.
- **Demo data only:** units, prices and the surrounding buildings are invented.
- **Enquiry form does not send anything.** The brief forbids transmitting or storing entered values, so the form only validates and confirms. A production version would need a server endpoint, consent wording that meets Malaysia's PDPA, and rate limiting.
- **3D loads with the page.** three.js is a large download and loads on every visit, even if the visitor never opens the 3D view. A production version would load it only when the explorer scrolls into view, and show a static image first.
- **Compass labels and 3D are not read by screen readers.** The list and the sun readout carry the same information.
- **Before production:** real content and imagery with usage rights, a real privacy notice, cross-browser and device testing, a contrast audit, and a performance budget.

## 8. Maintainability

**Update content:**
- Copy and FAQ: `components/Hero.tsx`, `components/Benefits.tsx`, `components/Faq.tsx`, `components/SiteFooter.tsx`.
- Units, prices, floors and neighbouring buildings: `lib/units.ts` (`FLOOR_PLANS`, `FACING_PSF_PREMIUM`, `NEIGHBOURS`, `TOWER`).
- Periods and the months used for averages: `PERIOD_MONTHS` in `lib/exposure.ts`.
- Brand colours: `lib/palette.ts`, the single source for the page and the 3D view.
- Site location and time zone: `SITE` in `lib/sun.ts`.

**Redeploy:** push to the main branch. Vercel builds and deploys automatically.

**Restore a previous version:**
- In Vercel, open **Deployments**, choose an earlier successful deployment, and select **Promote to Production**.
- Or in Git, `git revert <commit>` for one change, or `git checkout <commit> -- .` to bring back an older tree, then commit and push.

## 9. Assets, libraries and credits

| Item | Source | Licence | Use |
|---|---|---|---|
| Fraunces (variable) | Fontsource `@fontsource-variable/fraunces` | SIL Open Font Licence | Headings |
| DM Sans (variable) | Fontsource `@fontsource-variable/dm-sans` | SIL Open Font Licence | Body text |
| Next.js | `next` | MIT | Framework |
| React | `react`, `react-dom` | MIT | UI |
| three.js | `three` | MIT | 3D rendering |
| React Three Fiber | `@react-three/fiber` | MIT | React bindings for three.js |
| Drei | `@react-three/drei` | MIT | Orbit controls and helpers |
| Solar position | NOAA General Solar Position Calculations (public domain), implemented in `lib/sun.ts` | Public domain | Sun maths |
| Wordmark sun, hero illustration, tower and window drawings | Created for this project | Original | Brand and imagery |

No photographs or third-party images are used. No third-party scripts or trackers are loaded.

## 10. AI assistance disclosure

Material assistance from **Claude (Anthropic AI model)**, used through the Claude desktop and web app:

- **Code:** most of the TypeScript, React components and CSS were drafted with AI help. Which files: everything under `app/`, `components/`, `lib/` and `scripts/`. I reviewed, ran and changed the code, and I am responsible for it.
- **Tests:** the browser test in `tests/e2e.py` and the sun checks in `scripts/check-sun.ts` were written with AI help and run by me.
- **Design:** the Figma layouts were built with AI help from the brief and my brand rules.
- **Content:** the copy and FAQ were drafted with AI help. The fictional brand, audience and primary action are my decisions.

**My own decisions:** the concept and audience, the primary action, the solar-noon split, the three priorities, the decision to use yearly, the brand rules, and the trade-off of not transmitting form data.

**Contributions by me:** reviewing and adjusting the code, debugging the console warnings (shadow type, compass labels, hydration), running and interpreting the tests, and the deployment steps.

## 11. Declaration

I confirm that I have disclosed material assistance and external contributions, and can explain and modify this submission independently.

Candidate: Nabila Date: 18 Oct 2026
