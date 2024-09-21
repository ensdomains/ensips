/* eslint-disable unicorn/consistent-function-scoping */
import type { Node, Parent } from 'unist';

import { TracedError } from '../util/error';

export const validateHeadings = (
    headings: {
        type: 'heading';
        depth: number;
        children: [{ type: 'text'; value: string }];
        position: {
            start: { line: number; column: number };
            end: { line: number; column: number };
        };
    }[],
    ignoredRules: string[],
    directPath: string
) => {
    const requiredHeadings = [
        'Abstract',
        'Motivation',
        'Specification',
        'Copyright',
    ].filter((heading) => !ignoredRules.includes(`missing:${heading}`));

    for (const heading of headings) {
        const [{ value }] = heading.children;

        if (requiredHeadings.includes(value)) {
            if (value == requiredHeadings[0]) {
                requiredHeadings.shift();
            } else {
                throw new TracedError(
                    `Expected ${requiredHeadings[0]} but found ${value}`,
                    directPath,
                    heading.position.start.line,
                    heading.position.start.column,
                    heading.position.end.column
                );
            }
        }
    }

    if (requiredHeadings.length > 0) {
        throw new TracedError(
            `Missing required heading${
                requiredHeadings.length === 1 ? '' : 's'
            } ${requiredHeadings.join(', ')}.`,
            directPath,
            0,
            0,
            0
        );
    }
};

export const validateContent = (
    directPath: string,
    _tree: Node,
    ignoredRules: string[]
) => {
    const tree = _tree as any as Parent;

    const headings = tree.children.filter(
        // @ts-ignore
        (node) => node.type === 'heading' && node.depth === 2
    ) as {
        type: 'heading';
        depth: number;
        children: [{ type: 'text'; value: string }];
        position: {
            start: { line: number; column: number };
            end: { line: number; column: number };
        };
    }[];

    validateHeadings(headings, ignoredRules || [], directPath);

    return 'OK';
};
