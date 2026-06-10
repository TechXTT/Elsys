# What

<!-- One paragraph: what this PR changes. One change per branch. -->

# Why

<!-- Link the plan task (docs/PARITY_AND_IMPROVEMENT_PLAN.md §…) or issue. -->

# Screenshots

<!-- Required for any UI change. Delete the section otherwise. -->

# Migration notes

<!-- "None" if prisma/schema.prisma is untouched. Otherwise: migration name,
     whether it is destructive, and confirmation the seed was updated. -->

# Rollback plan

<!-- How to undo this safely (revert commit? down migration? cache flush?). -->

# Checklist

- [ ] One change only (no bundled refactors)
- [ ] Schema change ships migration + seed update (or N/A)
- [ ] Admin mutations write AuditLog + revalidatePath (bg, en) + cache version bump (or N/A)
- [ ] Public reads use explicit `select` and go through lib/cache.ts (or N/A)
- [ ] User-facing strings live in messages/{bg,en}.json (or N/A)
- [ ] `pnpm build` passes locally
- [ ] Verified manually on `pnpm dev`
