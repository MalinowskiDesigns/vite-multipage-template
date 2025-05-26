import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import { createHtmlPlugin } from 'vite-plugin-html';
import checker from 'vite-plugin-checker'; // ← tu!
import eslintPlugin from 'vite-plugin-eslint';
import webfontDownload from 'vite-plugin-webfont-dl';
import viteImagemin from 'vite-plugin-imagemin';
import clean from 'vite-plugin-clean';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import sitemap from 'vite-plugin-sitemap';

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
	plugins: [
		clean({
			targets: ['./dist'], // albo inna ścieżka/katalogi do usunięcia
			verbose: true, // opcjonalnie: loguj usuwane pliki
			watch: false, // false = czyść tylko na build, true = czyść też w dev przy zmianach
		}),
		createHtmlPlugin({
			pages,
		}),
		checker({
			eslintPlugin: {
				lintCommand: 'eslint "./src/**/*.js"', // lub './src/**/*.{js,vue,ts}'
			},
		}),
		createSvgIconsPlugin({
			iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
			symbolId: 'icon-[name]',
		}),

		webfontDownload(), // ← zero-config, automatycznie znajdzie i pobierze linki Google Fonts
		viteImagemin({
			// Optymalizacja JPEG
			mozjpeg: {
				quality: 90, // 0–100 (wyższa = lepsza jakość, większy rozmiar)
				progressive: true,
			},
			// Optymalizacja PNG
			pngquant: {
				quality: [0.9, 0.95], // zakres minimalna–maksymalna jakość
				speed: 4, // 1 (wolno, najlepsza kompresja) … 10 (szybko, gorsza kompresja)
			},
			// Optymalizacja SVG
			svgo: {
				plugins: [
					{ name: 'removeViewBox', active: false },
					{ name: 'cleanupIDs', active: true },
				],
			},
			// Wyłącz WebP
			webp: false,
			// Tylko AVIF
			avif: {
				quality: 90, // 0–100, dobierz do balansowania rozmiaru vs. jakości
			},
		}),
		sitemap({
			hostname: 'https://twojadomena.pl', // zmień na swój docelowy URL
			outDir: 'dist', // opcjonalnie, domyślnie 'dist'
			routes: [], // opcjonalnie: dodaj tutaj ręcznie dynamiczne ścieżki
			changefreq: 'weekly', // opcjonalnie: domyślne <changefreq>
			priority: 0.8, // opcjonalnie: domyślny <priority>
			readable: true, // opcjonalnie: sformatuj sitemapę w czytelny XML
		}),
	],
	build: {
		rollupOptions: {
			input: inputEntries,
		},
	},
});
