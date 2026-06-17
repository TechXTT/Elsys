import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { isRemoteSrc } from "@/lib/image";

interface LeaderCardProps {
  name: string;
  year: number;
  role?: string;
  photo?: string;
  className?: string;
}

function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((w) => w && !w.endsWith("."));
  const src = words.length ? words : name.split(/\s+/).filter(Boolean);
  return src.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

/**
 * LeaderCard (Figma 112:19) — centered alumnus card: photo/initials avatar,
 * name, graduation year (coral accent), and achievement/role.
 */
export function LeaderCard({ name, year, role, photo, className }: LeaderCardProps) {
  const t = useTranslations("Leaders");
  return (
    <article
      className={cn(
        "flex flex-col items-center gap-[var(--spacing-xs)] rounded-[var(--radius-lg)] border border-line bg-surface p-[var(--spacing-lg)] text-center",
        className,
      )}
    >
      <div className="relative mb-[var(--spacing-2xs)] flex h-20 w-20 items-center justify-center overflow-hidden rounded-[var(--radius-full)] bg-brand-tint">
        {photo ? (
          <Image fill src={photo} alt="" className="object-cover" sizes="80px" unoptimized={isRemoteSrc(photo)} />
        ) : (
          <span className="text-h4 text-ink-link">{initialsOf(name)}</span>
        )}
      </div>
      <h3 className="text-h4 text-ink-heading">{name}</h3>
      <p className="text-body-sm font-medium text-tag-coral">{t("classOf", { year })}</p>
      {role && <p className="text-body-sm text-ink-muted">{role}</p>}
    </article>
  );
}
