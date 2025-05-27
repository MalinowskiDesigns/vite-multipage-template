// .eslintrc.cjs
module.exports = {
	root: true,
	plugins: ['@html-eslint'],
	overrides: [
		// JavaScript ― zostaw swoją dotychczasową konfigurację
		{ files: ['**/*.js'], extends: ['eslint:recommended'] },

		// ★ HTML i EJS
		{
			files: ['**/*.{html,ejs}'],
			languageOptions: { parser: '@html-eslint/parser' },
			extends: ['plugin:@html-eslint/recommended'],
			rules: {
				'@html-eslint/require-lang': 'error',
				'@html-eslint/require-li-container': 'warn',
			},
		},
	],
};
