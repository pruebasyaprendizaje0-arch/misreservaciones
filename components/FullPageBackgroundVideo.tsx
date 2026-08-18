'use client';

import { useEffect, useRef } from 'react';

export function FullPageBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();

    let videoReady = false;

    const updateVideoTime = () => {
      if (!videoReady) return;
      
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;

      // Calculate scroll position as a fraction (0 to 1)
      const scrollFraction = Math.max(0, Math.min(window.scrollY / maxScroll, 1));
      const duration = video.duration || 10;
      const targetTime = duration * scrollFraction;
      
      // Direct update based on scroll position
      video.currentTime = targetTime;
    };

    const onVideoReady = () => {
      videoReady = true;
    };

    const events = ['loadedmetadata', 'canplay'];
    events.forEach(event => video.addEventListener(event, onVideoReady));
    
    window.addEventListener('scroll', updateVideoTime, { passive: true });
    window.addEventListener('resize', updateVideoTime);

    // Fallback: start immediately if video is already cached
    if (video.readyState >= 2) {
      onVideoReady();
    }

    return () => {
      events.forEach(event => video.removeEventListener(event, onVideoReady));
      window.removeEventListener('scroll', updateVideoTime);
      window.removeEventListener('resize', updateVideoTime);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="fixed left-0 top-0 w-full h-full object-cover opacity-100"
        style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        <source src="/playa.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
