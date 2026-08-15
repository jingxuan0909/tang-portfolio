# Design QA

- Source visual truth: `C:\Users\Acer\AppData\Local\Temp\codex-clipboard-1bcc641b-ea26-4b57-9d11-3369bb75fcb7.png`
- Implementation screenshot: `C:\Users\Acer\OneDrive\Desktop\Codex\tang-portfolio\tmp\qa\projects-mobile-528.png`
- Combined comparison: `C:\Users\Acer\OneDrive\Desktop\Codex\tang-portfolio\tmp\qa\projects-mobile-comparison.png`
- Viewport: 528 × 890 CSS px
- Source pixels: 528 × 890
- Implementation pixels: 528 × 890 at device scale factor 1
- Density normalization: none required
- State: public Projects route, top of page, mobile navigation collapsed

## Full-view comparison evidence

The combined comparison confirms that the implementation preserves the source hierarchy: coral Projects eyebrow, serif Recent Projects heading, navy/coral project cards, full-bleed project marks, two-line descriptions, and newest-first vertical ordering. The dedicated route intentionally adds the shared public header, short explanatory copy, and a GitHub action before the list.

## Focused region comparison evidence

The first five project cards were checked at the same 528 px width. Icon scale, typography hierarchy, card radius, border color, horizontal alignment, text truncation, and vertical spacing remain consistent with the source design language. No separate crop was needed because these details are legible in the equal-size combined comparison.

## Required fidelity surfaces

- Fonts and typography: Cormorant Garamond headings and DM Sans supporting copy match the existing portfolio system and source hierarchy.
- Spacing and layout rhythm: compact intro and consistent 14 px list gaps keep the route dense without crowding; no horizontal overflow was detected at 390 px or 528 px.
- Colors and visual tokens: navy surfaces, blue borders, cream text, muted blue copy, and coral highlights use the established tokens.
- Image quality and asset fidelity: uploaded project logos render edge-to-edge with no extra inner frame or padding.
- Copy and content: all eight existing projects render in stored order, with GitHub and individual project destinations present.

## Findings

No actionable P0, P1, or P2 visual differences remain. The extra public header, explanatory sentence, and GitHub button are intentional requirements for the dedicated Projects route.

## Comparison history

1. Initial implementation used the generic oversized page intro, which delayed the first project cards and drifted from the compact source layout.
2. Replaced it with a compact Projects-specific intro and recaptured at 528 × 890. The project list now begins within the first viewport and matches the requested card hierarchy.

## Interaction and runtime checks

- `/projects` renders eight project links and the Projects navigation item is active.
- Home renders the first four project records and its View all projects link targets `/projects`.
- GitHub CTA resolves to the configured GitHub URL.
- No horizontal overflow at 390 px or 528 px.
- Browser console reported no warnings or errors on `/projects`.
- Admin visual verification remains authentication-gated; the reusable collapse component was build-verified and applied to the eight requested editors without changing stored content.

final result: passed
