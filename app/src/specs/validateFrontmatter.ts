import { z } from 'zod';

import { ENSNameRegex, GithubUsernameRegex } from '../util/regex';

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
