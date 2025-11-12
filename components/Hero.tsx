import React from 'react';

interface HeroCTA { label: string; href: string }
interface HeroProps { heading: string; subheading?: string; image?: string; imageLarge?: string; cta?: HeroCTA }

const Hero: React.FC<HeroProps> = ({ heading, subheading, image, imageLarge, cta }) => (
  <section className="relative mb-10 overflow-hidden rounded-xl bg-slate-900 text-white shadow-card">
    {/* Large photo background (optional) */}
    {imageLarge && (
      <>
        <img
          src={imageLarge}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-100 mix-blend-luminosity dark:opacity-80 dark:brightness-75"
        />
        {/* Additional dim overlay only in dark mode for better contrast */}
        <div aria-hidden className="absolute inset-0 hidden dark:block bg-slate-950/40" />
      </>
    )}
    <div className="absolute inset-0 gradient-hero" aria-hidden="true" />
    <div className="absolute inset-0 hero-overlay" aria-hidden="true" />
    <div
      className="absolute inset-0 hero-pattern"
      aria-hidden="true"
      style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '18px 18px'
      }}
    />
    <div className="relative z-10 container-page flex flex-col gap-6 py-16 md:flex-row md:items-center">
      <div className="max-w-2xl">
        <h1 className="mb-4 text-3xl font-semibold tracking-tight md:text-5xl font-display">{heading}</h1>
        {subheading && <p className="text-lg md:text-xl leading-relaxed text-slate-100/90">{subheading}</p>}
        {cta && (
          <div className="mt-6">
            <a href={cta.href} className="btn-primary">{cta.label}</a>
          </div>
        )}
      </div>
    </div>
  </section>
);
export default Hero;
