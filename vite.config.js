import { defineConfig } from 'vite';
import { resolve } from 'path';
import { createHtmlPlugin } from 'vite-plugin-html';
import fs from 'fs';

// automatycznie wykrywamy wszystkie strony w /src/pages/
const pageDirs = fs
	.readdirSync('./src/pages')
	.filter(
		(name) =>
			fs.existsSync(`./src/pages/${name}/${name}.json`) &&
			fs.existsSync(`./src/pages/${name}/${name}.js`) &&
			fs.existsSync(`${name === 'home' ? 'index' : name}.html`)
	);

// tworzymy entry points do Rollupa
const inputEntries = pageDirs.reduce((acc, page) => {
	const htmlName = page === 'home' ? 'index' : page;
	acc[page] = resolve(__dirname, `${htmlName}.html`);
	return acc;
}, {});

// tworzymy dynamicznie pluginy HTML z meta danymi i include
const htmlPlugins = pageDirs.map((page) => {
	const htmlName = page === 'home' ? 'index' : page;
	const meta = JSON.parse(
		fs.readFileSync(`./src/pages/${page}/${page}.json`, 'utf-8')
	);

	return createHtmlPlugin({
		entry: `src/pages/${page}/${page}.js`,
		template: `${htmlName}.html`,
		inject: {
			data: meta,
			ejsOptions: {
				filename: resolve(__dirname, `${htmlName}.html`),
				localsName: 'meta',
				views: [resolve(__dirname, './')], // <-- KLUCZOWE: ustaw katalog główny projektu
			},
		},
		minify: true,
	});
});

export default defineConfig({
	build: {
		rollupOptions: {
			input: inputEntries,
		},
	},
	plugins: htmlPlugins,
});
