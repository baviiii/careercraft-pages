import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

type HorizonShift = "idle" | "name" | "email" | "password";

interface AuthHorizonProps {
  shift?: HorizonShift;
  compact?: boolean;
}

const SHIFT = {
  idle: { x: 0, y: 0 },
  name: { x: 0.035, y: 0 },
  email: { x: -0.04, y: -0.015 },
  password: { x: 0.02, y: -0.03 },
} as const;

export const AuthHorizon = ({ shift = "idle", compact = false }: AuthHorizonProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shiftRef = useRef(SHIFT[shift]);
  shiftRef.current = SHIFT[shift];

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(pointer: coarse), (max-width: 767px)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);

    const picture = new Image();
    picture.src = "/auth-horizon.png";

    const clouds = Array.from({ length: compact ? 4 : 6 }, (_, i) => ({
      x: Math.random(),
      y: 0.04 + (i % 3) * 0.07,
      w: 0.28 + (i % 3) * 0.1,
      h: 0.08 + (i % 2) * 0.04,
      speed: (0.008 + i * 0.003) * (i % 2 === 0 ? 1 : -1),
      alpha: 0.28 + (i % 3) * 0.1,
    }));

    const motes = Array.from({ length: compact || mobile ? 18 : 36 }, () => ({
      x: Math.random(),
      y: 0.35 + Math.random() * 0.55,
      r: 0.8 + Math.random() * 1.8,
      drift: 0.012 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2,
    }));

    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;
    let start = performance.now();

    const fit = () => {
      width = host.clientWidth || 1;
      height = host.clientHeight || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    const drawCloud = (x: number, y: number, w: number, h: number, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.55, h, 0, 0, Math.PI * 2);
      ctx.ellipse(x - w * 0.32, y + h * 0.15, w * 0.38, h * 0.82, 0, 0, Math.PI * 2);
      ctx.ellipse(x + w * 0.3, y + h * 0.1, w * 0.34, h * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      ctx.fillStyle = "#6ea8d4";
      ctx.fillRect(0, 0, width, height);

      const look = shiftRef.current;
      const zoom = compact ? 1.06 : 1.18;
      const panX = Math.sin(t * 0.22) * 0.05 + look.x;
      // Tall auth column is sky-heavy; pull the meadow into the middle of the pane.
      const panY = Math.cos(t * 0.16) * 0.03 + look.y - (compact ? 0.08 : 0.34);

      if (picture.complete && picture.naturalWidth) {
        const iw = picture.naturalWidth;
        const ih = picture.naturalHeight;
        const cover = Math.max(width / iw, height / ih) * zoom;
        const dw = iw * cover;
        const dh = ih * cover;
        ctx.drawImage(picture, (width - dw) / 2 + panX * width, (height - dh) / 2 + panY * height, dw, dh);
      }

      if (!reduced) {
        const rayX = width * (0.8 + Math.sin(t * 0.22) * 0.02);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "#fff4c8";
        for (let i = 0; i < 5; i++) {
          ctx.save();
          ctx.translate(rayX, 0);
          ctx.rotate(-0.42 + i * 0.1 + Math.sin(t * 0.4 + i) * 0.04);
          ctx.globalAlpha = 0.12 + Math.sin(t * 0.9 + i) * 0.06;
          ctx.beginPath();
          ctx.moveTo(0, -height * 0.08);
          ctx.lineTo(width * 0.07, -height * 0.08);
          ctx.lineTo(width * 0.22, height * 1.2);
          ctx.lineTo(-width * 0.02, height * 1.2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();

        for (const cloud of clouds) {
          cloud.x += cloud.speed * 0.016;
          if (cloud.x > 1.25) cloud.x = -0.3;
          if (cloud.x < -0.3) cloud.x = 1.25;
          drawCloud(cloud.x * width, cloud.y * height, cloud.w * width, cloud.h * height, cloud.alpha);
        }

        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "#fff6c4";
        for (const mote of motes) {
          mote.y -= mote.drift * 0.016;
          if (mote.y < 0.2) mote.y = 0.95;
          const mx = (mote.x + Math.sin(t * 0.7 + mote.phase) * 0.04) * width;
          ctx.globalAlpha = 0.35 + Math.sin(t * 2 + mote.phase) * 0.25;
          ctx.beginPath();
          ctx.arc(mx, mote.y * height, mote.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (visible) raf = requestAnimationFrame(frame);
    };

    const startLoop = () => {
      cancelAnimationFrame(raf);
      start = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) startLoop();
      else cancelAnimationFrame(raf);
    }, { threshold: 0 });
    io.observe(host);

    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    startLoop();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [compact]);

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden bg-[#6ea8d4]">
      <motion.canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        initial={false}
        animate={{ scale: shift === "password" ? 1.03 : 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      />
      <div className="auth-horizon-grass" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i} style={{ left: `${(i / 27) * 100}%`, animationDelay: `${(i % 7) * -0.35}s` }} />
        ))}
      </div>
      <div className="cc-grain absolute inset-0 opacity-20 mix-blend-overlay" />
    </div>
  );
};
