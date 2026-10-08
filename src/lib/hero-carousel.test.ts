import { describe, expect, it } from "vitest";
import {
  HERO_SLIDES,
  heroFrames,
  heroLogicalIndex,
  initialHeroMotion,
  jumpHero,
  settleHero,
  stepHero,
  type HeroMotion,
} from "@/lib/hero-carousel";

describe("hero carousel wrap", () => {
  it("마지막에서 다음으로 가면 트랙이 계속 왼쪽으로 움직이고, 정착 후 첫 슬라이드다", () => {
    const count = HERO_SLIDES.length;
    let motion = initialHeroMotion();
    for (let step = 0; step < count - 1; step += 1) {
      const next = stepHero(motion, 1, count, false);
      expect(next.position).toBe(motion.position + 1);
      expect(next.animate).toBe(true);
      motion = next;
    }
    expect(heroLogicalIndex(motion.position, count)).toBe(count - 1);

    const wrapped = stepHero(motion, 1, count, false);
    expect(wrapped.position).toBe(count + 1);
    expect(wrapped.animate).toBe(true);
    expect(heroLogicalIndex(wrapped.position, count)).toBe(0);

    const settled = settleHero(wrapped, count);
    expect(settled).toEqual({ position: 1, animate: false });
    expect(heroLogicalIndex(settled.position, count)).toBe(0);

    const continued = stepHero(settled, 1, count, false);
    expect(continued.position).toBe(2);
    expect(continued.animate).toBe(true);
  });

  it("첫 슬라이드에서 이전으로 가면 마지막 슬라이드의 앞쪽 복제본으로 이어진다", () => {
    const count = 3;
    const wrapped = stepHero(initialHeroMotion(), -1, count, false);
    expect(wrapped).toEqual({ position: 0, animate: true });
    expect(heroLogicalIndex(wrapped.position, count)).toBe(count - 1);
    const settled = settleHero(wrapped, count);
    expect(settled).toEqual({ position: count, animate: false });
    expect(heroLogicalIndex(settled.position, count)).toBe(count - 1);
  });

  it("모션을 줄이면 애니메이션 없이 인덱스만 순환한다", () => {
    const count = 3;
    const fromFirst = stepHero({ position: 1, animate: false }, -1, count, true);
    expect(fromFirst).toEqual({ position: 3, animate: false });
    const fromLast = stepHero({ position: 3, animate: false }, 1, count, true);
    expect(fromLast).toEqual({ position: 1, animate: false });
  });

  it("복제 슬라이드로 이동하는 동안에는 인덱스를 더 밀지 않는다", () => {
    const busy: HeroMotion = { position: 4, animate: true };
    expect(stepHero(busy, 1, 3, false)).toBe(busy);
    expect(jumpHero(busy, 0, 3, false)).toBe(busy);
  });

  it("루프용 프레임은 앞에 마지막 슬라이드, 뒤에 첫 슬라이드를 붙인다", () => {
    const frames = heroFrames(HERO_SLIDES);
    expect(frames).toHaveLength(HERO_SLIDES.length + 2);
    expect(frames[0]).toMatchObject({ id: HERO_SLIDES[HERO_SLIDES.length - 1].id, clone: true });
    expect(frames[frames.length - 1]).toMatchObject({ id: HERO_SLIDES[0].id, clone: true });
    expect(frames.filter((frame) => !frame.clone).map((frame) => frame.id)).toEqual(HERO_SLIDES.map((slide) => slide.id));
  });

  it("슬라이드는 소스, 젓갈, 장류로 연결된다", () => {
    expect(HERO_SLIDES.map((slide) => slide.href)).toEqual(["/category/sauce", "/category/jeotgal", "/category/jang"]);
  });
});
