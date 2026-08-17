'use client';

import { useEffect, useState } from 'react';

export function HeroBackgroundVideo() {
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffsetY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Video with parallax translation */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-[120%] w-full object-cover opacity-65"
        style={{
          transform: `translateY(${offsetY * 0.7}px)`,
        }}
      >
        <source src="/playa.mp4" type="video/mp4" />
      </video>

      {/* Modern gradient overlay for readability and premium look */}
      <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/60 via-indigo-950/20 to-indigo-900/50 mix-blend-multiply" />
    </div>
  );
}
