import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import { createHtmlPlugin } from 'vite-plugin-html';

// 1. Automatyczne wykrycie stron z katalogu src/pages/
const pageDirs = fs
	.readdirSync('./src/pages')
	.filter(
		(name) =>
			fs.existsSync(`./src/pages/${name}/${name}.json`) &&
			fs.existsSync(`./src/pages/${name}/${name}.js`) &&
			fs.existsSync(`${name === 'home' ? 'index' : name}.html`)
	);

// 2. Wygenerowanie tablicy `pages` dla vite-plugin-html
const pages = pageDirs.map((page) => {
	const htmlName = page === 'home' ? 'index' : page;
	const meta = JSON.parse(
		fs.readFileSync(`./src/pages/${page}/${page}.json`, 'utf-8')
	);

	return {
		entry: `src/pages/${page}/${page}.js`,
		filename: `${htmlName}.html`,
		template: `${htmlName}.html`,
		injectOptions: {
			data: meta,
			ejsOptions: {
				filename: resolve(__dirname, `${htmlName}.html`),
				localsName: 'meta',
				views: [resolve(__dirname, 'src/templates')],
			},
		},
	};
});

// 3. Wygenerowanie inputEntries dla Rollupa
const inputEntries = pageDirs.reduce((acc, page) => {
	const htmlName = page === 'home' ? 'index' : page;
	acc[htmlName] = resolve(__dirname, `${htmlName}.html`);
	return acc;
}, {});

// 4. Eksport konfiguracji
export default defineConfig({
	build: {
		rollupOptions: {
			input: inputEntries,
		},
	},
	plugins: [
		createHtmlPlugin({
			pages,
		}),
	],
});
