import React from "react";

import { type BlockContext, getBlockDefinition } from "@/lib/blocks/registry";
import { InlineEditableBlock } from "@/components/admin/InlineEditableBlock";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

// G3-3: which blocks expose inline-editable text, and how their props map to the
// generic title/content the drawer edits.
function editableFields(type: string, props: Record<string, unknown>): { title: string; content: string; withContent: boolean } | null {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  switch (type) {
    case "Hero": return { title: s(props.heading), content: s(props.subheading), withContent: true };
    case "Section": return { title: s(props.title), content: s(props.markdown), withContent: true };
    case "Markdown": return { title: "", content: s(props.markdown), withContent: true };
    default: return null;
  }
}

/**
 * Public block renderer. Registry-driven and resilient: each block renders
 * independently through its registry definition (validated per-block via its Zod
 * `schema`), so one malformed block can't blank the whole page. Unknown types
 * are skipped. R4: pass the full BlockContext (data prefetched via loadBlockData).
 * G3-3: pass `edit` (admins only) to wrap editable blocks with an inline editor.
 */
export function renderBlocks(blocks: unknown, ctx?: BlockContext, edit?: { pageId: string }): React.ReactNode {
  if (!Array.isArray(blocks)) return null;
  return blocks.map((b, idx) => {
    if (!isRecord(b) || typeof b.type !== "string") return null;
    const def = getBlockDefinition(b.type);
    if (!def) return null;
    const rawProps = isRecord(b.props) ? b.props : {};
    let props: Record<string, unknown> = rawProps;
    if (def.schema) {
      const res = def.schema.safeParse(rawProps);
      if (!res.success) return null; // skip invalid block, keep the rest
      props = res.data as Record<string, unknown>;
    } else if (def.validate) {
      const res = def.validate(rawProps);
      if (!res.ok) return null;
      props = res.props;
    }
    const rendered = def.render(props as never, ctx);
    const fields = edit ? editableFields(b.type, props) : null;
    if (edit && fields) {
      return (
        <InlineEditableBlock key={idx} pageId={edit.pageId} index={idx} initialTitle={fields.title} initialContent={fields.content} withContent={fields.withContent}>
          {rendered}
        </InlineEditableBlock>
      );
    }
    return <React.Fragment key={idx}>{rendered}</React.Fragment>;
  });
}
