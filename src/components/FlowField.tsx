"use client";

import { useEffect, useRef } from "react";

/**
 * The "flow" in HabitFlow: a few hundred particles drifting along a slowly
 * shifting current, leaving fading trails. The current bends around the
 * pointer. Pure canvas — no layout cost, paused whenever it's off screen.
 */
export function FlowField({ className = "", density = 0.00022 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: -9999, y: -9999 };
    let width = 0;
    let height = 0;
    let frame = 0;
    let raf = 0;
    let visible = true;
    let color = "#2563eb";
    let particles: { x: number; y: number; life: number }[] = [];

    const readColor = () => {
      color = getComputedStyle(document.documentElement).getPropertyValue("--brand").trim() || color;
    };
    const spawn = (p: { x: number; y: number; life: number }) => {
      p.x = Math.random() * width;
      p.y = Math.random() * height;
      p.life = 60 + Math.random() * 200;
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(520, Math.max(60, Math.round(width * height * density)));
      particles = Array.from({ length: count }, () => {
        const p = { x: 0, y: 0, life: 0 };
        spawn(p);
        return p;
      });
    };
    // Direction of the current at a point; drifts slowly with time.
    const angleAt = (x: number, y: number, t: number) =>
      Math.sin(x * 0.0034 + t * 0.0007) * 1.3 + Math.cos(y * 0.0046 - t * 0.0005) * 1.3 + Math.sin((x + y) * 0.0019 + t * 0.0003) * 0.9;

    const step = () => {
      frame++;
      // Fade old trails toward transparent rather than painting a background,
      // so the canvas can sit on top of any surface.
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.055)";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.15;
      ctx.lineCap = "round";

      for (const p of particles) {
        let angle = angleAt(p.x, p.y, frame);
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 180) angle = angle + (Math.atan2(dy, dx) + Math.PI / 2 - angle) * (1 - dist / 180);
        const nx = p.x + Math.cos(angle) * 1.5;
        const ny = p.y + Math.sin(angle) * 1.5;
        ctx.globalAlpha = Math.min(1, p.life / 50) * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        p.x = nx;
        p.y = ny;
        if (--p.life <= 0 || nx < -10 || nx > width + 10 || ny < -10 || ny > height + 10) spawn(p);
      }
    };

    const loop = () => {
      if (visible) step();
      raf = requestAnimationFrame(loop);
    };

    readColor();
    resize();
    if (reduced) {
      for (let i = 0; i < 160; i++) step(); // a still image of the current
    } else {
      raf = requestAnimationFrame(loop);
    }

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduced) for (let i = 0; i < 160; i++) step();
    });
    const intersection = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    const themeObserver = new MutationObserver(readColor);
    resizeObserver.observe(canvas);
    intersection.observe(canvas);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [density]);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none h-full w-full ${className}`} />;
}
