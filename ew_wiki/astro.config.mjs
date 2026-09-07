// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	// Base is '/ew_wiki/'; all content lives under docs/ewp/, so real routes
	// land at '/ew_wiki/ewp/...' — the nested-URL decision from ticket 01
	// (ew-wiki-real-build), leaving room for a future second mod component
	// as a sibling top-level folder/sidebar group.
	base: '/ew_wiki/',
	// astro dev's on-demand esbuild transform doesn't apply CJS->ESM interop
	// to path-browserify (a CommonJS dep monaco-yaml's yaml.worker imports)
	// before the worker requests it, so the raw CJS file gets served as-is and
	// throws "module is not defined" inside the module worker. `astro build`
	// doesn't have this problem (Rollup's commonjs plugin handles it), so this
	// alias only matters for `astro dev`. See src/playground/path-browserify-esm.js
	// for the shim.
	vite: {
		resolve: {
			alias: {
				'path-browserify': fileURLToPath(new URL('./src/playground/path-browserify-esm.js', import.meta.url)),
			},
		},
	},
	integrations: [
		starlight({
			title: 'EW Toolkit Wiki',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
			customCss: ['./src/styles/theme.css'],
			// Everything nests one level under 'EWP' so a future second mod
			// component is a sibling top-level group, not a rebuild of this one.
			// autogenerate still reflects each section's own folder — only the
			// folder root moved (docs/ → docs/ewp/).
			sidebar: [
				{ label: 'Start Here', slug: 'index' },
				{
					label: 'EWP',
					items: [
						{ label: 'Start Here', slug: 'ewp' },
						{ label: 'Preparation', slug: 'ewp/preparation' },
						{ label: 'Concepts', items: [{ autogenerate: { directory: 'ewp/concepts' } }] },
						{ label: 'Reference', items: [{ autogenerate: { directory: 'ewp/reference' } }] },
						{ label: 'Recipes', items: [{ autogenerate: { directory: 'ewp/recipes' } }] },
						{ label: 'Troubleshooting', items: [{ autogenerate: { directory: 'ewp/troubleshooting' } }] },
					],
				},
				// { label: 'A Second Mod', items: [{ autogenerate: { directory: 'second-mod' } }] },
			],
		}),
	],
});
