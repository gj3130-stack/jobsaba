export const HERO_AUTOPLAY_MS = 5000;

export const HERO_SIZES = "(min-width: 75rem) 960px, 100vw";

export type HeroSlide = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  alt: string;
  avif: string;
  avifSmall: string;
  webp: string;
  webpSmall: string;
};

function heroImage(id: string): Pick<HeroSlide, "avif" | "avifSmall" | "webp" | "webpSmall"> {
  return {
    avif: `/images/hero/${id}.avif`,
    avifSmall: `/images/hero/${id}-960.avif`,
    webp: `/images/hero/${id}.webp`,
    webpSmall: `/images/hero/${id}-960.webp`,
  };
}

export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    id: "sesame-oil",
    kicker: "잡사바 대표 · 통참깨 참기름",
    title: "고소함이 다른\n한 숟갈",
    body: "국산 통참깨를 낮은 온도에서 천천히 볶고 눌러 짰습니다. 나물에, 비빔밥에, 한번 잡숨봐.",
    cta: "참기름·소스 보기",
    href: "/category/sauce",
    alt: "크림색 배경 위에 놓인 잡사바 참기름 병 세 개와 참깨, 작은 종지",
    ...heroImage("sesame-oil"),
  },
  {
    id: "fish-sauce",
    kicker: "액젓 3종",
    title: "멸치 · 까나리 · 참치,\n국물 맛의 비밀",
    body: "천천히 숙성한 멸치·까나리 액젓과 감칠맛 진한 참치액. 국, 무침, 김치에 한 스푼이면 됩니다.",
    cta: "액젓·젓갈 보기",
    href: "/category/jeotgal",
    alt: "크림색 배경 위에 놓인 멸치·까나리·참치 액젓 병 세 개와 물고기 그림",
    ...heroImage("fish-sauce"),
  },
  {
    id: "barley-gochujang",
    kicker: "항아리 숙성 · 보리고추장",
    title: "보리로 삭혀\n구수하게 매콤한",
    body: "찰보리와 햇고춧가루를 항아리에서 천천히 익혔습니다. 찌개, 비빔, 볶음에 넉넉히 꺼내 쓰세요.",
    cta: "장류 보기",
    href: "/category/jang",
    alt: "크림색 배경 위에 놓인 잡사바 보리고추장 항아리 세 개와 작은 종지",
    ...heroImage("barley-gochujang"),
  },
];

export type HeroFrame = HeroSlide & { frameKey: string; clone: boolean };

export function heroFrames(slides: readonly HeroSlide[]): HeroFrame[] {
  if (slides.length === 0) return [];
  if (slides.length === 1) return [{ ...slides[0], frameKey: slides[0].id, clone: false }];
  const first = slides[0];
  const last = slides[slides.length - 1];
  return [
    { ...last, frameKey: `${last.id}-clone-start`, clone: true },
    ...slides.map((slide) => ({ ...slide, frameKey: slide.id, clone: false })),
    { ...first, frameKey: `${first.id}-clone-end`, clone: true },
  ];
}

/**
 * `position` is an index on the extended track: 0 is a clone of the last slide,
 * 1..count are the real slides, and count+1 is a clone of the first.
 * Moving forward always increases `position`, so the incoming slide enters from the right.
 * `settleHero` then snaps a clone back to the matching real slide with animation off.
 */
export type HeroMotion = {
  position: number;
  animate: boolean;
};

export function initialHeroMotion(): HeroMotion {
  return { position: 1, animate: false };
}

export function restingHeroPosition(position: number, count: number): number {
  if (count <= 1) return 1;
  if (position <= 0) return count;
  if (position > count) return 1;
  return position;
}

export function heroLogicalIndex(position: number, count: number): number {
  if (count <= 0) return 0;
  return restingHeroPosition(position, count) - 1;
}

export function stepHero(motion: HeroMotion, direction: 1 | -1, count: number, reducedMotion: boolean): HeroMotion {
  if (count <= 1) return { position: 1, animate: false };
  if (!reducedMotion && (motion.position < 1 || motion.position > count)) return motion;
  if (reducedMotion) {
    const logical = heroLogicalIndex(motion.position, count);
    const next = (logical + direction + count) % count;
    return { position: next + 1, animate: false };
  }
  return { position: motion.position + direction, animate: true };
}

export function jumpHero(motion: HeroMotion, logicalIndex: number, count: number, reducedMotion: boolean): HeroMotion {
  if (count <= 0) return motion;
  if (!reducedMotion && (motion.position < 1 || motion.position > count)) return motion;
  const logical = ((logicalIndex % count) + count) % count;
  const position = logical + 1;
  if (position === motion.position) return motion;
  return { position, animate: !reducedMotion };
}

export function settleHero(motion: HeroMotion, count: number): HeroMotion {
  if (count <= 1) {
    if (motion.position === 1 && !motion.animate) return motion;
    return { position: 1, animate: false };
  }
  if (motion.position <= 0) return { position: count, animate: false };
  if (motion.position > count) return { position: 1, animate: false };
  return motion;
}
