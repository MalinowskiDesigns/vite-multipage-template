// vite.config.js
import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createHtmlPlugin } from 'vite-plugin-html';
import Inspect from 'vite-plugin-inspect';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagesDir = resolve(__dirname, 'src/pages');

// 1. Wykryj foldery stron (mają <page>.html, <page>.js, <page>.json)
const pageDirs = fs.readdirSync(pagesDir).filter((name) => {
	const dir = resolve(pagesDir, name);
	return (
		fs.statSync(dir).isDirectory() &&
		fs.existsSync(resolve(dir, `${name}.html`)) &&
		fs.existsSync(resolve(dir, `${name}.js`)) &&
		fs.existsSync(resolve(dir, `${name}.json`))
	);
});

// 2. Przygotuj tablicę dla vite-plugin-html
const pages = pageDirs.map((page) => {
	const htmlName = page === 'home' ? 'index' : page;
	const dir = resolve(pagesDir, page);
	const template = resolve(dir, `${page}.html`);
	const entry = resolve(dir, `${page}.js`);
	const data = JSON.parse(
		fs.readFileSync(resolve(dir, `${page}.json`), 'utf-8')
	);

	return {
		entry, // punkt wejścia JS
		filename: `${htmlName}.html`, // finalna nazwa pliku w /dist
		template, // ścieżka do Twojego <page>.html
		injectOptions: { data }, // zmienne do EJS (<%= title %>, <%= desc %> itd.)
	};
});

// 3. Przygotuj Rollup input (aby Vite widział wszystkie HTML jako osobne entry)
const inputEntries = pageDirs.reduce((entries, page) => {
	const htmlName = page === 'home' ? 'index' : page;
	entries[htmlName] = resolve(pagesDir, page, `${page}.html`);
	return entries;
}, {});

export default defineConfig({
	plugins: [
		// Debugger całego pipeline Vite
		Inspect(),

		// HTML + EJS multipage
		createHtmlPlugin({
			pages,
			ejsOptions: {
				// Gdzie szukać partiali (.ejs)
				views: [resolve(__dirname, 'src/templates')],
				// Szczegółowy stack trace przy błędach EJS
				compileOptions: { compileDebug: true },
			},
		}),
	],

	build: {
		rollupOptions: {
			input: inputEntries,
		},
	},

	server: {
		// Jeśli chcesz, możesz wymusić reload przy zmianach w templates
		watch: {
			ignored: ['!**/src/templates/**'],
		},
	},
});
