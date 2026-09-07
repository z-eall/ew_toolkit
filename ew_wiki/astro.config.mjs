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
			title: 'Expand World Wiki',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
			customCss: ['./src/styles/theme.css'],
			components: {
				// Renders the `complexity` frontmatter badge under the H1 instead
				// of it floating as a first paragraph in the page body.
				PageTitle: './src/components/PageTitle.astro',
			},
			// Everything nests one level under 'EWP' so a future second mod
			// component is a sibling top-level group, not a rebuild of this one.
			// autogenerate still reflects each section's own folder — only the
			// folder root moved (docs/ → docs/ewp/).
			sidebar: [
				{ label: 'Home', slug: 'index' },
				{
					label: 'Guide - EWP',
					items: [
						// No dedicated EWP landing page — its old "first script" example
						// duplicated Concepts/script.mdx's "What goes inside a script"
						// (see ticket 04 round 3). Preparation is the entry point instead.
						{ label: 'Preparation', slug: 'ewp/preparation' },
						{ label: 'Concepts', items: [{ autogenerate: { directory: 'ewp/concepts' } }] },
						// "Examples" is the applied-content sibling to Concepts — worked scripts,
						// not definitions (renamed from the placeholder "Recipes" name, which read
						// as more advanced/cookbook-y than this section is going for).
						{ label: 'Examples', items: [{ autogenerate: { directory: 'ewp/examples' } }] },
						// Reference/Troubleshooting removed for now (2026-09-07) — placeholder
						// scaffolding from early tickets, not real content. Re-add when a section
						// actually has something to say (Reference needs schema-gen tooling that
						// doesn't exist yet; Troubleshooting needs the validator's diagnosis text).
					],
				},
				// { label: 'A Second Mod', items: [{ autogenerate: { directory: 'second-mod' } }] },
			],
		}),
	],
});
