import React, { useState, useEffect, useRef } from 'react';

interface LazyAvatarProps {
  src: string;
  alt?: string;
  initials: string;
  className?: string;
}

export const LazyAvatar: React.FC<LazyAvatarProps> = ({
  src,
  alt = '',
  initials,
  className = 'w-12 h-12 rounded-full',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Use IntersectionObserver to defer image loading until in or near viewport
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '100px' } // Pre-fetch when within 100px of viewport
      );

      observer.observe(el);
      return () => observer.disconnect();
    } else {
      setIsVisible(true);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0 select-none ${className}`}
    >
      {/* Fallback initials */}
      <span className={`transition-opacity duration-200 ${isLoaded && !hasError ? 'opacity-0' : 'opacity-100'}`}>
        {initials}
      </span>

      {/* Lazy Image */}
      {isVisible && !hasError && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
};
