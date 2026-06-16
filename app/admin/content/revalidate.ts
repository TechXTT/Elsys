import "server-only";
import { revalidateDocuments } from "@/lib/documents";
import { revalidateGallery } from "@/lib/gallery";
import { revalidateClubs } from "@/lib/clubs";
import { revalidateTeam } from "@/lib/team";
import { revalidatePartners } from "@/lib/partners";
import { revalidateProjects } from "@/lib/projects";

// Per-type public-cache invalidation + route revalidation (working-agreement #3).
// The generic content actions call revalidatePublicForType() after every mutation
// so the public surface for the type refreshes in both locales. Data-only configs
// stay serializable; this server-only map holds the side-effecting functions.
const REVALIDATORS: Record<string, () => Promise<void>> = {
  document: revalidateDocuments,
  gallery: revalidateGallery,
  club: revalidateClubs,
  team: revalidateTeam,
  partner: revalidatePartners,
  project: revalidateProjects,
};

export async function revalidatePublicForType(type: string): Promise<void> {
  await REVALIDATORS[type]?.();
}
