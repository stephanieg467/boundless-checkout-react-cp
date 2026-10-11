const { defineConfig, globalIgnores } = require("eslint/config");

const globals = require("globals");
const tsParser = require("@typescript-eslint/parser");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const reactHooks = require("eslint-plugin-react-hooks");
const stylistic = require("@stylistic/eslint-plugin");

const js = require("@eslint/js");

module.exports = defineConfig([
	{
		files: ["**/*.{js,ts,tsx}"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				Atomics: "readonly",
				SharedArrayBuffer: "readonly",
			},

			parser: tsParser,
			ecmaVersion: 2022,
			sourceType: "module",
			parserOptions: {},
		},

		extends: [js.configs.recommended, ...typescriptEslint.configs["flat/recommended"]],

		plugins: {
			"@typescript-eslint": typescriptEslint,
			"react-hooks": reactHooks,
			"@stylistic": stylistic,
		},

		rules: {
			"no-unused-vars": "off",
			"@stylistic/semi": ["error", "always"],
			"@stylistic/quotes": ["error", "double"],
			"@stylistic/no-mixed-spaces-and-tabs": ["error", "smart-tabs"],
			"@stylistic/object-curly-spacing": ["error", "never"],
			"@stylistic/array-bracket-spacing": ["error", "never"],
			"@stylistic/indent": ["error", "tab", {SwitchCase: 1}],
			"@stylistic/no-trailing-spaces": "error",
			"@typescript-eslint/explicit-function-return-type": "off",
			"@typescript-eslint/no-unused-vars": "warn",
			"@typescript-eslint/no-explicit-any": "warn",
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",
		},
	},
	globalIgnores(["dist/*"]),
]);
