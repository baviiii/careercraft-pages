/* ───────────────────────────────────────────────────────────
   AstralStarfield — canvas-based star layer.
   - 3 depth layers, each with mouse parallax
   - gentle twinkle via per-star sin phase
   - cursor-reactive constellation lines (nearby stars connect
     to the cursor and to each other while the cursor is close)
   - uses devicePixelRatio for crispness
   ─────────────────────────────────────────────────────────── */

import { memo, useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  depth: number; // 0.2..1 — parallax weight
  phase: number;
  speed: number;
}

interface AstralStarfieldProps {
  density?: number;   // stars per 1000x1000 area
  threshold?: number; // cursor constellation radius
}

export const AstralStarfield = memo(function AstralStarfield({
  density = 1.2,
  threshold = 150,
}: AstralStarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    let width = window.innerWidth;
    let height = window.innerHeight;
    let stars: Star[] = [];

    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * DPR;
      canvas.height = height * DPR;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      const area = width * height;
      const count = Math.round((area / (1000 * 1000)) * 180 * density);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.1 + 0.25,
        depth: Math.random() * 0.85 + 0.15,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.0018 + 0.0008,
      }));
    };

    const onMouse = (e: MouseEvent) => {
      targetMouseX = (e.clientX / width - 0.5) * 2;
      targetMouseY = (e.clientY / height - 0.5) * 2;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouse);

    let raf = 0;
    const render = (t: number) => {
      mouseX += (targetMouseX - mouseX) * 0.06;
      mouseY += (targetMouseY - mouseY) * 0.06;

      ctx.clearRect(0, 0, width, height);

      const cursorX = (mouseX * 0.5 + 0.5) * width;
      const cursorY = (mouseY * 0.5 + 0.5) * height;

      // ---- stars + cursor-constellation links -------------
      const nearList: { sx: number; sy: number }[] = [];

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const parallaxX = -mouseX * 28 * s.depth;
        const parallaxY = -mouseY * 28 * s.depth;
        const sx = s.x + parallaxX;
        const sy = s.y + parallaxY;

        const twinkle = 0.35 + 0.65 * (Math.sin(t * s.speed + s.phase) * 0.5 + 0.5);
        const alpha = twinkle * (0.35 + 0.65 * s.depth);

        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 236, 255, ${alpha})`;
        ctx.fill();

        // subtle halo for bright stars
        if (s.r > 0.9) {
          ctx.beginPath();
          ctx.arc(sx, sy, s.r * 2.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 200, 255, ${alpha * 0.12})`;
          ctx.fill();
        }

        const dx = sx - cursorX;
        const dy = sy - cursorY;
        const d2 = dx * dx + dy * dy;

        if (d2 < threshold * threshold) {
          nearList.push({ sx, sy });
          const d = Math.sqrt(d2);
          const op = (1 - d / threshold) * 0.25;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(cursorX, cursorY);
          ctx.strokeStyle = `rgba(124, 160, 255, ${op})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // ---- constellation links between nearby stars -------
      for (let i = 0; i < nearList.length; i++) {
        for (let j = i + 1; j < nearList.length; j++) {
          const a = nearList[i];
          const b = nearList[j];
          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const d2 = dx * dx + dy * dy;
          if (d2 < 110 * 110) {
            const d = Math.sqrt(d2);
            const op = (1 - d / 110) * 0.2;
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.strokeStyle = `rgba(200, 215, 255, ${op})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, [density, threshold]);

  return <canvas ref={canvasRef} className="as-stars" aria-hidden="true" />;
});
