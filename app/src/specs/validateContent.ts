/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable unicorn/consistent-function-scoping */
import type { Node, Parent } from 'unist';

import { TracedError } from '../util/error';

const HEADINGS = [
    { title: /Abstract/, required: true, slug: 'abstract' },
    { title: /Motivation/, required: true, slug: 'motivation' },
    { title: /Specification/, required: true, slug: 'specification' },
    { title: /Rationale/, required: false, slug: 'rationale' },
    {
        title: /Backwards Compatibility/,
        required: false,
        slug: 'backwards-compatibility',
    },
    {
        title: /Forwards Compatibility/,
        required: false,
        slug: 'forwards-compatibility',
    },
    {
        title: /Security Considerations/,
        required: false,
        slug: 'security-considerations',
    },
    {
        title: /Appendix [\dA-Z]+: \w+/,
        required: false,
        allow_repeat: true,
        slug: 'appendix',
    },
    { title: /Copyright/, required: true, slug: 'copyright' },
];

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
    let requiredHeadings = [...HEADINGS];

    // Validate headings
    for (const heading of headings) {
        const [{ value }] = heading.children;
        let found = false;

        const newHeadings = [...requiredHeadings];

        for (const requiredHeading of requiredHeadings) {
            const match = requiredHeading.title.test(value);

            console.log('->', match, requiredHeading.title.source);

            if (match) {
                // Found heading, nice
                console.log(`Found heading \`${value}\``);
                found = true;

                if (!requiredHeading.allow_repeat && requiredHeading.required) {
                    newHeadings.splice(newHeadings.indexOf(requiredHeading), 1);
                }

                break;
            }

            // If we are allowed to bypass by exemption
            if (
                ignoredRules.includes(
                    `heading:${value.toLowerCase().replace(/\s/g, '-')}`
                )
            ) {
                console.log('Ignoring supplemental heading due to rule');
                found = true;
                break;
            }

            if (requiredHeading.required) {
                // If we are allowed to bypass requirement
                if (ignoredRules.includes(`missing:${requiredHeading.slug}`)) {
                    console.log('Ignoring missing heading due to rule');
                    newHeadings.splice(newHeadings.indexOf(requiredHeading), 1);
                    continue;
                }

                // Expected this heading, required, not found
                throw new TracedError(
                    `Unexpected heading \`${value}\`, expecting \`${requiredHeading.title.source}\``,
                    directPath,
                    heading.position.start.line,
                    heading.position.start.column,
                    heading.position.end.column
                );
            }
        }

        if (!found) {
            console.log(requiredHeadings);
            // Unexpected heading
            throw new TracedError(
                `Unexpected heading \`${value}\``,
                directPath,
                heading.position.start.line,
                heading.position.start.column,
                heading.position.end.column
            );
        }

        requiredHeadings = newHeadings;
    }

    for (const requiredHeading of requiredHeadings) {
        if (
            requiredHeading.required &&
            !ignoredRules.includes(`missing:${requiredHeading.slug}`)
        ) {
            throw new TracedError(
                `Missing required heading \`${requiredHeading.title.source}\``,
                directPath,
                0,
                0,
                0
            );
        }
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
