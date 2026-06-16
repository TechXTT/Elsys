import React from "react";

import { type BlockContext, getBlockDefinition } from "@/lib/blocks/registry";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Public block renderer. Registry-driven and resilient: each block renders
 * independently through its registry definition (validated per-block via its Zod
 * `schema`), so one malformed block can't blank the whole page. Unknown types
 * are skipped. R4: pass the full BlockContext (data prefetched via loadBlockData).
 */
export function renderBlocks(blocks: unknown, ctx?: BlockContext): React.ReactNode {
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
    return <React.Fragment key={idx}>{def.render(props as never, ctx)}</React.Fragment>;
  });
}
