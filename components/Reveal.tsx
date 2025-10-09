"use client";
import React, { useEffect, useRef, useState } from 'react';

export const Reveal: React.FC<{ children: React.ReactNode; once?: boolean; className?: string }>
= ({ children, once = true, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setShown(true);
          if (once) io.disconnect();
        } else if (!once) {
          setShown(false);
        }
      });
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  return (
    <div ref={ref} className={`fade-up ${shown ? 'revealed' : ''} ${className||''}`.trim()}>
      {children}
    </div>
  );
};
