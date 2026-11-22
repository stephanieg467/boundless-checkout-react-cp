import {defineConfig} from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/setupTests.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
		sequence: {hooks: "list"},
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "json-summary"],
			include: ["src/**/*.{ts,tsx}"],
		},
	},
});
