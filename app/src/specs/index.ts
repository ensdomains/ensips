/* eslint-disable unicorn/consistent-function-scoping */
import matter from 'gray-matter';
import { readFile } from 'node:fs/promises';
import type { Plugin } from 'unified';
import type { Parent } from 'unist';

import { validateContent } from './validateContent';
import { type Frontmatter, validateFrontmatter } from './validateFrontmatter';
import { extractTitle } from './validateTitle';

export const validate =
    (
        directPath: string,
        callback: (_found: { frontmatter: Frontmatter; title: string }) => void
    ): Plugin =>
    () =>
    async (_tree) => {
        const tree = _tree as Parent;
        const relativePath = `../${directPath}`;
        const file = await readFile(relativePath, 'utf8');
        const matterFile = matter(file);
        const frontmatter = matterFile.data as Frontmatter;
        const title = extractTitle(directPath, tree);

        validateFrontmatter(frontmatter, directPath);
        validateContent(directPath, tree, frontmatter.ignoredRules || []);
        callback({ frontmatter, title });
    };
