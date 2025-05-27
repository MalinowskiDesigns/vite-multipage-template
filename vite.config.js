// vite.config.js
import { defineConfig, loadEnv, splitVendorChunkPlugin } from 'vite';
import { resolve, extname } from 'path';
import fs from 'fs';
import { createHtmlPlugin } from 'vite-plugin-html';
import eslint from 'vite-plugin-eslint';
import webfontDownload from 'vite-plugin-webfont-dl';
import viteImagemin from 'vite-plugin-imagemin';
import clean from 'vite-plugin-clean';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import sitemap from 'vite-plugin-sitemap';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';

/* -------------------------------------------------------------------------- */
/*  Pomocnicze funkcje (modern arrow-style)                                    */
/* -------------------------------------------------------------------------- */

// ► buduje tablicę ikon na podstawie plików w public/icons/
const buildIconArray = (dir = 'public/icons') => {
	return fs
		.readdirSync(dir)
		.filter((f) => /\.(png|webp)$/i.test(f) && /\d+x\d+/.test(f))
		.map((f) => {
			const [, size] = f.match(/(\d+x\d+)/) || [];
			const purpose = /maskable/i.test(f) ? 'maskable' : undefined;
			return {
				src: `icons/${f}`,
				sizes: size,
				type: `image/${extname(f).slice(1)}`,
				...(purpose && { purpose }),
			};
		});
};

// ► zwraca listę katalogów stron
const getPageDirs = () =>
	fs
		.readdirSync('./src/pages')
		.filter(
			(n) =>
				fs.existsSync(`./src/pages/${n}/${n}.json`) &&
				fs.existsSync(`./src/pages/${n}/${n}.js`) &&
				fs.existsSync(`${n === 'home' ? 'index' : n}.html`)
		);

// ► buduje inputEntries dla Rollupa
const makeInputEntries = (dirs) =>
	dirs.reduce((acc, p) => {
		const htmlName = p === 'home' ? 'index' : p;
		acc[htmlName] = resolve(__dirname, `${htmlName}.html`);
		return acc;
	}, {});

/* -------------------------------------------------------------------------- */
/*  Konfiguracja Vite                                                          */
/* -------------------------------------------------------------------------- */

export default defineConfig(({ mode }) => {
	/* 0. env */
	const env = loadEnv(mode, process.cwd(), 'VITE_');

	/* 1. katalogi stron */
	const pageDirs = getPageDirs();

	/* 2. konfiguracja createHtmlPlugin */
	const pages = pageDirs.map((dir) => {
		const htmlName = dir === 'home' ? 'index' : dir;
		const pageMeta = JSON.parse(
			fs.readFileSync(`./src/pages/${dir}/${dir}.json`, 'utf-8')
		);
		const meta = { ...pageMeta, ...env };

		return {
			entry: `src/pages/${dir}/${dir}.js`,
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

	/* 3. input dla Rollupa */
	const inputEntries = makeInputEntries(pageDirs);

	/* 4. końcowy obiekt konfiguracyjny */
	return {
		plugins: [
			/* czyszczenie dist */
			clean({ targets: ['./dist'], verbose: true }),

			/* PWA */
			VitePWA({
				registerType: 'autoUpdate',
				includeAssets: [
					'favicon.ico',
					'robots.txt',
					'icons/favicon-48x48.png',
					'icons/android-chrome-48x48.png',
					'icons/mstile-144x144.png',
				],
				manifest: {
					name: 'Vite Template',
					short_name: 'ViteTpl',
					description: 'Lekki, wielostronicowy szablon z PWA',
					theme_color: '#040413',
					background_color: '#ffffff',
					display: 'standalone',
					start_url: '/',
					icons: buildIconArray(), // ← dynamicznie wygenerowana lista
				},
				workbox: {
					globPatterns: ['**/*.{js,css,html,png,svg,ico,webp,avif}'],
				},
			}),

			/* HTML + EJS */
			createHtmlPlugin({ pages }),

			/* ESLint */
			eslint({ include: ['src/**/*.js'], cache: false }),

			/* sprite SVG */
			createSvgIconsPlugin({
				iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
				symbolId: 'icon-[name]',
			}),

			/* Google Fonts lokalnie */
			webfontDownload(),

			/* optymalizacja obrazu */
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

			/* sitemap */
			sitemap({
				hostname: env.VITE_SITE_URL,
				outDir: 'dist',
				changefreq: 'weekly',
				priority: 0.8,
				readable: true,
			}),

			/* legacy build */
			legacy({ targets: ['defaults', 'not IE 11'] }),
		],

		build: {
			rollupOptions: {
				input: inputEntries,
				output: {
					manualChunks: (id) => {
						if (id.includes('node_modules')) return 'vendor';

						// wspólne moduły użyte w ≥ 2 stronach
						if (id.includes('/src/') && id.match(/\.js$/)) return 'commons';
					},
				},
			},
		},
	};
});
