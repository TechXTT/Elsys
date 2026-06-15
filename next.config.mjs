import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  // E1: news moved from the legacy /news folder to the canonical /novini routes.
  // Permanent (308) redirects keep old URLs alive and transfer link equity.
  async redirects() {
    return [
      { source: "/:locale(bg|en)/news", destination: "/:locale/novini", permanent: true },
      { source: "/:locale(bg|en)/news/:slug*", destination: "/:locale/novini/:slug*", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);


