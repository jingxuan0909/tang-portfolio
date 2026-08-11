# Design QA

## Comparison target

- Source: selected Aurora Atelier mockup, `864 x 1821` pixels.
- Implementation: local Home route at `http://localhost:4173/`, captured at the default in-app desktop viewport (`1279 x 946` per viewport capture) plus a `390 x 844` responsive check.
- Final combined visual evidence: `design-qa-final-comparison.png`, with the source and revised implementation normalized to equal column widths.
- Focused regions: hero/portrait/navigation and About/Projects/Semester Results. Focused views were required because the full-page concept contains small type that is not reliably readable at a single scaled view.

## Initial findings and fixes

1. **P2 - Image fidelity, hero portrait:** The first implementation showed the resume photo on a bright white background, while the selected mock used a muted blue monochrome portrait integrated into the aurora palette. Fixed by applying a restrained grayscale/blue tonal treatment to the real resume portrait in the hero and footer while preserving the user's actual identity and source image.
2. **P2 - Copy/content, About preview:** The first implementation omitted the third About paragraph, weakening the internship and security-first message visible in the selected concept. Fixed by rendering all three approved About paragraphs.
3. **P3 - Content accuracy:** The selected mock labels results as Semesters 1-6, while the resume contains 1, 2, 2.5, 3, 4, and 4.5. The implementation intentionally follows the user's resume rather than reproducing inaccurate mock labels.

## Final fidelity review

- **Fonts and typography:** Passed. Cormorant Garamond recreates the elegant display-serif hierarchy; DM Sans provides the compact uppercase metadata and readable body copy. Weight, line height, wrapping, and scale preserve the source hierarchy on desktop and mobile.
- **Spacing and layout rhythm:** Passed. The hero split, portrait scale, two-column About/Projects region, six-result strip, internship callout, contact panel, and structured footer follow the selected composition. Mobile collapses cleanly without clipped text or unusable controls.
- **Colors and visual tokens:** Passed. Deep indigo/cobalt surfaces, cyan aurora, coral actions, low-contrast borders, and warm-white type map closely to the selected palette with accessible foreground contrast.
- **Image quality and asset fidelity:** Passed. The aurora/mountain background is a dedicated high-resolution raster asset and the portrait is the real image extracted from the resume. Cropping is sharp and consistent; no placeholder imagery remains.
- **Copy and content:** Passed. Public content uses the user's resume and approved About statement. Current CGPA and private identity/address data are absent.
- **Icons:** Passed. All functional icons use the Phosphor icon library with consistent weight, size, and alignment.
- **States and interactions:** Passed. Route navigation, active states, hover/focus treatments, scroll reveals, reduced-motion support, mobile menu, external contact links, Admin login, project add/delete, save success, and logout were verified. Browser console showed no warnings or errors.
- **Accessibility:** Passed. Semantic headings/navigation, alt text, labeled form fields, visible focus rings, practical mobile tap targets, reduced-motion behavior, and responsive text wrapping are present.
- **AI shortcut artifacts:** Passed. No placeholder avatar, inline SVG art, CSS illustration, emoji icon, or generic fake imagery remains.

## Remaining P3 notes

- The real resume portrait naturally differs from the generated model portrait in the concept; this is an intentional and required personalization.
- The deployed Admin will require a persistent server/database target when the user chooses hosting. The current local Vite server provides working authenticated persistence for this prototype.

## Implementation checklist

- [x] Desktop visual comparison
- [x] Mobile responsive check at `390 x 844`
- [x] Public route and link verification
- [x] Current CGPA exclusion check
- [x] Admin authentication, add/delete, and save verification
- [x] Console error/warning check

final result: passed

---

## Home Experience timeline update — 2026-08-11

- **Source:** user-provided `861 x 860` screenshot showing a dark editorial Experience timeline.
- **Implementation target:** Home Experience only; existing typography, colors, dynamic Supabase data, and newest-to-oldest sorting are preserved.
- **Implemented:** single-column timeline, subtle left rule, coral uppercase periods, serif company names, bold roles, full descriptions, and responsive spacing.
- **Automated build check:** passed with Vite production build.
- **Visual comparison:** blocked because both available desktop browser preview connections failed to initialize in this session. The local preview is open for user inspection; same-viewport capture and console inspection remain outstanding.

final result: blocked

---

## Admin project-card compact layout — 2026-08-12

- **Source visual truth:** user-provided Admin screenshot `C:\Users\Acer\AppData\Local\Temp\codex-clipboard-c6af3b82-4d06-4fca-b8ae-f52d9ed0cf01.png` at `1212 x 693` pixels.
- **Target state:** authenticated `/admin` Projects section at desktop width, with the same project content and dark theme.
- **Implemented:** project content now uses the full card width; Title and Project URL form the first information row, while Description and Technologies span the available width below it.
- **Implemented:** Description is clamped to three lines, Technologies to two lines, and long Project URLs truncate with an ellipsis. Full values remain available through Edit and native title hover text.
- **Implemented:** actions are separated from content by a divider and rendered in two explicit rows: regular edit/logo actions first, destructive removal actions second.
- **Responsive behavior:** project details collapse to one column below 600px and both action rows wrap without squeezing the information area.
- **Automated checks:** Vite production build and all four Sites worker/package tests passed.
- **Implementation screenshot:** unavailable.
- **Viewport/density normalization:** unavailable because no implementation capture could be produced.
- **Full-view and focused comparison evidence:** blocked because the in-app browser connection could not initialize in this session. Browser-rendered overflow, wrapping, focus-state, and console checks remain outstanding.

final result: blocked

---

## Uploaded project-logo tile correction — 2026-08-12

- **Source:** user-provided desired and current Project-list screenshots at the same narrow layout.
- **Visible mismatch:** uploaded PNGs were rendered with 7px padding inside the existing 52px purple icon slot, producing an unintended tile-inside-tile appearance.
- **Implemented:** removed the nested padding, changed uploaded artwork to cover the slot, and applied a centered 1.36 crop so the PNG's own purple tile becomes the single visible tile.
- **Asset-level check:** the actual 1254px chatbot PNG was rendered through the production crop math at 52px; the double frame is removed and the coral mark remains centered and legible.
- **Automated build check:** Vite Vercel production build passed.
- **Browser comparison:** blocked because the in-app preview connection failed to initialize. A same-viewport application screenshot and browser-console inspection remain outstanding.

final result: blocked

---

## Current Employment and project-logo update — 2026-08-11

- **Source:** user-provided Projects screenshot and the existing Home Experience design system.
- **Implemented:** an Admin-controlled Current Employment record with a visible/hidden switch; when visible it leads both Home and Resume Experience, with previous jobs below it.
- **Implemented:** authenticated JPG/PNG/WebP project-logo upload, preview, replacement, removal, and Phosphor fallback rendering on Home and Resume.
- **Automated checks:** Vite Vercel production build and whitespace validation passed.
- **Visual comparison:** blocked because the in-app preview connection failed to initialize in this session. Same-viewport visual capture, interaction inspection, and console inspection remain outstanding.

final result: blocked
