import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import astro from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

export default defineConfig(
	globalIgnores(['dist/', '.astro/', '.wrangler/']),
	js.configs.recommended,
	ts.configs.recommended,
	astro.configs.recommended,
	{ languageOptions: { globals: { ...globals.browser, ...globals.node } } },
	prettier,
);
