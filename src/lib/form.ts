export function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function intField(formData: FormData, key: string) {
  const parsed = Number(field(formData, key).replace(/,/g, ""));
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
