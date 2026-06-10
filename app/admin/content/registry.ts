import type { ContentTypeConfig } from "@/lib/content/shared";

export const contentRegistry: Record<string, ContentTypeConfig> = {};

export function registerContentType(config: ContentTypeConfig): void {
  contentRegistry[config.type] = config;
}

export function getContentType(type: string): ContentTypeConfig | undefined {
  return contentRegistry[type];
}

export function getAllContentTypes(): ContentTypeConfig[] {
  return Object.values(contentRegistry);
}
