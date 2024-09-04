/* eslint-disable unicorn/consistent-function-scoping */
import type { Plugin } from 'unified';
import { z } from 'zod';

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
                position: z.any(),
            },
            { description: 'Not text-based title' }
        )
    ),
});

export const extractTitle =
    (directPath: string, callback: (_found: string) => void): Plugin =>
    () =>
    (tree) => {
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

        callback(title);
    };
