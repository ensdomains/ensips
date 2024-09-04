import { z } from 'zod';

export const LinePositionZod = z.object({
    start: z.object({
        line: z.number(),
        column: z.number(),
        offset: z.number(),
    }),
    end: z.object({
        line: z.number(),
        column: z.number(),
        offset: z.number(),
    }),
});
