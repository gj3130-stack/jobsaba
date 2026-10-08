"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { createReview } from "@/server/shop";

export function ReviewBox({ productId, slug, userId }: { productId: string; slug: string; userId: string }) {
  const [path, setPath] = useState("");
  const [message, setMessage] = useState("");

  async function upload(file: File) {
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setMessage("Supabase 설정을 확인해 주세요.");
      return;
    }
    const storagePath = `${userId}/${Date.now()}-${file.name.replace(/[^\w.]+/g, "_")}`;
    const { error } = await supabase.storage.from("review-images").upload(storagePath, file);
    if (error) {
      setMessage(error.message);
      return;
    }
    setPath(storagePath);
    setMessage("사진을 올렸습니다. 리뷰와 함께 저장됩니다.");
  }

  return (
    <form action={createReview} className="panel space-y-3 p-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="imagePath" value={path} />
      <label className="block text-sm">
        별점
        <select className="field mt-1" name="rating" defaultValue="5">
          {[5, 4, 3, 2, 1].map((score) => (
            <option key={score} value={score}>
              {score}점
            </option>
          ))}
        </select>
      </label>
      <textarea className="field min-h-28" name="content" required minLength={2} placeholder="맛, 간, 양을 적어 주세요." />
      <input
        type="file"
        accept="image/*"
        aria-label="리뷰 이미지"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {message ? <p className="text-sm">{message}</p> : null}
      <button className="btn btn-primary" type="submit">
        리뷰 등록
      </button>
    </form>
  );
}
