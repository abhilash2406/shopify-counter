import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.shopify/**",
      "extensions/*/assets/**",
    ],
  },
  js.configs.recommended,

  // Backend: Node ESM
  {
    files: ["web/backend/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  // Backend and frontend tests: Jest globals (describe/it/expect/jest.mock/...)
  {
    files: ["web/backend/__tests__/**/*.js", "web/frontend/__tests__/**/*.{js,jsx}"],
    languageOptions: {
      globals: { ...globals.jest },
    },
  },

  // Backend tooling config (jest/babel), loaded by Node directly as CJS
  {
    files: ["web/backend/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
  },

  // Frontend tooling config (jest/babel) and its jsdom test-environment
  // setup file, both loaded by Node directly as CJS.
  {
    files: ["web/frontend/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node, ...globals.browser },
    },
  },

  // Admin frontend: React 18, automatic JSX runtime, bundled by Vite
  {
    files: ["web/frontend/**/*.{js,jsx}"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      // Vite config runs under Node; i18n setup reads process.env at build
      // time (replaced by Vite's define step), so both globals apply here.
      globals: { ...globals.browser, ...globals.node },
    },
    settings: { react: { version: "18.2" } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  // Storefront widget: Preact with the classic h()/Fragment pragma, which
  // (unlike React) supports plain `class` DOM attributes.
  {
    files: ["extensions/*-src/**/*.{js,jsx}"],
    plugins: { react },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { pragma: "h", fragment: "Fragment", version: "16.0" } },
    rules: {
      "react/jsx-uses-react": "warn",
      "react/jsx-uses-vars": "warn",
      "react/no-unknown-property": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];
