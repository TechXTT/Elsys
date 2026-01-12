# Builder UI/UX Analysis & Improvement Plan

> **Document Purpose**: This document analyzes the Page Builder's UI/UX patterns and serves as a reference for improving the News Builder to achieve similar quality and consistency.

---

## Table of Contents

1. [Page Builder Analysis](#page-builder-analysis)
2. [News Builder Current State](#news-builder-current-state)
3. [Key Differences](#key-differences)
4. [Improvement Recommendations](#improvement-recommendations)
5. [Implementation Changelog](#implementation-changelog)

---

## Page Builder Analysis

### Architecture Overview

The Page Builder uses a **three-panel layout** with clear separation of concerns:

```
+------------------------------------------------------------------+
|                        BuilderToolbar                             |
|  [Blocks Panel] | Undo/Redo | Block Count | Device Preview | Save |
+------------------------------------------------------------------+
|  BlockPalette  |        BuilderCanvas          |  PropertyPanel  |
|  (Left Panel)  |        (Center)               |  (Right Panel)  |
|                |                               |                  |
|  - Search      |  - Visual block preview       |  - Field editors |
|  - Categories  |  - Drag-and-drop zones        |  - Block config  |
|  - Drag source |  - Selection/hover states     |  - Nested fields |
|                |  - Block toolbars             |                  |
+------------------------------------------------------------------+
```

**Key Files**:
- [PageBuilder.tsx](../app/admin/components/page-builder/PageBuilder.tsx) - Main wrapper & toolbar
- [PageBuilderContext.tsx](../app/admin/components/page-builder/PageBuilderContext.tsx) - State management
- [BuilderCanvas.tsx](../app/admin/components/page-builder/BuilderCanvas.tsx) - Central editing area
- [BlockPalette.tsx](../app/admin/components/page-builder/BlockPalette.tsx) - Block library sidebar
- [PropertyPanel.tsx](../app/admin/components/page-builder/PropertyPanel.tsx) - Property editor sidebar
- [BlockWrapper.tsx](../app/admin/components/page-builder/BlockWrapper.tsx) - Individual block UI

---

### UI Components & Patterns

#### 1. Toolbar Design (BuilderToolbar)

**Location**: Top of the builder, full width

**Layout**: Three sections with clear grouping
- **Left**: Panel toggles + Undo/Redo + Block count
- **Center**: Device preview modes (Desktop/Tablet/Mobile) + Preview toggle
- **Right**: Save button with status + Properties panel toggle

**Visual Elements**:
- Vertical dividers (`h-5 w-px bg-slate-200`) separate logical groups
- Active states use brand colors (`bg-brand-50 text-brand-600`)
- Disabled states use `opacity-30`
- Unsaved changes indicator with pulsing dot animation
- Loading spinner during save

**Code Pattern** (from PageBuilder.tsx:66-206):
```tsx
<div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
  {/* Left section */}
  <div className="flex items-center gap-2">
    {/* Panel toggle */}
    <button className={showLeftPanel ? "bg-brand-50 text-brand-600" : "..."}>
    {/* Divider */}
    <div className="mx-2 h-5 w-px bg-slate-200" />
    {/* Undo/Redo */}
  </div>
  {/* Center section */}
  {/* Right section */}
</div>
```

#### 2. Block Palette (Left Panel)

**Features**:
- **Search**: Real-time filtering with search icon prefix
- **Categories**: Collapsible sections with icons and item counts
- **Block Items**: Draggable cards with icon, label, description
- **Hint**: Footer tip about drag-and-drop

**Visual Elements**:
- Search input with icon inside (`pl-9`)
- Category headers with chevron indicators
- Block items with hover effects and grip handle
- Item icons in rounded containers with ring borders

**Interaction States**:
- Default: `bg-slate-50 border-transparent`
- Hover: `hover:border-brand-300 hover:bg-brand-50 hover:shadow-sm`
- Dragging: `active:cursor-grabbing`

#### 3. Property Panel (Right Panel)

**Features**:
- **Header**: Block type icon + label + close button
- **Description**: Block purpose explanation
- **Fields**: Scrollable form with various input types
- **Empty State**: Icon + message when no block selected

**Field Types Supported**:
| Type | Component | Features |
|------|-----------|----------|
| `text` | TextField | Label, placeholder, required indicator |
| `textarea` | TextareaField | Multi-line, auto-resize potential |
| `richtext` | RichTextField | Toolbar + preview toggle |
| `number` | NumberField | Min/max constraints |
| `select` | SelectField | Dropdown options |
| `toggle` | ToggleField | Styled switch component |
| `image` | ImageField | URL input + preview |
| `link` | LinkField | URL input with icon |
| `array` | ArrayField | Expandable list with nested fields |

**Rich Text Toolbar** (PropertyPanel.tsx:130-213):
- Bold, Italic
- Headings (H1, H2, H3)
- Lists (Bullet, Numbered)
- Quote, Code, Link

#### 4. Canvas & Block Wrapper

**Canvas Features**:
- Click outside blocks to deselect
- Drag-over zones at end of list
- Empty state with drag prompt

**Block Wrapper Features**:
- **Selection States**:
  - Selected: `border-brand-500 ring-4 ring-brand-500/10`
  - Hovered: `border-brand-300 bg-slate-50/50`
  - Default: `border-transparent hover:border-slate-200`

- **Floating Toolbar** (appears on hover/select):
  - Drag handle (grip icon)
  - Block type label with icon
  - Move up/down buttons
  - Preview toggle (eye icon)
  - Duplicate button
  - Delete button (red accent)

- **Drop Indicators**:
  - Before: `-top-1 h-1 bg-brand-500 shadow-lg`
  - After: `-bottom-1 h-1 bg-brand-500 shadow-lg`

- **Left Edge Selection Indicator**: Vertical brand-colored bar

---

### State Management Pattern

**Context + Reducer Architecture** (PageBuilderContext.tsx):

```typescript
type PageBuilderState = {
  blocks: BlockInstance[]
  selectedBlockId: string | null
  hoveredBlockId: string | null
  isDragging: boolean
  dragSource: { type: 'palette' | 'canvas', blockType?, blockId?, index? }
  dropTarget: { index: number, position: 'before' | 'after' }
  history: BlockInstance[][]  // For undo/redo
  historyIndex: number
}
```

**Key Actions**:
- `ADD_BLOCK`, `REMOVE_BLOCK`, `UPDATE_BLOCK`, `MOVE_BLOCK`
- `SELECT_BLOCK`, `HOVER_BLOCK`
- `START_DRAG`, `SET_DROP_TARGET`, `END_DRAG`
- `UNDO`, `REDO`

**Benefits**:
- Centralized state
- History tracking for undo/redo
- Predictable state transitions
- Easy to debug

---

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |

---

### Responsive Design

**Device Preview Modes**:
- Desktop: `100%` width
- Tablet: `768px` max-width with padding
- Mobile: `375px` max-width with padding

**Panel Behavior**:
- Left panel width: `w-96` (384px)
- Right panel width: `w-[28rem]` (448px)
- Panels can be toggled independently
- Canvas takes remaining space (`flex-1`)

---

## News Builder Current State

### Architecture Overview

The News Builder uses a **two-column form layout**:

```
+------------------------------------------------------------------+
|                        (No Toolbar)                               |
+------------------------------------------------------------------+
|        Form Editor (Left - 2fr)    |    News List (Right - 1fr)  |
|                                    |                              |
|  - Title input                     |  - Search filter             |
|  - Status select                   |  - Status filter             |
|  - Slug input                      |  - Sort options              |
|  - Images section                  |  - Post list                 |
|  - Date picker                     |  - Edit/Delete buttons       |
|  - Excerpt textarea                |                              |
|  - Markdown content                |                              |
|  - Preview pane                    |                              |
|  - Submit buttons                  |                              |
+------------------------------------------------------------------+
|  [Locale Switcher - Fixed Bottom Left]                           |
+------------------------------------------------------------------+
```

**Key File**: [news-manager.tsx](../app/admin/news/news-manager.tsx)

---

### Current Features

#### Form Fields
- Title (required)
- Status (draft/published)
- Slug (auto-generated, editable)
- Images (multiple upload, size selection, featured image)
- Date picker
- Excerpt
- Markdown content (textarea)

#### Preview Section
- Title
- Date label
- Excerpt
- Featured image
- Markdown rendered preview
- Content metrics (word count, reading time, image count)

#### News List Panel
- Search by title/slug
- Filter by status (all/published/drafts)
- Sort by date or title
- Edit/Delete/View actions
- Draft badges

#### Special Features
- Multi-locale support (BG/EN)
- Draft caching per locale
- Auto-translate button
- Edit mode indicator banner

---

### Current Pain Points

1. **No Toolbar**: All controls embedded in form, less discoverable
2. **No Undo/Redo**: Can't reverse accidental changes
3. **Limited Rich Text**: Plain textarea without formatting toolbar
4. **No Keyboard Shortcuts**: No quick save or other shortcuts
5. **Linear Form Layout**: Long scrolling form, less efficient space use
6. **No Visual Block Editing**: Content is plain markdown
7. **Inconsistent Styling**: Different patterns from Page Builder
8. **No Device Preview**: Can't preview mobile/tablet rendering

---

## Key Differences

| Feature | Page Builder | News Builder |
|---------|-------------|--------------|
| **Layout** | 3-panel (palette/canvas/props) | 2-column (form/list) |
| **Toolbar** | Dedicated top bar | Embedded in form |
| **State Management** | Context + Reducer | Multiple useState |
| **Undo/Redo** | Yes | No |
| **Keyboard Shortcuts** | Ctrl+S, Ctrl+Z | None |
| **Rich Text** | Toolbar + preview | Plain textarea |
| **Device Preview** | Desktop/Tablet/Mobile | None |
| **Drag & Drop** | Full support | None |
| **Visual Feedback** | Selection/hover states | Limited |
| **Empty States** | Styled prompts | Basic text |

---

## Improvement Recommendations

### Phase 1: Quick Wins (Consistency)

1. **Add Toolbar**
   - Undo/Redo buttons
   - Save button with status indicator
   - Preview mode toggle
   - Device preview (optional)

2. **Improve Rich Text Editor**
   - Add formatting toolbar (bold, italic, headings, lists)
   - Add preview toggle
   - Use same RichTextField pattern from PropertyPanel

3. **Add Keyboard Shortcuts**
   - Ctrl+S to save
   - Ctrl+Z/Ctrl+Shift+Z for undo/redo

4. **Visual Consistency**
   - Use same button styles
   - Use same divider patterns
   - Use same color scheme (brand-*)

### Phase 2: Enhanced UX

5. **State Management Refactor**
   - Extract to NewsBuilderContext
   - Add history tracking for undo/redo
   - Centralize form state

6. **Preview Improvements**
   - Add device preview modes
   - Side-by-side editor/preview option
   - Full-screen preview mode

7. **Image Management Improvements**
   - Drag to reorder images
   - Inline image insertion in markdown
   - Better upload feedback

### Phase 3: Advanced Features (Optional)

8. **Block-based Content (Future)**
   - Allow structured content blocks
   - Reuse Page Builder's block system
   - Keep markdown as fallback

---

## Implementation Changelog

> This section tracks actual changes made to the News Builder.

### 2026-01-11 - Phase 1 Implementation (UI/UX Alignment)

**New Components Created:**

1. **NewsBuilderContext** ([components/NewsBuilderContext.tsx](../app/admin/news/components/NewsBuilderContext.tsx))
   - Context + Reducer pattern matching Page Builder architecture
   - Full undo/redo history support (up to 50 states)
   - Centralized form state management
   - Actions: SET_FIELD, SET_FORM, RESET_FORM, UNDO, REDO, image management actions
   - Exports: `NewsBuilderProvider`, `useNewsBuilder`, type definitions

2. **NewsBuilderToolbar** ([components/NewsBuilderToolbar.tsx](../app/admin/news/components/NewsBuilderToolbar.tsx))
   - Dedicated top toolbar matching Page Builder design
   - Left section: Post mode indicator, Cancel button (when editing), Undo/Redo buttons
   - Center section: Device preview mode switcher (Desktop/Tablet/Mobile), Preview toggle
   - Right section: Unsaved changes indicator, Save button with loading state, Panel toggle

3. **RichTextEditor** ([components/RichTextEditor.tsx](../app/admin/news/components/RichTextEditor.tsx))
   - Full-featured markdown editor with formatting toolbar
   - Toolbar buttons: Bold, Italic, H1-H3, Lists, Quote, Code, Link, Image, HR
   - Edit/Preview toggle with live markdown rendering
   - Image resolution for embedded images
   - Keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic)

4. **useNewsBuilderShortcuts** ([components/useNewsBuilderShortcuts.ts](../app/admin/news/components/useNewsBuilderShortcuts.ts))
   - Global keyboard shortcut handler
   - Ctrl+S / Cmd+S: Save
   - Ctrl+Z / Cmd+Z: Undo
   - Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y: Redo

**Refactored Components:**

5. **NewsManager** ([news-manager.tsx](../app/admin/news/news-manager.tsx))
   - Complete refactor to use NewsBuilderContext
   - New two-panel layout: Form (left, flex-1) + Preview/List (right, 28rem)
   - Consistent styling with Page Builder (rounded-lg, brand-* colors, etc.)
   - Form wrapped in provider with inner component pattern
   - All form state now managed through context

**Key Changes Summary:**

| Feature | Before | After |
|---------|--------|-------|
| Layout | 2-column grid | Toolbar + 2-panel flex |
| State | Multiple useState | Context + Reducer |
| Undo/Redo | None | Full history support |
| Markdown Editor | Plain textarea | Toolbar + preview |
| Keyboard Shortcuts | None | Ctrl+S, Ctrl+Z, Ctrl+Shift+Z |
| Styling | Mixed patterns | Consistent brand-* |
| Panel Toggle | None | Show/hide preview panel |
| Device Preview | None | Desktop/Tablet/Mobile modes |

**Files Added:**
- `app/admin/news/components/NewsBuilderContext.tsx`
- `app/admin/news/components/NewsBuilderToolbar.tsx`
- `app/admin/news/components/RichTextEditor.tsx`
- `app/admin/news/components/useNewsBuilderShortcuts.ts`
- `app/admin/news/components/index.ts`

**Files Modified:**
- `app/admin/news/news-manager.tsx` (complete refactor)

**Issues Encountered:**
- Redis connection error (`ENOTFOUND redis-14365.c311.eu-central-1-1.ec2.cloud.redislabs.com`)
  - **Cause**: Stale `REDIS_URL` environment variable pointing to old Redis server after provider migration
  - **Solution**: Update `REDIS_URL` in `.env` with new Redis connection string
  - **Documentation**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#issue-enotfound---redis-host-not-found)

---

### 2026-01-11 - Phase 2 Implementation (Block-Based Editor)

**Overview:**
Implemented a full block-based content editing system for the News Builder, similar to the Page Builder. Users can now toggle between traditional markdown editing and a visual block-based editor.

**New Block System Components:**

1. **Block Types & Metadata** ([components/blocks/types.ts](../app/admin/news/components/blocks/types.ts), [block-meta.ts](../app/admin/news/components/blocks/block-meta.ts))
   - 12 news-optimized block types:
     - **Text**: Heading, Paragraph, Quote, List, Callout, Code
     - **Media**: Image, Gallery
     - **Layout**: Divider, Table
     - **Embed**: Video, Link
   - Each block has: type, label, description, icon, category, fields, defaultProps
   - Field types: text, textarea, richtext, select, image, array

2. **NewsBlockPalette** ([components/blocks/NewsBlockPalette.tsx](../app/admin/news/components/blocks/NewsBlockPalette.tsx))
   - Left sidebar for block selection
   - Search functionality for filtering blocks
   - Collapsible category sections (Text, Media, Layout, Embed)
   - Drag-and-drop support for adding blocks to canvas
   - Block item cards with icon, label, and description

3. **NewsBlockCanvas** ([components/blocks/NewsBlockCanvas.tsx](../app/admin/news/components/blocks/NewsBlockCanvas.tsx))
   - Central editing canvas with visual block preview
   - Drag-and-drop reordering support
   - Click-to-select block behavior
   - Empty state with drop zone prompt
   - Device preview modes (desktop/tablet/mobile)

4. **NewsBlockWrapper** ([components/blocks/NewsBlockWrapper.tsx](../app/admin/news/components/blocks/NewsBlockWrapper.tsx))
   - Individual block container with floating toolbar
   - Selection and hover states with visual feedback
   - Toolbar actions: drag handle, move up/down, duplicate, delete
   - Drop position indicators (before/after)

5. **NewsBlockPreview** ([components/blocks/NewsBlockPreview.tsx](../app/admin/news/components/blocks/NewsBlockPreview.tsx))
   - Visual preview renderers for all 12 block types
   - Supports block-specific styling and layouts
   - Renders markdown in paragraph blocks
   - Shows placeholder states for empty content

6. **NewsBlockPropertyPanel** ([components/blocks/NewsBlockPropertyPanel.tsx](../app/admin/news/components/blocks/NewsBlockPropertyPanel.tsx))
   - Right sidebar for editing selected block properties
   - Dynamic field editors based on block field configuration
   - Supports: text, textarea, richtext, select, image, array fields
   - Shows empty state when no block is selected

7. **Block Serialization** ([components/blocks/block-serializer.ts](../app/admin/news/components/blocks/block-serializer.ts))
   - `blocksToMarkdown()`: Converts blocks to markdown for storage
   - `blocksToJson()`: Converts blocks to JSON for full fidelity storage
   - `jsonToBlocks()`: Parses JSON back to blocks
   - `markdownToBlocks()`: Basic markdown to blocks parser

**Context Updates:**

8. **NewsBuilderContext** - Block Support Added
   - New state fields: `blocks: NewsBlockInstance[]`, `useBlocks: boolean`, `selectedBlockId`, `hoveredBlockId`
   - New actions: ADD_BLOCK, REMOVE_BLOCK, UPDATE_BLOCK, MOVE_BLOCK, DUPLICATE_BLOCK, SELECT_BLOCK, HOVER_BLOCK, TOGGLE_BLOCK_MODE
   - New convenience methods: `addBlock()`, `removeBlock()`, `updateBlock()`, `moveBlock()`, `duplicateBlock()`, `selectBlock()`, `hoverBlock()`, `toggleBlockMode()`, `selectedBlock`

**NewsManager Integration:**

The news-manager.tsx now supports both editing modes:
- **Toggle switch** to switch between Block Editor and Markdown mode
- **Block mode layout**:
  - Left: Block Palette (72rem width)
  - Center: Metadata form + Block Canvas
  - Right: Property Panel (when block selected) or Preview/List
- **Markdown mode layout**: Original form layout with RichTextEditor
- Content is serialized to markdown for storage regardless of editing mode

**Block System Architecture:**

```
+------------------------------------------------------------------+
|                        NewsBuilderToolbar                         |
+------------------------------------------------------------------+
| NewsBlockPalette |    NewsBlockCanvas      | NewsBlockPropertyPanel|
|  (Left Panel)    |    (Center)             | (Right Panel)         |
|                  |                         |                        |
| - Search         | - Metadata form (top)   | - Block type header   |
| - Category:Text  | - Visual blocks         | - Dynamic field forms |
| - Category:Media | - Drag-drop zones       | - Empty state         |
| - Category:Layout| - Selection states      |                        |
| - Category:Embed | - Device preview        |                        |
+------------------------------------------------------------------+
```

**Files Added:**
- `app/admin/news/components/blocks/types.ts`
- `app/admin/news/components/blocks/block-meta.ts`
- `app/admin/news/components/blocks/NewsBlockPalette.tsx`
- `app/admin/news/components/blocks/NewsBlockCanvas.tsx`
- `app/admin/news/components/blocks/NewsBlockWrapper.tsx`
- `app/admin/news/components/blocks/NewsBlockPreview.tsx`
- `app/admin/news/components/blocks/NewsBlockPropertyPanel.tsx`
- `app/admin/news/components/blocks/block-serializer.ts`
- `app/admin/news/components/blocks/index.ts`

**Files Modified:**
- `app/admin/news/components/NewsBuilderContext.tsx` (added block support)
- `app/admin/news/news-manager.tsx` (integrated block editor)

---

### 2026-01-12 - UI/UX Improvements

**Language Switcher Integration:**
- Moved the floating language switcher (BG/EN toggle) from a fixed position in the bottom-left corner into the NewsBuilderToolbar
- The switcher now appears alongside the undo/redo buttons in the toolbar's left section
- Shows a loading spinner when switching locales
- File modified: `app/admin/news/components/NewsBuilderToolbar.tsx`

**Layout Expansion:**
- Removed `max-w-6xl` constraint from the admin layout to allow the news builder to use full available width
- Updated news page with negative margins to break out of parent padding and fill the screen
- Files modified: `app/admin/layout.tsx`, `app/admin/news/page.tsx`

**Bug Fix - Block Selection:**
- Fixed: Clicking on a block would not select it (selection was immediately cleared)
- **Root cause**: The canvas had an `onClick` handler that called `selectBlock(null)` to deselect blocks when clicking the background. The click event from blocks was bubbling up to the canvas, causing immediate deselection.
- **Solution**: Added `e.stopPropagation()` to the block container's click handler in NewsBlockWrapper to prevent the event from bubbling up to the canvas.
- File modified: `app/admin/news/components/blocks/NewsBlockWrapper.tsx`

```tsx
// Before (broken)
<div onClick={onSelect} ...>

// After (fixed)
<div onClick={(e) => { e.stopPropagation(); onSelect(); }} ...>
```

---

### 2026-01-12 - Date Format & Scheduled Publishing

**European Date Format:**
- Changed date display format in the News Builder admin UI from "11 January 2026" to "12/01/2026" (dd/mm/yyyy)
- This matches European user expectations for date formatting
- File modified: `app/admin/news/news-manager.tsx`

```tsx
// Before
return date.toLocaleDateString("en-GB", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

// After - European dd/mm/yyyy format
const day = date.getDate().toString().padStart(2, "0");
const month = (date.getMonth() + 1).toString().padStart(2, "0");
const year = date.getFullYear();
return `${day}/${month}/${year}`;
```

**Scheduled Publishing (Future Date Support):**
- Implemented logic to hide posts with future dates from public view
- Posts set to "Published" with a future date will only appear once that date arrives
- Admin users can still see and edit all posts regardless of date
- This enables scheduling posts in advance

**Implementation Details:**
- Modified `getNewsPosts()` to filter by `date: { lte: now }` for public queries
- Modified `getNewsPost()` to add the same date check for individual post access
- Cache keys remain the same; posts will appear automatically when their date arrives
- File modified: `lib/news.ts`

```typescript
// Public listing - only shows published posts with date <= now
where: {
  locale: { in: localesToFetch },
  published: true,
  date: { lte: now }
}

// Single post access check
const isPubliclyVisible = (row: NewsRow) => row.published && row.date <= now;
```

---

### 2026-01-12 - Image Upload for Block Editor

**Problem:**
- The Image and Gallery blocks only had URL input fields
- Users had no way to upload new images directly into blocks
- This broke the user workflow for adding images to news content

**Solution - ImageFieldEditor Enhancement:**
- Added file upload button that triggers a hidden file input
- New images are automatically added to the form's image collection
- Added "Gallery" button that shows all uploaded images for selection
- Maintained manual URL input as a collapsible option

**Features:**
- **Upload button**: Click to upload a new image file directly
- **Gallery picker**: Shows all images already uploaded for this post
- **Preview**: Shows selected image with remove button
- **URL fallback**: Collapsed "Or enter URL manually" option for external images

**Gallery Block Support:**
- Updated `ArrayFieldEditor` to properly render image fields within arrays
- Gallery items now show proper image upload UI for each image
- Added "Image 1", "Image 2" labels for clarity in gallery arrays

**Files Modified:**
- `app/admin/news/components/blocks/NewsBlockPropertyPanel.tsx`
  - Added imports for `Upload`, `ImageIcon`, `ChevronDown` from lucide-react
  - Added helper functions: `splitName`, `slugify`, `generateImageName`
  - Rewrote `ImageFieldEditor` with full upload/gallery/preview functionality
  - Added `ArraySubFieldInput` component to handle image fields in arrays
  - Updated `ArrayFieldEditor` to detect image-heavy arrays and render appropriately

---

### 2026-01-12 - News Editor Bug Fixes & Block-Based Seeding

**Critical Bug Fixes:**

1. **Blocks Not Loading When Editing Articles**
   - **Problem**: When clicking "Edit" on a news article or switching locales, the blocks array would not load into the editor
   - **Root Cause**: The `blocks` and `useBlocks` fields were missing from:
     - Draft type definition
     - Draft cache initialization
     - `cacheCurrentDraft()` function
     - `loadDraft()` function
     - Locale switching effect's `setForm()` call (most critical)
   - **Solution**: Added `blocks` and `useBlocks` to all draft-related code paths
   - **Files Modified**: `app/admin/news/news-manager.tsx`

2. **Save Button Unresponsive**
   - **Problem**: Form submission would not work properly in some scenarios
   - **Root Cause**: Form validation wasn't properly checking blocks, and state management was incomplete
   - **Solution**: Ensured all form state management includes blocks/useBlocks tracking
   - **Files Modified**: `app/admin/news/news-manager.tsx`

3. **Missing Featured Image Field**
   - **Problem**: No UI for selecting which uploaded image should be the featured/cover image for the news card
   - **Solution**: Added dedicated featured image selector with:
     - Visual preview showing the selected featured image
     - Dropdown to select from uploaded images
     - Image name overlay on preview
     - Descriptive help text
     - Appears below excerpt field in both block and markdown modes
   - **Files Modified**: `app/admin/news/news-manager.tsx`

**Database Schema Update:**

4. **Added Missing Database Columns**
   - **Problem**: `blocks` and `useBlocks` fields existed in Prisma schema but not in database
   - **Error**: `Invalid prisma.newsPost.findMany() invocation: Unknown field 'blocks'`
   - **Solution**: Created and applied migration:
     ```bash
     pnpm prisma migrate dev --name add_blocks_to_news
     ```
   - **Migration Created**: `prisma/migrations/20260112064659_add_blocks_to_news/`

**Seed Data Enhancement:**

5. **Block-Based News Articles in Seed Script**
   - **Updated**: All 18 news articles (9 unique × 2 locales) to use block-based content
   - **Implementation**:
     - First 6 articles: Full block definitions with Heading, Paragraph, List, Quote, and Callout blocks
     - Remaining 12 articles: Empty blocks arrays with `useBlocks: true` (ready for customization)
     - All articles retain `bodyMarkdown` for backward compatibility
   - **Block Types Used**:
     - `Heading` (h2, h3 levels)
     - `Paragraph` (body text)
     - `List` (bullet, numbered, checklist styles)
     - `Quote` (with style variants)
     - `Callout` (info, success types)
   - **Files Modified**: `prisma/seed.js`

**Example Block Structure:**
```javascript
blocks: [
  { id: 'blk-1', type: 'Heading', props: { text: 'Article Title', level: 'h2' } },
  { id: 'blk-2', type: 'Paragraph', props: { content: 'Article content...' } },
  { id: 'blk-3', type: 'List', props: { style: 'bullet', items: [
    { text: 'First item' },
    { text: 'Second item' }
  ]}},
  { id: 'blk-4', type: 'Callout', props: { type: 'success', title: 'Note', content: 'Important info' } },
],
useBlocks: true,
```

**TypeScript Fixes:**
- Fixed type errors in draft cache by adding proper type casts for blocks array
- Ensured translate draft includes blocks and useBlocks fields

**Files Modified:**
- `app/admin/news/news-manager.tsx` (blocks loading, featured image field, form state)

---

### 2026-01-12 - Block Mode Feature Parity

**Overview:**
Completed feature parity between block editor and markdown editor modes. Block mode now has image management, version history access, and auto-translation capabilities.

**Image Management in Block Mode:**

1. **Upload & Management Section**
   - Full file upload input with multiple file support
   - Image collection display with:
     - Thumbnail preview (16×16 px)
     - Image name and file size
     - Size selector (small/medium/large/full)
     - Featured image toggle (radio button)
     - Remove button
   - Summary showing total image count
   - Help text explaining usage

2. **Featured Image Selection**
   - Dropdown selector populated with uploaded images
   - Featured image preview with label overlay
   - Automatic preview source handling (new vs. existing images)

**Version History in Block Mode:**

3. **Version History Button**
   - Placed in block mode actions section (alongside auto-translate)
   - Opens same VersionsModal component as markdown mode
   - Fetches version history via GET `/api/admin/news/[id]?action=versions`
   - Shows version list with timestamps and creator information
   - Restore flow creates new version and reloads editor content

**Auto-Translate in Block Mode:**

4. **Auto-Translate Button**
   - Mirrors markdown mode functionality
   - Converts blocks to markdown using `blocksToMarkdown()`
   - Sends to translation API with title, excerpt, and markdown content
   - Receives translated title and excerpt
   - Creates draft in target locale with:
     - Translated title and excerpt
     - Original blocks preserved (blocks array unchanged)
     - useBlocks flag set to true
     - published flag set to false (draft)
   - Switches locale and reloads editor on success
   - Disabled when post is published (must be draft to translate)
   - Shows loading state and error/success messages

**Implementation Details:**

**Files Modified:**
- `app/admin/news/news-manager.tsx`
  - Added images section to block mode form (after featured image selector)
  - Added version history and auto-translate buttons to block mode actions
  - Auto-translate handler converts blocks to markdown for API submission

**Block Mode Actions Layout:**
```tsx
{/* Block Mode Actions: Version History & Auto-Translate */}
{isEditing && (
  <div className="flex items-center gap-2 pt-3">
    <button>Version history</button>
    <button>Auto-translate to {target}</button>
  </div>
)}
```

**Key Features:**
| Feature | Markdown Mode | Block Mode |
|---------|---------------|-----------|
| Image upload | ✓ | ✓ |
| Image management | ✓ | ✓ |
| Featured image selection | ✓ | ✓ |
| Version history | ✓ | ✓ |
| Version restore | ✓ | ✓ |
| Auto-translate | ✓ | ✓ |

**Build Status:** ✓ Compiled successfully
**Dev Server:** ✓ Running on port 3002
- `prisma/seed.js` (block-based content for all articles)
- `prisma/schema.prisma` (already had blocks/useBlocks, just needed migration)

**Testing:**
- ✅ Blocks now load correctly when editing existing articles
- ✅ Save button works in all scenarios
- ✅ Featured image selector displays and functions properly
- ✅ Locale switching preserves block content
- ✅ Seed script successfully populates 18 articles with block data

---

### 2026-01-11 - Initial Analysis
- Documented Page Builder UI/UX patterns
- Identified News Builder improvement areas
- Created this reference document

---

## Visual Reference

### Button Styles (from Page Builder)

**Primary Button**:
```tsx
className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-500 disabled:opacity-50"
```

**Secondary/Toggle Button (Active)**:
```tsx
className="bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400"
```

**Secondary/Toggle Button (Inactive)**:
```tsx
className="text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
```

**Danger Button**:
```tsx
className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
```

### Input Styles

**Standard Input**:
```tsx
className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
```

**Search Input with Icon**:
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
  <input className="w-full rounded-lg border ... py-2 pl-9 pr-3 ..." />
</div>
```

### Status Indicators

**Unsaved Changes**:
```tsx
<span className="flex items-center gap-1.5 text-xs text-amber-600">
  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
  Unsaved changes
</span>
```

**Loading Spinner**:
```tsx
<div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
```

---

## Appendix: Component File Mapping

| Component | Page Builder | News Builder |
|-----------|-------------|--------------|
| Main Wrapper | PageBuilder.tsx | news-manager.tsx |
| State Context | PageBuilderContext.tsx | NewsBuilderContext.tsx |
| Toolbar | BuilderToolbar (in PageBuilder.tsx) | NewsBuilderToolbar.tsx |
| Content Area | BuilderCanvas.tsx | NewsBlockCanvas.tsx |
| Item Wrapper | BlockWrapper.tsx | NewsBlockWrapper.tsx |
| Block Preview | BlockPreview.tsx | NewsBlockPreview.tsx |
| Palette/Sidebar | BlockPalette.tsx | NewsBlockPalette.tsx |
| Property Editor | PropertyPanel.tsx | NewsBlockPropertyPanel.tsx |
| Block Metadata | blocks/block-meta.ts | blocks/block-meta.ts |
| Block Types | blocks/types.ts | blocks/types.ts |
| Serialization | N/A | blocks/block-serializer.ts |
| Rich Text Editor | (in PropertyPanel) | RichTextEditor.tsx |
| Keyboard Shortcuts | (inline) | useNewsBuilderShortcuts.ts |
