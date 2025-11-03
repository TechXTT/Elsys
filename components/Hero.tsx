import React from 'react';

interface HeroCTA { label: string; href: string }
interface HeroProps { heading: string; subheading?: string; image?: string; cta?: HeroCTA }

const Hero: React.FC<HeroProps> = ({ heading, subheading, image, cta }) => (
  <section className="relative mb-10 overflow-hidden rounded-xl bg-slate-900 text-white shadow-card">
    <div className="absolute inset-0 gradient-hero" aria-hidden="true" />
    <div className="absolute inset-0 hero-overlay" aria-hidden="true" />
    <div className="absolute inset-0 hero-pattern" aria-hidden="true" style={{
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
      backgroundSize: '18px 18px'
    }} />
    <div className="relative z-10 container-page flex flex-col gap-6 py-16 md:flex-row md:items-center">
      {image && (
        <div className="flex-shrink-0">
          <img src={image} alt="" className="h-28 w-28 rounded-lg bg-white/10 p-3 backdrop-blur md:h-32 md:w-32" />
        </div>
      )}
      <div className="max-w-2xl">
        <h1 className="mb-4 text-3xl font-semibold tracking-tight md:text-5xl">{heading}</h1>
        {subheading && <p className="text-lg md:text-xl text-slate-100/90 leading-relaxed">{subheading}</p>}
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
