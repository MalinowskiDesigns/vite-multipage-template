// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

import FaviconsInject from 'vite-plugin-favicons-inject';
import { VitePWA } from 'vite-plugin-pwa';
import { createHtmlPlugin } from 'vite-plugin-html';
import eslint from 'vite-plugin-eslint';
import webfontDownload from 'vite-plugin-webfont-dl';
import viteImagemin from 'vite-plugin-imagemin';
import clean from 'vite-plugin-clean';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import sitemap from 'vite-plugin-sitemap';
import legacy from '@vitejs/plugin-legacy';

/* ───────── helpery ───────── */

const pageDirs = () =>
	fs
		.readdirSync('./src/pages')
		.filter(
			(d) =>
				fs.existsSync(`src/pages/${d}/${d}.json`) &&
				fs.existsSync(`src/pages/${d}/${d}.js`) &&
				fs.existsSync(`${d === 'home' ? 'index' : d}.html`)
		);

const makeInput = (dirs) =>
	dirs.reduce((acc, p) => {
		const html = p === 'home' ? 'index' : p;
		acc[html] = resolve(__dirname, `${html}.html`);
		return acc;
	}, {});

/* ───────── konfiguracja Vite ───────── */

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'VITE_');
	const dirs = pageDirs();

	/* createHtmlPlugin – meta z JSON + .env */
	const pages = dirs.map((d) => {
		const html = d === 'home' ? 'index' : d;
		const json = JSON.parse(
			fs.readFileSync(`src/pages/${d}/${d}.json`, 'utf-8')
		);
		return {
			entry: `src/pages/${d}/${d}.js`,
			filename: `${html}.html`,
			template: `${html}.html`,
			injectOptions: {
				data: { ...json, ...env },
				ejsOptions: {
					filename: resolve(__dirname, `${html}.html`),
					localsName: 'meta',
					views: [resolve(__dirname, 'src/templates')],
				},
			},
		};
	});

	return {
		plugins: [
			/* 1. czyść dist */
			clean({ targets: ['./dist'], verbose: true }),

			/* 3. PWA (SW + cache) – używa wygenerowanego manifestu */
			VitePWA({
				registerType: 'autoUpdate',
				includeAssets: [
					'favicon.ico',
					'browserconfig.xml',
					'yandex-browser-manifest.json',
					'og_image.jpg',
				],
				workbox: {
					globPatterns: ['**/*.{html,js,css,png,svg,ico,jpg,webp,avif}'],
				},
			}),

			/* 4. wielostronicowy HTML/EJS */
			createHtmlPlugin({ pages }),

			/* 2. favicony + browserconfig + manifest z jednego logo.svg */
			FaviconsInject(resolve(__dirname, 'public/logo.svg'), {
				favicons: {
					appName: 'Vite Template',
					appDescription: 'Lekki, wielostronicowy szablon z PWA',
					background: '#ffffff',
					theme_color: '#040413',
					icons: {
						android: true,
						appleIcon: true,
						appleStartup: true,
						favicons: true,
						windows: true,
						yandex: true,
						maskable: true, // generuje maskable-192/512
					},
				},
				inject: true, // automatyczne <link>/<meta> w <head>
			}),

			/* 5. ESLint */
			eslint({ include: ['src/**/*.js'], cache: false }),

			/* 6. SVG sprite z /src/assets/icons */
			createSvgIconsPlugin({
				iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
				symbolId: 'icon-[name]',
			}),

			/* 7. lokalne Google Fonts */
			webfontDownload(),

			/* 8. optymalizacja obrazków */
			viteImagemin({
				mozjpeg: { quality: 90, progressive: true },
				pngquant: { quality: [0.9, 0.95], speed: 4 },
				svgo: {
					plugins: [
						{ name: 'removeViewBox', active: false },
						{ name: 'cleanupIDs', active: true },
					],
				},
				webp: false,
				avif: { quality: 90 },
			}),

			/* 9. sitemap.xml + robots.txt */
			sitemap({
				hostname: env.VITE_SITE_URL,
				readable: true,
			}),

			/* 10. legacy polyfills */
			legacy({ targets: ['defaults', 'not IE 11'] }),
		],

		build: {
			rollupOptions: {
				input: makeInput(dirs),
				output: {
					manualChunks(id) {
						if (id.includes('node_modules')) return 'vendor';
					},
				},
			},
		},
	};
});
