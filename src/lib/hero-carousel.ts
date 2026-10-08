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
    kicker: "참기름",
    title: "한 숟갈의 고소함",
    body: "통참깨를 천천히 짜 작은 병에 담았습니다. 나물과 비빔, 구이 위에 올려 보세요.",
    cta: "소스 보기",
    href: "/category/sauce",
    alt: "크림색 배경 위에 놓인 잡사바 참기름 병 세 개와 참깨, 작은 종지",
    ...heroImage("sesame-oil"),
  },
  {
    id: "fish-sauce",
    kicker: "액젓",
    title: "멸치 · 까나리 · 참치",
    body: "국과 무침, 김치에 깊이를 더하는 세 가지 액젓입니다.",
    cta: "젓갈 보기",
    href: "/category/jeotgal",
    alt: "크림색 배경 위에 놓인 멸치·까나리·참치 액젓 병 세 개와 물고기 그림",
    ...heroImage("fish-sauce"),
  },
  {
    id: "barley-gochujang",
    kicker: "보리고추장",
    title: "보리로 삭힌 매콤함",
    body: "보리와 고춧가루를 천천히 발효했습니다. 찌개와 비빔, 쌈장으로 꺼내 쓰세요.",
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
