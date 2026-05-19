import type { Literal, Parent } from 'unist';

import { TracedError } from '../util/error';

// ENSIP-123: Title must match regex
// or
// ENSIP-X: Title must match regex
const titleRegex = /ENSIP-(\d+|[Xx]):\s(.+)/;

export const extractTitle = (directPath: string, tree: Parent) => {
    const titleNodes = tree.children.filter(
        // @ts-ignore
        (node) => node.tagName === 'h1'
    ) as Parent[];

    if (titleNodes.length == 0) {
        throw new Error(
            'The ENSIP title must be specified as a h1 (#) heading.'
        );
    } else if (titleNodes.length > 1)
        throw new TracedError(
            'More then one h1 (#) heading found, please use h2 (##) or h3 (###) headings',
            directPath,
            titleNodes[1]!.position!.start.line,
            titleNodes[1]!.position!.start.column,
            titleNodes[1]!.position!.end.column
        );

    const first = titleNodes.shift();
    const firstChildren = first?.children as Literal[];
    const title = firstChildren?.[0]?.value as string;

    // title must match regex
    if (!titleRegex.test(title)) {
        throw new TracedError(
            'Invalid title format, please format title as "ENSIP-X: Title" (PR\'s) or "ENSIP-123: Title" (after merge)',
            directPath,
            first!.position!.start.line,
            first!.position!.start.column,
            first!.position!.end.column
        );
    }

    return title;
};
