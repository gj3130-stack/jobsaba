import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@next/next/no-img-element": "off",
      // App Router layout loads IBM Plex Sans KR and Nanum Myeongjo with system fallbacks.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default eslintConfig;
