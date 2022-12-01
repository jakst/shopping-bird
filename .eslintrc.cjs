const disableOverZealousRules = {
  "no-empty": "off",
  "@typescript-eslint/no-floating-promises": "off",
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unsafe-argument": "off",
  "@typescript-eslint/no-non-null-assertion": "off",
};

module.exports = {
  ignorePatterns: [
    "node_modules",
    "dist",
    ".cache",
    ".solid",
    ".turbo",
    ".vercel",
    ".eslintrc.cjs",
    "postcss.config.cjs",
    "tailwind.config.cjs",
    "vite.config.ts",
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
  parserOptions: {
    tsconfigRootDir: ".",
    project: ["./packages/*/tsconfig.json"],
  },
  rules: {
    "@typescript-eslint/switch-exhaustiveness-check": "warn",

    ...disableOverZealousRules,
  },
};
