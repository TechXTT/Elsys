import "server-only";
import { revalidateDocuments } from "@/lib/documents";

// Per-type public-cache invalidation + route revalidation (working-agreement #3).
// The generic content actions call revalidatePublicForType() after every mutation
// so the public surface for the type refreshes in both locales. Data-only configs
// stay serializable; this server-only map holds the side-effecting functions.
const REVALIDATORS: Record<string, () => Promise<void>> = {
  document: revalidateDocuments,
};

export async function revalidatePublicForType(type: string): Promise<void> {
  await REVALIDATORS[type]?.();
}
