import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // next-pwa generates these at build time
      "public/sw.js",
      "public/sw.js.map",
      "public/workbox-*.js",
      "public/workbox-*.js.map",
      "public/swe-worker-*.js",
    ],
  },
];

export default eslintConfig;
