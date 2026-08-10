# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable product decisions

- The selected visual target is the Aurora Atelier ImageGen mock (`exec-a91a7215-4830-4085-882d-ad0dfa325b96.png`).
- Public navigation is Home, About, Resume, and Contact. The private `/admin` route is absent from the top navigation but accessible through a discreet Admin button in the footer.
- Use the real portrait extracted from the user's resume in both the hero and footer.
- Use the user-provided WhatsApp portrait as the canonical portrait; the homepage hero must display the original full color without a monochrome filter.
- Show Semester Results, but never show Current CGPA or private identity/address fields.
- The About copy positions Tang Keng Hin as a Year 3 Computer Science student specializing in Cybersecurity and seeking a 16+ week internship.
- Public interaction should feel as lively as JackyDevBit through scroll reveals, parallax, page transitions, and polished hover states, without copying its visual identity.
- Public role wording is `Computer Science (Cybersecurity) Student`.
- Connect areas include GitHub, LinkedIn, Facebook, Gmail, and WhatsApp; social destinations remain editable in Admin.
- Awards and certificates are public, clickable credentials backed by uploaded PDF/image files; authenticated Admin users can add, edit, upload, and remove credential entries.
- Authenticated Admin users can upload or edit the shared portrait used by Home, About, and the footer.
- Home presents Semester Results followed by Experience and a combined Awards & Certificates showcase; Resume also includes Extra Curricular Activities and Projects.
