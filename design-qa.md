# Design QA

- Source visual truth (broken mobile menu): `C:\Users\Acer\AppData\Local\Temp\codex-clipboard-9d204c4b-23d2-4d91-8986-3f09a3dbdb14.png`
- Source visual truth (Admin Projects structure): `C:\Users\Acer\AppData\Local\Temp\codex-clipboard-f7ba1782-7ada-447c-9a8f-e75dd1990236.png`
- Implementation menu screenshot: `C:\Users\Acer\OneDrive\Desktop\Codex\tang-portfolio\tmp\qa\mobile-menu-open-final.png`
- Implementation Projects screenshot: `C:\Users\Acer\OneDrive\Desktop\Codex\tang-portfolio\tmp\qa\projects-details-mobile-cards.png`
- Combined menu comparison: `C:\Users\Acer\OneDrive\Desktop\Codex\tang-portfolio\tmp\qa\mobile-menu-comparison.png`
- Browser viewport: 390 × 844 CSS px at device scale factor 1
- Menu source pixels: 497 × 1080; implementation pixels: 390 × 844
- Comparison normalization: implementation scaled to 497 × 1080; source browser chrome is intentionally excluded from layout judgments
- States: Home mobile menu open; Projects mobile list scrolled to detailed cards

## Full-view comparison evidence

The combined image shows the earlier failure and corrected state together. The source has transparent menu content intersecting the hero name. The implementation gives the header and expanded navigation a higher stacking layer, a fully opaque navy background, a clear close control, and uninterrupted menu labels. The hero remains below the menu without drawing through it.

## Focused region comparison evidence

The Projects implementation was inspected at 390 px. Detailed descriptions wrap without clipping, each card shows its Technologies as compact coral-outlined tags, project logos remain full-bleed, and the page has no horizontal overflow. Home was checked separately and continues to show four compact cards with no technology tags.

## Required fidelity surfaces

- Fonts and typography: navigation tracking, serif project titles, and supporting copy retain the established hierarchy.
- Spacing and layout rhythm: the open menu has even vertical targets and a solid contained panel; detailed project cards expand naturally for longer copy.
- Colors and visual tokens: menu and cards use the existing opaque navy, blue border, cream text, and coral highlight tokens.
- Image quality and asset fidelity: uploaded project logos remain sharp, full-bleed, and free of an extra inner frame.
- Copy and content: Admin now separates `Short description (Home page)` from `Detailed description (Projects page)`. Existing projects receive the current description as a safe short-description fallback until the owner edits them.

## Findings

No actionable P0, P1, or P2 visual issues remain. The mobile navigation no longer overlaps the hero name, and the two public project contexts now have distinct content density.

## Comparison history

1. Source evidence showed menu labels sharing the same visible layer as the hero title.
2. Raised the header and menu stacking contexts, replaced the translucent dropdown with an opaque panel, and added shadow/border separation.
3. Post-fix comparison confirms readable navigation with no label/title collision.
4. Added separate short and detailed project fields, then verified detailed cards and technology tags at the phone breakpoint.

## Interaction and runtime checks

- Mobile menu button toggles `aria-expanded` and displays all five navigation destinations.
- Open menu computed background is opaque `rgb(3, 11, 32)` with navigation above the main content.
- Projects page renders eight technology groups from Supabase project data.
- Home renders four project cards and zero technology groups.
- No horizontal overflow at 390 px.
- Browser console reported no warnings or errors.
- Production build and all four Sites worker tests passed.

final result: passed
