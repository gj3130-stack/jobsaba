export function resolveImage(storagePath: string | null | undefined, bucket = "product-images") {
  if (!storagePath) return "/images/placeholder.svg";
  if (storagePath.startsWith("/") || storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return "/images/placeholder.svg";
  const encoded = storagePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${base}/storage/v1/object/public/${bucket}/${encoded}`;
}
