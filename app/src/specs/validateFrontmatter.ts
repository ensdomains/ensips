import { ens_normalize } from '@adraffy/ens-normalize';
import { z } from 'zod';

import { GithubUsernameRegex } from '../util/regex';

export const FrontMatterZod = z.object({
    description: z.string().min(5).max(160),
    contributors: z
        .array(
            z
                .string()
                // If the value has a dot, check that it's a normalized ENS name
                .refine(
                    (value) =>
                        value.includes('.') && ens_normalize(value) === value,
                    {
                        message: 'ENS name is not normalized',
                    }
                )
                // Otherwise treat it as a GitHub username
                .or(z.string().regex(GithubUsernameRegex))
        )
        .min(1)
        .max(10),
    ensip: z.object({
        status: z.enum(['draft', 'obsolete', 'final']),
        created: z.coerce.date(),
    }),
    ignoredRules: z.array(z.string()).optional(),
});

export type Frontmatter = z.infer<typeof FrontMatterZod>;

export const validateFrontmatter = (
    frontmatter: Frontmatter,
    directPath: string
): Frontmatter => {
    try {
        return FrontMatterZod.parse(frontmatter);
    } catch (error) {
        throw new Error(
            `Error parsing frontmatter for ${directPath}: ${error}`
        );
    }
};
