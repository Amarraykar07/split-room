'use client';

import { useEffect, useRef } from 'react';

export interface PixelSnowProps {
  color?: string;
  variant?: 'square';
  density?: number;
  speed?: number;
  flakeSize?: number;
  minFlakeSize?: number;
  pixelResolution?: number;
  brightness?: number;
  depthFade?: number;
  farPlane?: number;
  gamma?: number;
}

export default function PixelSnow({
  color = '#ffffff',
  variant = 'square',
  density = 0.3,
  speed = 0.35,
  flakeSize = 0.004,
  minFlakeSize = 0.75,
  pixelResolution = 140,
  brightness = 0.85,
  depthFade = 8,
  farPlane = 20,
  gamma = 0.4545,
}: PixelSnowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !container || !context) return;

    const flakes = Array.from({ length: Math.max(20, Math.round(density * 180)) }, () => ({
      x: Math.random(),
      y: Math.random(),
      depth: Math.random(),
      phase: Math.random() * Math.PI * 2,
    }));
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = performance.now();

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      context.clearRect(0, 0, width, height);
      context.fillStyle = color;

      flakes.forEach((flake) => {
        const depth = 0.25 + flake.depth * 0.75;
        flake.y += delta * speed * (0.08 + depth * 0.18);
        flake.x += delta * speed * 0.02 * depth;
        if (flake.y > 1.05) flake.y = -0.05;
        if (flake.x > 1.05) flake.x = -0.05;

        const size = Math.max(
          minFlakeSize,
          width * flakeSize * (0.4 + depth * 0.9) * (pixelResolution / 200),
        );
        const fade = Math.max(0.15, 1 - flake.depth * (depthFade / Math.max(farPlane, 1)));
        context.globalAlpha = Math.pow(Math.min(1, brightness * fade), gamma);
        if (variant === 'square') {
          context.fillRect(flake.x * width, flake.y * height, size, size);
        }
      });

      context.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [brightness, color, density, depthFade, farPlane, flakeSize, gamma, minFlakeSize, pixelResolution, speed, variant]);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0" />;
}
