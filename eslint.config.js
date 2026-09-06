import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "test-results",
      "playwright-report",
      ".npm-cache",
      ".playwright-browsers",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "error",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-eval": "error",
      "no-new-func": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message: "Render user input as text.",
        },
        {
          selector: 'CallExpression[callee.name="fetch"]',
          message: "The simulator must remain offline.",
        },
        {
          selector: 'NewExpression[callee.name="WebSocket"]',
          message: "The simulator must remain offline.",
        },
      ],
    },
  },
  {
    files: ["*.js", "tests/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
