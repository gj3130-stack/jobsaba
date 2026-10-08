"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";

export function ProductGallery({ images, badges }: { images: { src: string; alt: string }[]; badges?: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const list = images.length > 0 ? images : [{ src: "/brand/jobsaba-icon.svg", alt: "잡사바" }];
  const current = list[Math.min(index, list.length - 1)];
  const go = (step: number) => setIndex((value) => (value + step + list.length) % list.length);
  return (
    <div className="min-w-0">
      <div className="group relative aspect-square overflow-hidden rounded-[1.25rem] bg-cream-deep md:rounded-[1.75rem]">
        <img key={current.src} src={current.src} alt={current.alt} className="h-full w-full object-cover" fetchPriority={index === 0 ? "high" : "auto"} />
        {badges ? <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 md:left-4 md:top-4">{badges}</div> : null}
        {list.length > 1 ? (
          <>
            <button type="button" aria-label="이전 이미지" onClick={() => go(-1)} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-sm transition md:opacity-0 md:group-hover:opacity-100">
              <ChevronLeft size={20} />
            </button>
            <button type="button" aria-label="다음 이미지" onClick={() => go(1)} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-sm transition md:opacity-0 md:group-hover:opacity-100">
              <ChevronRight size={20} />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-semibold text-white">
              {index + 1} / {list.length}
            </span>
          </>
        ) : null}
      </div>
      {list.length > 1 ? (
        <ul className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {list.map((image, i) => (
            <li key={image.src} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${i + 1}번째 이미지 보기`}
                aria-current={i === index ? "true" : undefined}
                className={`block h-16 w-16 overflow-hidden rounded-xl bg-cream-deep ring-2 transition md:h-20 md:w-20 ${i === index ? "ring-ink" : "ring-transparent opacity-70 hover:opacity-100"}`}
              >
                <img src={image.src} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
