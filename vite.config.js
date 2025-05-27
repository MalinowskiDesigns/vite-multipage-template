import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import { createHtmlPlugin } from 'vite-plugin-html';
import eslintPlugin from 'vite-plugin-eslint';
import webfontDownload from 'vite-plugin-webfont-dl';
import viteImagemin from 'vite-plugin-imagemin';
import clean from 'vite-plugin-clean';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import sitemap from 'vite-plugin-sitemap';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
	// 0. Załaduj VITE_* zmienne z .env
	const env = loadEnv(mode, process.cwd(), 'VITE_');

	// 1. Wykryj katalogi stron
	const pageDirs = fs
		.readdirSync('./src/pages')
		.filter(
			(name) =>
				fs.existsSync(`./src/pages/${name}/${name}.json`) &&
				fs.existsSync(`./src/pages/${name}/${name}.js`) &&
				fs.existsSync(`${name === 'home' ? 'index' : name}.html`)
		);

	// 2. Zbuduj tablicę `pages` do EJS pluginu
	const pages = pageDirs.map((page) => {
		const htmlName = page === 'home' ? 'index' : page;
		const pageMeta = JSON.parse(
			fs.readFileSync(`./src/pages/${page}/${page}.json`, 'utf-8')
		);
		// połącz dane JSON + env
		const meta = { ...pageMeta, ...env };

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

	// 3. Przygotuj inputEntries dla Rollupa
	const inputEntries = pageDirs.reduce((acc, page) => {
		const htmlName = page === 'home' ? 'index' : page;
		acc[htmlName] = resolve(__dirname, `${htmlName}.html`);
		return acc;
	}, {});

	// 4. Finalna konfiguracja Vite
	return {
		plugins: [
			// czyści dist/ przed buildem
			clean({
				targets: ['./dist'],
				verbose: true,
				watch: false,
			}),
			VitePWA({
				registerType: 'autoUpdate',
				includeAssets: ['favicon.ico', 'robots.txt'], // pliki z public/, które też mają być w SW
				manifest: {
					name: 'Vite Template',
					short_name: 'ViteTpl',
					description: 'Lekki, wielostronicowy szablon z PWA',
					theme_color: '#040413',
					background_color: '#ffffff',
					display: 'standalone',
					start_url: '/',
					icons: [
						{
							src: 'icons/pwa-192x192.png',
							sizes: '192x192',
							type: 'image/png',
						},
						{
							src: 'icons/pwa-512x512.png',
							sizes: '512x512',
							type: 'image/png',
						},
						{
							src: 'icons/pwa-512x512-maskable.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'maskable',
						},
					],
				},
				workbox: {
					// jakie pliki cache’ować (wszystkie HTML, JS, CSS, obrazy)
					globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
				},
			}),

			// generuje HTML/EJS z data=meta
			createHtmlPlugin({ pages }),

			// ESLint w dev i build
			eslintPlugin({
				// sprawdzaj wszystkie .js w src/
				include: ['src/**/*.js'],
				// wyłącz cache, żeby zawsze widzieć aktualne błędy
				cache: false,
			}),

			// sprite SVG z src/assets/icons
			createSvgIconsPlugin({
				iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
				symbolId: 'icon-[name]',
			}),

			// Google Fonts pobierane lokalnie
			webfontDownload(),

			// optymalizacja obrazów + tylko AVIF
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

			// sitemap.xml + robots.txt
			sitemap({
				hostname: env.VITE_SITE_URL,
				outDir: 'dist',
				routes: [],
				changefreq: 'weekly',
				priority: 0.8,
				readable: true,
			}),

			// legacy build dla starszych przeglądarek
			legacy({
				targets: ['defaults', 'not IE 11'],
			}),
		],

		build: {
			rollupOptions: {
				input: inputEntries,
			},
		},
	};
});
