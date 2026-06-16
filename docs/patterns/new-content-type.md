# Adding a new content type

The admin content-type framework (G2-2) turns a single config object into a full
admin CRUD slice: a bulk-select list (Figma 92:2) and a two-column create/edit
form with a publish aside, ColorTag picker, MediaPicker image fields, a per-record
successor note, and an autosave indicator (Figma 94:2). You do **not** write list
or form components per type — only a config, a Prisma model, and the public surface.

This is the cookie-cutter for tasks G2-2 (Document, Gallery, Club, TeamMember,
Partner, Project, Award, Leader).

## 1. Prisma model (additive — migration + seed in the same commit)

Add the model to `prisma/schema.prisma`. Every content model should carry the
shared lifecycle + presentation fields so the framework can drive it:

```prisma
model Thing {
  id          String        @id @default(cuid())
  locale      String        @default("bg")
  slug        String
  title       String
  description String?
  color       ColorTag      @default(BLUE)   // if it shows a colour accent
  image       String?                         // a Media URL
  status      PublishStatus @default(DRAFT)
  order       Int           @default(0)
  publishAt   DateTime?
  unpublishAt DateTime?
  legacyId    Int?                            // for the M4 import
  authorId    String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  @@unique([slug, locale])
  @@index([locale, status, order])
}
```

Then `pnpm prisma migrate dev --name add_thing` and add a few idempotent
`upsert` rows to `prisma/seed.js` (working-agreement #2).

Successor notes are **not** a column — they live in the generic `SuccessorNote`
model keyed by `(entity, entityId)`, handled automatically by the framework.

## 2. Register the type

Create `app/admin/content/types/thing.ts` and import it from
`app/admin/content/types/index.ts` (the side-effect registry).

```ts
import { z } from "zod";
import { registerContentType } from "../registry";
import { STATUS_OPTIONS } from "@/lib/content/shared";

registerContentType({
  type: "thing",
  modelName: "Thing",           // Prisma model (PascalCase)
  labelSingular: "Нещо",
  labelPlural: "Неща",
  titleField: "title",          // default "title"
  slugPrefix: "/neshta/",       // read-only prefix on the slug input
  colorField: "color",          // renders a ColorTag dot badge in the list
  statusField: "status",        // default "status"; drives badges + bulk ops
  imageFolder: "general",       // scopes the MediaPicker to a folder
  // enableSuccessorNote: true,  (default) — amber note box + SuccessorNote row
  // enableBulk: true,           (default) — bulk publish/archive/delete
  fields: [
    { name: "locale", type: "select", label: "Език", required: true, options: [
      { value: "bg", label: "Български" }, { value: "en", label: "English" } ] },
    { name: "title", type: "text", label: "Заглавие", required: true },
    { name: "slug", type: "slug", label: "URL адрес", required: true },
    { name: "description", type: "textarea", label: "Описание" },
    { name: "color", type: "colortag", label: "Цвят (ColorTag)", required: true },
    { name: "image", type: "image", label: "Изображение" },
    { name: "status", type: "select", label: "Статус", required: true, options: STATUS_OPTIONS },
    { name: "publishAt", type: "date", label: "Публикувай на" },
  ],
  columns: [
    { key: "title", label: "Заглавие", sortable: true },
    { key: "status", label: "Статус", sortable: true },
  ],
  searchFields: ["title", "description"],
  defaultSort: "order",
  schema: z.object({
    locale: z.string().min(2, "Изберете език."),
    slug: z.string().min(2, "Slug трябва да е поне 2 символа.")
      .regex(/^[a-z0-9-]+$/, "Само малки букви, цифри и тирета."),
    title: z.string().min(2, "Заглавието трябва да е поне 2 символа."),
    description: z.string().optional(),
    color: z.enum(["RED","ORANGE","YELLOW","GREEN","TEAL","BLUE","INDIGO","PURPLE","PINK","GRAY"]).default("BLUE"),
    image: z.string().url("Невалиден URL.").optional().or(z.literal("")),
    status: z.enum(["PUBLISHED","DRAFT","PREVIEW","SCHEDULED","ARCHIVED"]).default("DRAFT"),
    order: z.coerce.number().int().default(0),
    publishAt: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  }),
});
```

### Field types
`text · textarea · number · boolean · select · date · image · slug · richtext · colortag`

- **`status` + `publishAt`** are auto-moved into the publish aside.
- **`colortag`** renders the swatch picker (`ColorTagPicker`).
- **`image`** renders `MediaField` → the Media Library `MediaPicker` (G2-1).
- **`slug`** shows `slugPrefix` as a read-only adornment.

That's the whole admin slice — list, create, edit, delete, bulk, notes, autosave
all come from the framework. No per-type components.

## 3. Public surface (per type)

The admin half is generic; the **public** route + block is bespoke per type:

- a cached read in `lib/<thing>.ts` (memory→Redis→DB via `lib/cache.ts`,
  explicit `select`, `publicWhere()` gate) — follow `lib/news.ts`;
- a public route under `app/[locale]/…` and/or a block in `lib/blocks/registry.tsx`
  bound to the cached read.

## 4. Working agreements (every type)

- Migration **and** seed in the same commit.
- Every admin mutation already writes `AuditLog` + revalidates (the framework
  actions do this); public reads go through `lib/cache.ts` with explicit `select`.
- All strings via `messages/{bg,en}.json`. Bulgarian Zod messages.
- Add/extend one Playwright happy-path (see `tests/e2e/club-admin.spec.ts`).
