import { prisma } from "@/lib/prisma";

// Legacy → new URL redirects (R1 / G4 M4.2). Consumed on 404 by the public
// [...slug] resolver so old elsys-bg.org links keep working post-migration.

export interface RedirectHit {
  toPath: string;
  status: number;
}

/**
 * Look up a redirect for a locale-relative slug path (the joined [...slug]
 * segments, e.g. "novini-i-sybitija/novini/x-920"). Tries with and without a
 * leading slash. Returns null when there is no mapping.
 */
export async function resolveRedirect(slugPath: string): Promise<RedirectHit | null> {
  const clean = slugPath.replace(/^\/+|\/+$/g, "");
  if (!clean) return null;
  const row = await prisma.routeRedirect.findFirst({
    where: { fromPath: { in: [clean, `/${clean}`] } },
    select: { toPath: true, status: true },
  });
  return row ?? null;
}
