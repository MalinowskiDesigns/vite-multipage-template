import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

// Filtruj globals, usuwając białe znaki
const cleanGlobals = Object.fromEntries(
	Object.entries(globals.browser).map(([key, value]) => [key.trim(), value])
);

export default defineConfig([
	{
		files: ['**/*.{js,mjs,cjs}'],
		languageOptions: {
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
			globals: cleanGlobals, // Używamy oczyszczonej wersji
		},
		plugins: { js },
		extends: ['js/recommended'],
		rules: {
			// np. "no-console": "warn"
		},
	},
]);
