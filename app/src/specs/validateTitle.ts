/* eslint-disable unicorn/consistent-function-scoping */
import type { Plugin } from 'unified';
import type { Parent } from 'unist';
import { z } from 'zod';

import { TracedError } from '../util/error';
import { LinePositionZod } from '../util/zod';

// ENSIP-123: Title must match regex
// or
// ENSIP-X: Title must match regex
const titleRegex = /ENSIP-(\d+|[Xx]):\s(.+)/;

export const TitleZod = z.object({
    type: z.literal('heading', {
        description: 'First element must be a title',
    }),
    depth: z.literal(1, { description: 'Title must only use one hashtag' }),
    children: z.array(
        z.object(
            {
                type: z.literal('text'),
                value: z.string().min(5).max(160),
                position: LinePositionZod,
            },
            { description: 'Not text-based title' }
        )
    ),
    position: LinePositionZod,
});

export type TitleNode = z.infer<typeof TitleZod>;

export const extractTitle =
    (directPath: string, callback: (_found: string) => void): Plugin =>
    () =>
    (_tree) => {
        const tree = _tree as any as Parent;

        // Count the number of h1 headings
        const titleCount = tree.children.filter(
            // @ts-ignore
            (node) => node.type === 'heading' && node.depth === 1
        ) as TitleNode[];

        if (titleCount.length > 1) {
            console.log(titleCount[1]);

            throw new TracedError(
                'More then one h1 (#) heading found, please use h2 (##) or h3 (###) headings',
                directPath,
                titleCount[1]!.position.start.line,
                titleCount[1]!.position.start.column,
                titleCount[1]!.position.end.column
            );
        }

        const first = (
            (tree as any)['children'] as [
                {
                    type: 'heading';
                    depth: number;
                    children: [{ type: 'text'; value: string }];
                }
            ]
        ).shift();

        const x = TitleZod.parse(first);

        const title = x.children
            .reduce(
                (accumulator, current) => accumulator + ' ' + current.value,
                ''
            )
            .trim();

        // title must match regex
        if (!titleRegex.test(title)) {
            throw new Error(
                'Invalid title format, please format title as "ENSIP-X: Title" (PR\'s) or "ENSIP-123: Title" (after merge)'
            );
        }

        callback(title);
    };
