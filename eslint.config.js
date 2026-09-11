import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".venv/**",
      "runtime-data/**",
      "dist/**",
      "build/**",
      "models/**",
      "data/**",
      "video/**",
      "mobile/android/**",
      "mobile/ios/**",
      "mobile/qvac/**",
      "mobile/.expo/**",
      "web/dist/**",
      "training/output/**",
      ".agents/**",
      ".skills/**",
      ".claude/**",
      ".opencode/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: { "no-console": "off" },
  },
);
