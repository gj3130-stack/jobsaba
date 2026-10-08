"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  HERO_AUTOPLAY_MS,
  HERO_SIZES,
  HERO_SLIDES,
  heroFrames,
  heroLogicalIndex,
  initialHeroMotion,
  jumpHero,
  settleHero,
  stepHero,
  type HeroMotion,
} from "@/lib/hero-carousel";

const FRAMES = heroFrames(HERO_SLIDES);
const SLIDE_COUNT = HERO_SLIDES.length;
const SWIPE_THRESHOLD = 48;

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function reducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  const path = direction === "left" ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="5" y="4" width="3.2" height="12" rx="1" />
      <rect x="11.8" y="4" width="3.2" height="12" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M7 4.8v10.4c0 .8.9 1.3 1.6.8l7.2-5.2a1 1 0 0 0 0-1.6L8.6 4c-.7-.5-1.6 0-1.6.8Z" />
    </svg>
  );
}

export function HeroCarousel() {
  const reduced = useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, () => false);
  const [motion, setMotion] = useState<HeroMotion>(initialHeroMotion);
  const [autoplay, setAutoplay] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const motionRef = useRef(motion);
  const reducedRef = useRef(reduced);
  const suppressClick = useRef(false);
  const gestureCleanup = useRef<(() => void) | null>(null);
  motionRef.current = motion;
  reducedRef.current = reduced;

  function apply(next: HeroMotion, announce: boolean) {
    if (next === motionRef.current) return;
    motionRef.current = next;
    setMotion(next);
    if (!announce) return;
    const logical = heroLogicalIndex(next.position, SLIDE_COUNT);
    const slide = HERO_SLIDES[logical];
    setAnnouncement(`${logical + 1} / ${SLIDE_COUNT}, ${slide.title}`);
  }

  function go(direction: 1 | -1, announce: boolean) {
    apply(stepHero(motionRef.current, direction, SLIDE_COUNT, reducedRef.current), announce);
  }

  function jump(logicalIndex: number, announce: boolean) {
    apply(jumpHero(motionRef.current, logicalIndex, SLIDE_COUNT, reducedRef.current), announce);
  }

  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      gestureCleanup.current?.();
    };
  }, []);

  useEffect(() => {
    if (motion.position >= 1 && motion.position <= SLIDE_COUNT) return;
    const timer = window.setTimeout(() => {
      const settled = settleHero(motionRef.current, SLIDE_COUNT);
      if (settled === motionRef.current) return;
      motionRef.current = settled;
      setMotion(settled);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [motion]);

  useEffect(() => {
    if (reduced || !autoplay || hovered || focused || hidden) return;
    const timer = window.setInterval(() => {
      const next = stepHero(motionRef.current, 1, SLIDE_COUNT, false);
      if (next === motionRef.current) return;
      motionRef.current = next;
      setMotion(next);
    }, HERO_AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [autoplay, focused, hidden, hovered, motion.position, reduced]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" || !event.isPrimary) return;
    if (motionRef.current.position < 1 || motionRef.current.position > SLIDE_COUNT) return;
    const startX = event.clientX;
    const pointerId = event.pointerId;
    let lastX = 0;

    const detach = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      gestureCleanup.current = null;
    };

    const finish = (ended: PointerEvent) => {
      if (ended.pointerId !== pointerId) return;
      detach();
      setDragX(0);
      if (lastX <= -SWIPE_THRESHOLD) {
        suppressClick.current = true;
        go(1, true);
      } else if (lastX >= SWIPE_THRESHOLD) {
        suppressClick.current = true;
        go(-1, true);
      } else if (Math.abs(lastX) > 10) {
        suppressClick.current = true;
      }
    };

    const move = (moved: PointerEvent) => {
      if (moved.pointerId !== pointerId) return;
      lastX = moved.clientX - startX;
      setDragX(lastX);
    };

    gestureCleanup.current?.();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    gestureCleanup.current = () => {
      detach();
      setDragX(0);
    };
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1, true);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      jump(0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      jump(SLIDE_COUNT - 1, true);
    }
  }

  const logical = heroLogicalIndex(motion.position, SLIDE_COUNT);
  const dragging = dragX !== 0;
  const animate = motion.animate && !reduced && !dragging;
  const transform = `translate3d(calc(${-motion.position * 100}% + ${dragX}px), 0, 0)`;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="잡사바 추천"
      className="min-w-0"
      onKeyDown={onKeyDown}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovered(false);
      }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) setFocused(false);
      }}
    >
      <div className="relative min-w-0 overflow-hidden rounded-[2rem] bg-paper">
        <div
          className="flex w-full min-w-0 touch-pan-y"
          style={{
            transform,
            transition: animate ? "transform 700ms cubic-bezier(0.22, 0.61, 0.36, 1)" : "none",
          }}
          onPointerDown={onPointerDown}
          onClickCapture={(event) => {
            if (!suppressClick.current) return;
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }}
          onTransitionEnd={(event) => {
            if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
            const settled = settleHero(motionRef.current, SLIDE_COUNT);
            if (settled === motionRef.current) return;
            motionRef.current = settled;
            setMotion(settled);
          }}
        >
          {FRAMES.map((frame, index) => {
            const visible = index === motion.position;
            const primary = index === 1;
            const Heading = visible ? "h1" : "p";
            return (
              <div
                key={frame.frameKey}
                role="group"
                aria-roledescription="slide"
                aria-label={`${heroLogicalIndex(index, SLIDE_COUNT) + 1} / ${SLIDE_COUNT}`}
                aria-hidden={visible ? undefined : true}
                inert={visible ? undefined : true}
                className="relative w-full min-w-0 shrink-0 basis-full"
              >
                <div className="relative aspect-video">
                  <picture className="absolute inset-0">
                    <source type="image/avif" srcSet={`${frame.avifSmall} 960w, ${frame.avif} 1672w`} sizes={HERO_SIZES} />
                    <source type="image/webp" srcSet={`${frame.webpSmall} 960w, ${frame.webp} 1672w`} sizes={HERO_SIZES} />
                    <img
                      src={frame.webp}
                      alt={frame.alt}
                      width={1672}
                      height={940}
                      draggable={false}
                      decoding="async"
                      fetchPriority={primary ? "high" : "auto"}
                      loading={primary ? "eager" : "lazy"}
                      className="h-full w-full object-cover object-center select-none"
                    />
                  </picture>
                  <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-paper/80 to-transparent md:block" />
                </div>
                <div className="px-5 pb-5 pt-4 md:absolute md:inset-y-0 md:right-0 md:flex md:w-[min(24rem,38%)] md:items-center md:px-6 md:py-8 lg:px-8">
                  <div className="md:w-full md:rounded-[1.5rem] md:bg-paper/92 md:p-6 md:shadow-sm md:ring-1 md:ring-line">
                    <p className="text-sm font-semibold text-gochujang">{frame.kicker}</p>
                    <Heading className="serif mt-2 text-3xl leading-tight text-ink md:text-4xl">{frame.title}</Heading>
                    <p className="mt-3 text-sm leading-6 text-ink/80">{frame.body}</p>
                    <Link href={frame.href} className="btn btn-primary mt-5">
                      {frame.cta}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-2 md:inset-x-auto md:bottom-4 md:left-4 md:right-auto md:top-auto">
          <div className="flex items-center gap-0.5 rounded-full bg-paper/92 p-1 shadow-sm ring-1 ring-line">
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-cream" aria-label="이전 슬라이드" onClick={() => go(-1, true)}>
              <Chevron direction="left" />
            </button>
            <div role="group" aria-label="슬라이드 선택" className="flex items-center gap-1.5 px-1.5">
              {HERO_SLIDES.map((slide, index) => {
                const current = logical === index;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`${slide.title} 슬라이드로 이동`}
                    aria-current={current ? "true" : undefined}
                    onClick={() => jump(index, true)}
                    className={`h-2 rounded-full motion-reduce:transition-none ${current ? "w-6 bg-gochujang" : "w-2 bg-ink/30 hover:bg-ink/50"} transition-[width,background-color] duration-300`}
                  />
                );
              })}
            </div>
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-cream" aria-label="다음 슬라이드" onClick={() => go(1, true)}>
              <Chevron direction="right" />
            </button>
          </div>
          {reduced ? null : (
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-paper/92 text-ink shadow-sm ring-1 ring-line hover:bg-cream"
              aria-label={autoplay ? "자동 재생 멈추기" : "자동 재생 시작"}
              onClick={() => setAutoplay((value) => !value)}
            >
              {autoplay ? <PauseIcon /> : <PlayIcon />}
            </button>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
