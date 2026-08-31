import base from "./packages/shared/eslint-config/base.mjs";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/dist-test/**",
      "**/.next/**",
      "**/.turbo/**",
      "effect-erp.html",
      "src/**",
      ".testenv/**",
      ".superpowers/**",
      "tooling/fixtures/**",
    ],
  },
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./tsconfig.lint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // R16: test fixtures intentionally inspect untyped Supertest JSON and mock framework boundaries.
    files: [
      "apps/api/test/**/*.ts",
      "apps/web/src/**/*.test.{ts,tsx}",
      "packages/**/src/**/*.test.{ts,tsx}",
      "packages/**/src/test/**/*.ts",
    ],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
];
