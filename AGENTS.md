<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Design System & Styling Guardrails

- **No Unnecessary Borders**: Avoid arbitrary or decorative borders; only use borders when explicitly required by the reference design system.
- **No Unnecessary Shadows**: Avoid random drop-shadows; keep elevation minimal, purposeful, and aligned with reference layouts.
- **No Unnecessary Pills**: Do not insert arbitrary pill badges without meaningful user-facing context.
- **No Blinking or Beeping Icons**: Absolutely zero blinking, pulsing, or pinging dots (`animate-pulse`, `animate-ping`) anywhere in the application.
- **Strict Color Palette Adherence / No Random Colors**: Never use arbitrary or random colors that are not part of the official website theme. All components must strictly use the approved theme colors: Primary (`#0F313A`), Secondary (`#BA1C20`), Navbar Menu Background (`#F0F2F5`), and standard neutral slates/whites for text and backgrounds.
- **No Unnecessary Cards / No Card-by-Card Clutter**: Never compartmentalize simple text or lists into arbitrary boxed cards with borders, icons, or emojis. Avoid the repetitive pattern of "icon + headline + subtext" in isolated boxes. Maintain open, clean, typography-driven layouts directly on the page background as shown in the reference designs.

