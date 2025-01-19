/* eslint-disable unicorn/consistent-function-scoping */
import type { Node } from 'unist';
import { parse as parseYaml, YAMLParseError } from 'yaml';
import { z, ZodError } from 'zod';

import { TracedError } from '../util/error';
import { ENSNameRegex, GithubUsernameRegex } from '../util/regex';

export type UnparsedFrontmatter = {
    type: 'yaml';
    value: string;
    position: {
        start: { line: number; column: number };
        end: { line: number; column: number };
    };
};

export type Frontmatter = z.infer<typeof FrontMatterZod>;

export const FrontMatterZod = z.object({
    description: z.string().min(5).max(160),
    contributors: z
        .array(
            z
                .string()
                .regex(ENSNameRegex)
                .or(z.string().regex(GithubUsernameRegex))
        )
        .min(1)
        .max(10),
    ensip: z.object({
        status: z.enum(['draft', 'obsolete', 'final']),
        created: z.date(),
    }),
    ignoredRules: z.array(z.string()).optional(),
});

export const validateFrontmatter = (
    frontmatter: UnparsedFrontmatter,
    directPath: string
): Frontmatter => {
    try {
        const parsed = parseYaml(frontmatter.value as string, {
            customTags: ['timestamp'],
        }) as Frontmatter;

        return FrontMatterZod.parse(parsed);
    } catch (error) {
        if (error instanceof YAMLParseError) {
            const line =
                frontmatter!.position.start.line +
                (error.linePos?.[0].line || 0);
            const column =
                frontmatter!.position.start.column +
                (error.linePos?.[0].col || 0);
            const endColumn =
                frontmatter!.position.start.column +
                (error.linePos?.[0].col || 0);

            throw new TracedError(error, directPath, line, column, endColumn);
        } else if (error instanceof ZodError) {
            throw new TracedError(
                error,
                directPath,
                frontmatter!.position.start.line,
                frontmatter!.position.start.column,
                frontmatter!.position.end.column
            );
        }

        throw error;
    }
};

export const extractFrontmatter = (directPath: string, tree: Node) => {
    const first = ((tree as any)['children'] as [UnparsedFrontmatter]).shift();

    if (first && first.type === 'yaml' && first.value) {
        return validateFrontmatter(first, directPath);
    } else {
        throw new Error('No frontmatter found');
    }
};
