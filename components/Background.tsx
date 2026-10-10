'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const PixelSnow = dynamic(() => import('@/components/ui/PixelSnow'), { ssr: false });

const snowProps = {
  variant: 'square' as const,
  density: 0.2,
  speed: 0.35,
  flakeSize: 0.004,
  minFlakeSize: 0.75,
  pixelResolution: 140,
  brightness: 0.85,
};

export default function Background() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compact, setCompact] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const widthQuery = window.matchMedia('(max-width: 639px)');
    const update = () => {
      setReducedMotion(motionQuery.matches);
      setCompact(widthQuery.matches);
      setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    };
    update();
    motionQuery.addEventListener('change', update);
    widthQuery.addEventListener('change', update);
    const themeObserver = new MutationObserver(update);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      motionQuery.removeEventListener('change', update);
      widthQuery.removeEventListener('change', update);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-background">
      {!reducedMotion && (
        <PixelSnow
          {...snowProps}
          color={theme === 'dark' ? '#ffffff' : '#94a3b8'}
          brightness={theme === 'dark' ? 0.85 : 0.3}
          density={compact ? 0.1 : snowProps.density}
          pixelResolution={compact ? 90 : snowProps.pixelResolution}
        />
      )}
    </div>
  );
}
