"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { addProductImage } from "@/server/admin";

export function ImageUploader({ productId }: { productId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function upload(file: File) {
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setMessage("Supabase 설정을 확인해 주세요.");
      return;
    }
    const storagePath = `${productId}/${Date.now()}-${file.name.replace(/[^\w.]+/g, "_")}`;
    const { error } = await supabase.storage.from("product-images").upload(storagePath, file);
    if (error) {
      setMessage(error.message);
      return;
    }
    const saved = await addProductImage(productId, storagePath, file.name);
    setMessage(saved.ok ? "이미지를 연결했습니다." : saved.message);
    if (saved.ok) router.refresh();
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        aria-label="상품 이미지"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {message ? <p className="mt-2 text-sm">{message}</p> : null}
    </div>
  );
}
