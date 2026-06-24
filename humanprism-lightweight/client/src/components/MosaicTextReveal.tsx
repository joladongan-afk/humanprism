import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  color: string;
  size: number;
  baseSize: number;
  delay: number;
  settled: boolean;
  twinkle: number;
  launched: boolean;
}

interface MosaicTextRevealProps {
  text: string;
  className?: string;
  fontSize?: number;
  colorPalette?: string[];
  startDelay?: number;
}

export const MosaicTextReveal: React.FC<MosaicTextRevealProps> = ({
  text,
  className = '',
  fontSize = 72,
  colorPalette,
  startDelay = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef<'gathering' | 'settled' | 'dispersing'>('gathering');
  const phaseTimerRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null;
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // 폰트 설정
    const font = `bold ${fontSize}px "Noto Sans KR", system-ui, -apple-system, sans-serif`;

    // 텍스트 측정용 임시 캔버스
    ctx.font = font;
    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = Math.ceil(fontSize * 1.4);

    // 여백 (입자가 날아올 공간)
    const padX = 20;
    const padY = 20;
    const cssWidth = textWidth + padX * 2;
    const cssHeight = textHeight + padY * 2;

    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    ctx.scale(dpr, dpr);

    // 글자 픽셀 추출용 오프스크린 캔버스
    const off = document.createElement('canvas');
    off.width = cssWidth;
    off.height = cssHeight;
    const offCtx = off.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null;
    if (!offCtx) return;

    offCtx.font = font;
    offCtx.textBaseline = 'middle';
    offCtx.textAlign = 'left';
    offCtx.fillStyle = '#fff';
    offCtx.fillText(text, padX, cssHeight / 2);

    const imageData = offCtx.getImageData(0, 0, cssWidth, cssHeight);
    const pixels = imageData.data;

    // 색상 팔레트 (기본: 영롱한 무지개 / colorPalette prop으로 커스텀 가능)
    const colors = colorPalette && colorPalette.length > 0 ? colorPalette : [
      '#fbbf24', '#fb923c', '#f87171', '#ec4899',
      '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6',
      '#06b6d4', '#10b981', '#facc15',
    ];

    // 글자 픽셀을 샘플링하여 목표 좌표 수집
    const targets: { x: number; y: number }[] = [];
    const step = 3; // 샘플 간격 (작을수록 입자 많음)
    for (let y = 0; y < cssHeight; y += step) {
      for (let x = 0; x < cssWidth; x += step) {
        const alpha = pixels[(y * cssWidth + x) * 4 + 3];
        if (alpha > 128) {
          targets.push({ x, y });
        }
      }
    }

    // 입자 생성 (각 목표 픽셀당 하나)
    const createParticles = (): Particle[] => {
      return targets.map((t, i) => {
        // 시작 위치: 왼쪽 멀리서 모래바람처럼 (약간의 분산)
        const startX = -200 - Math.random() * 400;
        const startY = t.y + (Math.random() - 0.5) * cssHeight * 1.5;
        const baseSize = 0.8 + Math.random() * 1.4;
        return {
          x: startX,
          y: startY,
          vx: 0,
          vy: 0,
          homeX: t.x,
          homeY: t.y,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: baseSize,
          baseSize,
          delay: (t.x / cssWidth) * 60 + Math.random() * 30, // 왼쪽부터 순차적
          settled: false,
          twinkle: Math.random() * Math.PI * 2,
          launched: false,
        };
      });
    };

    particlesRef.current = createParticles();
    phaseRef.current = 'gathering';
    phaseTimerRef.current = 0;

    let frame = 0;
    let waited = 0;

    const animate = () => {
      if (waited < startDelay) {
        waited++;
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      frame++;
      phaseTimerRef.current++;
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      const phase = phaseRef.current;

      // 페이즈 전환 로직
      if (phase === 'gathering' && phaseTimerRef.current > 200) {
        const settledCount = particlesRef.current.filter((p) => p.settled).length;
        if (settledCount > particlesRef.current.length * 0.92) {
          phaseRef.current = 'settled';
          phaseTimerRef.current = 0;
        }
      } else if (phase === 'settled' && phaseTimerRef.current > 150) {
        // 유지 후 제자리에서 페이드아웃 (위로 살짝 떠오르며 사라짐)
        phaseRef.current = 'dispersing';
        phaseTimerRef.current = 0;
        particlesRef.current.forEach((p) => {
          p.settled = false;
          // 아주 미세한 상승 + 좌우 흔들림 (경계로 몰리지 않게 거의 제자리)
          p.vx = (Math.random() - 0.5) * 0.6;
          p.vy = -0.3 - Math.random() * 0.5;
        });
      } else if (phase === 'dispersing' && phaseTimerRef.current > 45) {
        // 다시 모으기 (frame 리셋으로 delay 타이밍 정확화)
        particlesRef.current = createParticles();
        phaseRef.current = 'gathering';
        phaseTimerRef.current = 0;
        frame = 0;
      }

      ctx.globalCompositeOperation = 'lighter';

      particlesRef.current.forEach((p) => {
        p.twinkle += 0.15;
        let visible = true;

        if (phase === 'gathering') {
          if (frame > p.delay) {
            p.launched = true;
            // 스프링처럼 목표로 끌려감
            const dx = p.homeX - p.x;
            const dy = p.homeY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            p.vx += dx * 0.012;
            p.vy += dy * 0.012;
            p.vx *= 0.86;
            p.vy *= 0.86;
            p.x += p.vx;
            p.y += p.vy;
            if (dist < 1.5) {
              p.settled = true;
            }
          } else {
            // 아직 출발 전: 화면 밖(왼쪽)에 대기 → 렌더링 안 함
            visible = false;
          }
        } else if (phase === 'settled') {
          const jitter = Math.sin(p.twinkle) * 0.4;
          p.x = p.homeX + jitter;
          p.y = p.homeY + Math.cos(p.twinkle) * 0.4;
        } else if (phase === 'dispersing') {
          p.x += p.vx;
          p.y += p.vy;
        }

        // 화면 밖으로 나간 입자는 렌더링 스킵
        if (!visible) return;
        if (p.x < -10 || p.x > cssWidth + 10 || p.y < -10 || p.y > cssHeight + 10) return;

        // 흩어짐(dispersing) 단계: 시간에 따라 전체 페이드아웃 (제자리에서 사라짐 → 직사각형 잔상 방지)
        const fadeOut = phase === 'dispersing'
          ? Math.max(0, 1 - phaseTimerRef.current / 45)
          : 1;

        const twinkleAmt = (phase === 'settled'
          ? 0.6 + Math.abs(Math.sin(p.twinkle)) * 0.4
          : 1) * fadeOut;
        const size = p.baseSize * (0.85 + Math.abs(Math.sin(p.twinkle)) * 0.3);

        const hex = p.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 4);
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.5 * twinkleAmt})`);
        glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${twinkleAmt})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [text, fontSize, colorPalette, startDelay]);

  return (
    <span className={`inline-block align-middle ${className}`} style={{ lineHeight: 0 }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </span>
  );
};

export default MosaicTextReveal;
