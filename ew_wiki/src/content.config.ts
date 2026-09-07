import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		// `complexity` drives the reading-level badge under each page's title
		// (see ew_wiki/AGENTS.md's "Complexity badge per page" rule and
		// src/components/PageTitle.astro) — optional, since a splash page
		// (Home) has no reading level.
		schema: docsSchema({
			extend: () =>
				z.object({
					complexity: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
				}),
		}),
	}),
};
