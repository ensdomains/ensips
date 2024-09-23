/* eslint-disable unicorn/consistent-function-scoping */
import type { Plugin } from 'unified';

import { validateContent } from './validateContent';
import { type Frontmatter, extractFrontmatter } from './validateFrontmatter';
import { extractTitle } from './validateTitle';

export const validate =
    (
        directPath: string,
        callback: (_found: { frontmatter: Frontmatter; title: string }) => void
    ): Plugin =>
    () =>
    (_tree) => {
        const frontmatter = extractFrontmatter(directPath, _tree);

        const title = extractTitle(directPath, _tree);

        validateContent(directPath, _tree, frontmatter.ignoredRules || []);

        callback({ frontmatter, title });
    };
