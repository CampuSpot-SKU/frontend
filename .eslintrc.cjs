module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime", // React 17+ JSX 변환 — 파일마다 import React 안 해도 됨
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  settings: { react: { version: "detect" } },
};
