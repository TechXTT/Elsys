export interface PostItem {
  id: string;
  title: string;
  excerpt?: string;
  date?: string;
  href: string;
  image?: string;
  body?: string; // legacy HTML body support
  images?: Array<{
    name: string;
    url: string;
    size?: "small" | "medium" | "large" | "full";
  }>;
  published?: boolean;
}

export interface HomeHero {
  title: string;
  subtitle?: string;
  cta?: { label: string; href: string };
  imageLarge?: string; // optional large background photograph
}

export interface HomeTrack { key: string; title: string; description: string; href: string; image?: string }
export interface HomeWhy { icon: string; title: string; description: string; image?: string }
export interface HomeNumber { value: string; label: string }

export interface AdmissionsStep {
  title: string;
  description?: string;
  dateHint?: string;
  icon?: string;
  cta?: { label: string; href: string };
}

export interface AdmissionsSection {
  title?: string;
  description?: string;
  steps: AdmissionsStep[];
  cta?: { label: string; href: string };
}

export interface TestimonialItem {
  name: string;
  role?: string;
  quote: string;
  image?: string;
}

export interface HomeContent {
  hero: HomeHero;
  tracks: HomeTrack[];
  why: HomeWhy[];
  numbers: HomeNumber[];
  admissions?: AdmissionsSection;
  testimonials?: { title?: string; subtitle?: string; items: TestimonialItem[] };
}
