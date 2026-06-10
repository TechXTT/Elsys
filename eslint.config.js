// Flat ESLint config (baseline). The repo was never linted before this file
// existed, so the noisiest rules are downgraded to warnings rather than fixed
// across the codebase in one sweep — ratchet them back to errors over time.
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const globals = require("globals");

module.exports = tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "prisma/migrations/**",
      "public/**",
      "content/**",
      "docs/**",
      "graphify-out/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{jsx,tsx}"],
    ...react.configs.flat.recommended,
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.flat.recommended.rules,
      // Next.js injects React; JSX runtime needs no import
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-unescaped-entities": "warn",
    },
  },
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // Pre-existing debt: the codebase leans on `(prisma as any)` etc.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // The audit-log pattern is `try { recordAudit(...) } catch {}` by design
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Intentional control-char stripping in slugify helpers
      "no-control-regex": "off",
      "no-useless-escape": "warn",
    },
  },
  {
    // CommonJS utility scripts (seed, importers)
    files: ["**/*.{js,cjs,mjs}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  }
);
