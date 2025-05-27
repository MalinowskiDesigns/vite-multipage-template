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
import htmlMinifier from 'vite-plugin-html-minifier';
// import PluginCritical   from 'rollup-plugin-critical';   // ★ (na razie wyłączony)

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
		const slug = p === 'home' ? 'index' : p;
		acc[slug] = resolve(__dirname, `${slug}.html`);
		return acc;
	}, {});

/* ───────── konfiguracja Vite ───────── */
export default defineConfig(({ mode }) => {
	// ładujemy tylko zmienne z prefiksem VITE_
	const env = loadEnv(mode, process.cwd(), 'VITE_');
	const dirs = pageDirs();

	/* createHtmlPlugin – meta + ENV */
	const pages = dirs.map((d) => {
		const meta = JSON.parse(
			fs.readFileSync(`src/pages/${d}/${d}.json`, 'utf-8')
		);
		const slug = d === 'home' ? 'index' : d;
		return {
			entry: `src/pages/${d}/${d}.js`,
			filename: `${slug}.html`, // zapis w dist/
			template: `${slug}.html`, // szablon źródłowy w root
			injectOptions: {
				data: { ...meta, ...env },
				ejsOptions: {
					filename: resolve(__dirname, `${slug}.html`),
					localsName: 'meta',
					views: [resolve(__dirname, 'src/templates')],
				},
			},
		};
	});

	return {
		plugins: [
			clean({ targets: ['./dist'] }),
			FaviconsInject(resolve(__dirname, 'public/logo.svg'), { inject: true }),
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
			createHtmlPlugin({ pages }),
			htmlMinifier({
				filter: /\.html?$/, // (domyślnie) – które pliki minifikować
				minifierOptions: {
					collapseWhitespace: true,
					removeComments: true,
					minifyCSS: true,
					minifyJS: true,
					sortAttributes: true,
				},
			}),
			eslint({ include: ['src/**/*.js'] }),
			createSvgIconsPlugin({
				iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
				symbolId: 'icon-[name]',
			}),
			webfontDownload(),
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
			sitemap({ hostname: env.VITE_SITE_URL, readable: true }),
			legacy({ targets: ['defaults', 'not IE 11'] }),

			/* ★ Critical CSS – odkomentuj, gdy będziesz gotów do dalszych testów
      (() => {
        const crit = PluginCritical({
          criticalUrl: '',
          criticalBase: 'dist/',
          criticalPages: dirs.map(d => ({
            uri: d === 'home' ? '/' : `/${d}`,
            template: d === 'home' ? 'index' : d,
          })),
          criticalConfig: { inline: true, width: 1300, height: 900 },
        });
        crit.enforce = 'post';
        crit.apply   = 'build';
        return crit;
      })(),
      */
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
