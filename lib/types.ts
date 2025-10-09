export interface PostItem {
  id: string;
  title: string;
  excerpt?: string;
  date?: string;
  href: string;
  image?: string;
  body?: string; // optional rich text/HTML body
}

export interface HomeHero {
  title: string;
  subtitle?: string;
  cta?: { label: string; href: string };
}

export interface HomeTrack { key: string; title: string; description: string; href: string }
export interface HomeWhy { icon: string; title: string; description: string }
export interface HomeNumber { value: string; label: string }

export interface HomeContent {
  hero: HomeHero;
  tracks: HomeTrack[];
  why: HomeWhy[];
  numbers: HomeNumber[];
}
