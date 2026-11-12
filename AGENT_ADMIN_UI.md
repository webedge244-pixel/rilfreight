# AGENT_ADMIN_UI: Definitive Admin UI & Styling Specification

> **Mandatory Authority**: Every agent working on the Admin Console must strictly adhere to the layout rules, geometry, color roles, and negative constraints documented in this file.

---

## 1. Universal "DO NOT" Directives (Zero Exceptions)

1. **NO SHADOWS**: The entire admin dashboard uses zero box-shadows (`shadow-none`). Do not add shadows unless explicitly instructed by the user.
2. **NO PULSING OR FLASHING ICONS**: Strictly zero `animate-pulse`, `animate-ping`, or animated decorative effects.
3. **NO ISOLATED SINGLE-DETAIL CARDS**: Related information must share unified, cohesive containers. Avoid cluttering the screen with multiple isolated single-stat boxes.
4. **NO UNNECESSARY ICONS**: Never use icons for pure decoration. Icons are used only when functionally required.
5. **NO GENERIC CARD FORMULAS**: Strictly ban the repetitive *"icon + headline + minor subtext"* box pattern. Layouts must be open, typography-driven, and high-density.
6. **NO ICONS IN NAVIGATION LINKS**: Both the desktop sidebar and the mobile slide-down drawer use text-only links.

---

## 2. Color System & Theme (Black & White Dominance)

Black and White form the dominant structural foundation. The three brand colors play **supporting accent roles only**.

### Brand Colors (Locked — No Other Colors Permitted)
- **Primary**: `#0F313A` (Deep Nautical Teal) — CSS var: `--color-primary`
- **Secondary**: `#BA1C20` (Bold Crimson Red) — CSS var: `--color-secondary`
- **Tertiary / Action Accent**: `#F9BC15` (Amber Yellow)

### Light Mode
| Element | Value |
| :--- | :--- |
| **Workspace Canvas** | White (`#FFFFFF`) or faint neutral (`#FAFAFA`) |
| **Card Surfaces** | Subtle tint — very faint warm grey (`slate-50` / `slate-100`) |
| **Inactive Nav Links** | Black (`#000000`), bold uppercase |
| **Active Nav Link Text** | Primary Teal (`#0F313A`) |
| **Active Nav Underline** | Crimson Red (`#BA1C20`) |
| **Bottom-Right Trigger** | Crimson Red (`#BA1C20`) bg, white text |
| **Primary CTA Buttons** | Crimson Red (`#BA1C20`) bg, white text |
| **Tertiary Accents** | Amber Yellow (`#F9BC15`) for highlights, tags, change indicators |
| **Dark Accent Panels** | Primary Teal (`#0F313A`) bg, white text |

### Dark Mode
| Element | Value |
| :--- | :--- |
| **Workspace Canvas** | Deep Black (`#0a0a0a`) |
| **Card Surfaces** | Elevated dark (`slate-900` / `#111`) |
| **Inactive Nav Links** | White (`#FFFFFF`), bold uppercase |
| **Active Nav Link Text** | White / Pale Teal tint |
| **Active Nav Underline** | Crimson Red (`#BA1C20`) |
| **Bottom-Right Trigger** | Crimson Red (`#BA1C20`) bg, white text |
| **Primary CTA Buttons** | Crimson Red (`#BA1C20`) bg, white text |
| **Tertiary Accents** | Amber Yellow (`#F9BC15`) |
| **Dark Accent Panels** | Crisp white bg, dark text (inverted contrast) |

---

## 3. Typography System (Locked to Geist)

**Font Families** (from `layout.tsx`):
- **Primary**: Geist Sans (`var(--font-geist-sans)` / `font-sans`)
- **Monospace**: Geist Mono (`var(--font-geist-mono)` / `font-mono`) — for tracking codes, data values, technical identifiers

| Role | Classes | Usage |
| :--- | :--- | :--- |
| **Hero Number** | `text-4xl sm:text-5xl lg:text-6xl font-black` | Primary KPI value (e.g., `1,247`) |
| **Secondary Number** | `text-2xl sm:text-3xl font-bold` | Supporting stat in a multi-stat card |
| **Card Title** | `text-sm sm:text-base font-semibold` | Card section header |
| **KPI Label** | `text-xs font-normal text-slate-400` | Descriptor beneath a number |
| **Nav Links** | `font-black uppercase tracking-tight` | Sidebar & mobile drawer links |
| **Table Text** | `text-sm font-normal` | Data table cells |
| **Accent Tag** | `text-xs font-bold uppercase tracking-wider text-[#BA1C20]` | Change indicator, alert tag |
| **Tracking Codes** | `font-mono font-semibold` | Shipment codes, AWB numbers |

---

## 4. Layout & Shell Architecture

### A. Desktop Geometry (>= 1024px)
- **Floating Island Architecture**: The screen consists of an outer canvas (`bg-[#F0F2F5]` / dark `bg-[#07090A]`) with padding (`p-2.5 sm:p-3 lg:p-4`). Both the Sidebar and the Main Workspace are freestanding, floating rounded islands with halved border radius (`rounded-xl`, ~12px) separated by physical gap space, NOT pinned edge-to-edge and NOT separated by a single divider line.
- **Zero Top Bar**: There is NO top navigation or header bar on desktop.
- **Left Sidebar Floating Island**:
  - Freestanding container with halved border radius (`rounded-xl bg-white dark:bg-[#121619]`, zero borders).
  - **Collapsible / Expandable**: Toggles smoothly between **Expanded** (`w-[256px]` / `w-[280px]`) and **Collapsed / Shrunk** (`w-[76px]`).
  - **Expanded Mode**:
    - **Top**: Circular Profile Image (avatar) + Text: **"Hello Admin"** + Collapse toggle icon.
    - **Navigation Rail**: Text-only, uppercase, bold Geist Sans (`text-xl xl:text-2xl font-black uppercase tracking-tight whitespace-nowrap`).
      - Standard state: Black text (Light) / White text (Dark).
      - Active state: Primary Teal (`#0F313A`) text with a solid Crimson Red (`#BA1C20`) underline.
      1. `DASHBOARD` (`/admin/dashboard`)
      2. `SHIPMENTS` (`/admin/shipments`)
      3. `NEW SHIPMENT` (`/admin/shipments/new`)
      4. `USERS` (`/admin/users`)
      5. `SEND EMAIL` (`/admin/email`)
  - **Collapsed / Shrunk Mode**:
    - Compact vertical rail with centered icons in rounded pill slots.
    - Active icon highlighted with `#0F313A` fill and Crimson Red (`#BA1C20`) indicator dot.
  - **Bottom-Right Corner Cutout Trigger**:
    - Recreates the exact notched corner cutout tab from the reference wireframe (`rounded-tl-3xl rounded-br-xl`, flush with bottom-right edges) housing the Lucide `Settings` gear icon.
    - **Full-Width Bottom Expansion**: On click, the corner cutout itself smoothly expands across the entire width (`w-full`) of the sidebar/dropdown bottom to a compact height showing strictly:
      - Top-right close button ("X") to collapse back into the corner tab.
      - **SETTINGS** (`/admin/settings`): Large bold uppercase text (`text-lg xl:text-xl font-black`).
      - **LOG OUT**: Large bold uppercase text (`text-lg xl:text-xl font-black`).
      - Zero icons, zero dividers, and zero additional sub-headers.
- **Right Main Workspace Floating Island**:
  - Freestanding container with halved border radius (`rounded-xl bg-white dark:bg-[#121619]`, zero border, contrast-separated).
  - Contains its own internal scrollable canvas for page content with `.custom-scrollbar`.
  - **Zero Redundant Page Headers**: Page titles are strictly indicated by the active desktop sidebar item and mobile floating top bar. The main content section never repeats duplicate `<h1>` page headers (e.g. "Dashboard", "Shipments", "New Shipment", "Users", "Send Email", "Settings"), starting immediately with actionable content, top metrics, or forms.

### B. Mobile Geometry (< 1024px)
- **Two Freestanding Floating Sections**:
  - **1. Standalone Floating Top Bar**: Sits in its own rounded floating card matching the main section's radius (`rounded-xl bg-white dark:bg-[#121619] px-5 py-2`), separated from the main body below by empty canvas space. Shows Current Page Title in prominent bold typography (`text-base sm:text-lg font-black uppercase`) on the left and Hamburger Button on the right.
  - **2. Standalone Floating Main Body**: Sits underneath, inside its own rounded floating container (`rounded-xl`) with padding from canvas borders.
- **Top-Anchored Downward-Only Height Expansion**:
  - Tapping hamburger expands the floating top bar **strictly downwards** from the top edge until it covers the main section (`fixed top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 h-[calc(100dvh-20px)] rounded-xl bg-white dark:bg-[#121619]`).
  - **Origin locked to top (`origin-top`)**: The top coordinates never move and there is zero vertical jumping or center scaling.
  - **Crucially retains surrounding canvas margins**: It never touches the physical screen edges, preserving the floating island aesthetic.
  - Hamburger morphs into an **"X"** close icon.
  - Zero divider lines inside the expanded drawer.
  - Houses Profile image + "Hello Admin", enlarged text-only bold uppercase links (`text-2xl sm:text-3xl font-black`), and bottom Settings & Log Out trigger.
  - Tapping "X" or any link collapses it smoothly back into the compact floating top bar.

---

## 5. Bento Card Design System

### 5.1 Core Design Philosophy (From Approved Reference Images)

1. **Typography-First Data Display**: Primary data values are MASSIVE (`text-4xl` to `text-6xl`, `font-black`). Labels are tiny and muted (`text-xs`, `text-slate-400`). The number speaks first.

2. **Asymmetric Bento Grid**: Variable-size mosaic using CSS Grid with explicit spans:
   - **Wide cards** (`col-span-2`): Trend charts, data tables.
   - **Tall cards** (`row-span-2`): Vertical lists, milestone timelines.
   - **Standard cards** (`col-span-1`): Single KPI with donut/gauge.
   - Grid: `grid-cols-1` (mobile) → `grid-cols-2` (tablet) → `grid-cols-3` or `grid-cols-4` (desktop).

3. **Background Tinting for Separation**: Cards float on subtle background tint differences — NOT borders or shadows. Canvas is white/`#FAFAFA`, card surfaces are `slate-50` or faint warm tint.

4. **Dark Inverted Accent Panels**: 1–2 cards per page use `#0F313A` bg with white text for visual anchoring.

5. **Consolidated Multi-Stat Cards**: Related metrics ALWAYS share one card with numbers side-by-side and a shared chart below.

6. **Inline Chart Integration**: Charts live inside their parent card next to the headline number.

7. **Minimal Chrome**: `rounded-2xl` or `rounded-3xl` corners. No shadows. No heavy borders. Generous internal padding (`p-6` to `p-8`).

### 5.2 Card Type Taxonomy

| Card Type | Grid Span | Content Pattern |
| :--- | :--- | :--- |
| **Hero KPI** | `col-span-1` | Massive number + tiny label + optional chart |
| **Multi-Stat Row** | `col-span-2` | 2–4 big numbers side-by-side + shared chart |
| **Chart Panel** | `col-span-2` | Title + number + embedded chart |
| **Dark Accent Panel** | `col-span-1` or `2` | `#0F313A` bg, white number + label |
| **List/Table Panel** | `col-span-1` or `2`, `row-span-2` | Compact data rows or table |
| **Map Panel** | `col-span-2`, `row-span-2` | Embedded Leaflet map (shipment detail only) |

---

## 6. Page-Specific Content Allocations

### `/admin/dashboard` — Operations Overview
- **Zero Redundant Top Headers**: Clean entry directly into the Bento Grid without duplicate metric counters.
- **Component 1 (Active Operations — Top Left, Span 2)**: Displays 3 key stats: Total Created (`1,247`), On Hold (`7` in alert red), and Active In Transit (`84`).
- **Two Sub-Cards (Bottom Left, Span 2 Subgrid)**:
  - **Component 2: Platform Users**: Standalone card displaying total registered client accounts in large prominent typography (`text-5xl sm:text-6xl font-black font-mono`).
  - **Component 3: Placeholder Card**: Clean empty slot container on desktop, hidden on mobile (`hidden sm:block`).
- **Component 4 (Created This Month — Right Column, Span 1)**: Stretched full height to match the left stack, retaining `#0F313A` dark nautical background.
  - Header: `Created This Month` on the left and `Go to Shipments` link on the right.
  - Gauge: Segmented 3-part ring with cyan arc for Ocean (`20`), lavender/purple arc for Air (`11`), and lime green arc for Ground (`7`).
  - Inner dial disc with 12 radial watch-face dots and bold center readout `38` (`Total Created`).
  - Outer radial callouts shifted with clear spacing preventing curve overlap.
- **Component 5 (Recent Dispatches — Full Width)**: Final full-width table showing tracking codes, transport mode icons, routes, live status, and ETAs.

### `/admin/shipments` — Shipments Directory
- Search bar + mode filter pills + "Create New Shipment" CTA
- Full-width sortable data table with status, tracking code, mode, origin/destination, ETA

### `/admin/shipments/new` — Create Shipment
- Clean spacious form layout (not bento grid)
- Mode selector, origin/destination, cargo details, schedule

### `/admin/shipments/[id]` — Shipment Command Center
- Shipment header: code, status, pause/resume controls
- Live Leaflet map panel + milestones + cargo manifest

### `/admin/users` — User Directory
- User count + search + full data table

### `/admin/email` — Email Dispatcher
- Clean composer form: recipient, subject, body, send

### `/admin/settings` — Platform Settings
- Sectioned settings form

---

## 7. Key Decisions Log
- Stacked boxes in wireframe = general content placeholders, not rigid two-box constraints
- Settings & Log Out live behind the bottom-right slide-out, not in the main nav
- Mobile top bar shows page title, NOT RILFREIGHT branding
- Active nav state = Primary Teal text + Crimson Red underline
- Demo data stored in a single `src/shared/lib/demoData.ts` file for easy Firebase swap
