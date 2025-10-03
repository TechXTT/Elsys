import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://elsys.local';
  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/novini`, lastModified: new Date() },
    { url: `${base}/blog`, lastModified: new Date() },
  ];
}


