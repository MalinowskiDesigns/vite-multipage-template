// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

/* — pluginy — */
import FaviconsInject from 'vite-plugin-favicons-inject';
import { VitePWA } from 'vite-plugin-pwa';
import { createHtmlPlugin } from 'vite-plugin-html';
import eslint from 'vite-plugin-eslint';
import checker from 'vite-plugin-checker';
import htmlMinifier from 'vite-plugin-html-minifier';
import webfontDownload from 'vite-plugin-webfont-dl';
import viteImagemin from 'vite-plugin-imagemin';
import clean from 'vite-plugin-clean';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import sitemap from 'vite-plugin-sitemap';
import legacy from '@vitejs/plugin-legacy';
import mkcert from 'vite-plugin-mkcert';
import Inspect from 'vite-plugin-inspect';
import FullReload from 'vite-plugin-full-reload';
import { imagetools } from 'vite-imagetools';
// import PluginCritical from 'rollup-plugin-critical';

/* — helpery — */
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

/* — konfiguracja — */
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'VITE_');
	const dirs = pageDirs();

	/* lista stron dla vite-plugin-html */
	const pages = dirs.map((d) => {
		const meta = JSON.parse(
			fs.readFileSync(`src/pages/${d}/${d}.json`, 'utf-8')
		);
		const slug = d === 'home' ? 'index' : d;
		return {
			entry: `src/pages/${d}/${d}.js`,
			filename: `${slug}.html`,
			template: `${slug}.html`,
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
			Inspect(),
			clean({ targets: ['./dist'] }),
			FaviconsInject(resolve(__dirname, 'public/logo.svg'), { inject: true }),

			/* PWA */
			VitePWA({
				registerType: 'autoUpdate',
				includeAssets: [
					'favicon.ico',
					'browserconfig.xml',
					'yandex-browser-manifest.json',
					'og_image.jpg',
				],
				workbox: {
					globPatterns: ['**/*.{html,js,css,svg,ico,avif}'],
				},
			}),

			mkcert(),
			FullReload(['src/templates/**/*', 'src/pages/**/*.json']),
			createHtmlPlugin({ pages }),

			htmlMinifier({
				minifierOptions: {
					collapseWhitespace: true,
					removeComments: true,
					minifyCSS: true,
					minifyJS: true,
					sortAttributes: true,
				},
			}),

			eslint({ include: ['src/**/*.js'] }),

			checker({
				eslint: false,
				stylelint: {
					lintCommand: 'stylelint "./src/**/*.{css,scss}"',
				},
			}),

			createSvgIconsPlugin({
				iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
				symbolId: 'icon-[name]',
			}),

			webfontDownload(),

			/* ----------  IMAGES PIPELINE  ---------- */

			/* 1) auto-doklej query do <img> i CSS url() */
			{
				name: 'auto-jpg-png-to-avif',
				enforce: 'pre',
				transformIndexHtml(html) {
					return html.replace(
						/(<img\s+[^>]*src=")([^"?]*\.(jpe?g|png))"/gi,
						(_, prefix, path) =>
							`${prefix}${path}?w=480;768;1280&format=avif&as=srcset"`
					);
				},
				transform(code, id) {
					if (!/\.css$/i.test(id)) return;
					return code.replace(
						/url\((['"]?)([^'")?]+?\.(jpe?g|png))\1\)/gi,
						(_, q, path) =>
							`url(${q}${path}?w=480;768;1280&format=avif&as=srcset${q})`
					);
				},
			},

			/* 2) imagetools — tworzy warianty AVIF + srcset */
			imagetools({
				defaultDirectives: new URLSearchParams({
					format: 'avif', // tylko AVIF
					quality: '80',
					as: 'srcset', // zwróć string srcset (użyje go transform)
				}),
			}),

			/* 3) dodatkowa kompresja AVIF */
			viteImagemin({
				avif: { quality: 90 },
				webp: false,
				mozjpeg: false,
				pngquant: false,
				svgo: { plugins: [{ name: 'removeViewBox', active: false }] },
			}),

			/* ---------------------------------------- */

			sitemap({ hostname: env.VITE_SITE_URL, readable: true }),

			legacy({ targets: ['defaults', 'not IE 11'] }),
			// PluginCritical można dodać z powrotem
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
