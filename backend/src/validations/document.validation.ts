import { z } from 'zod';

export const updateStatusSchema = z.object({
  status: z.enum(['Approved', 'Needs Revision', 'Rejected'], {
    errorMap: () => ({ message: "Status must be 'Approved', 'Needs Revision', or 'Rejected'" })
  })
});

export const documentQuerySchema = z.object({
  status: z.string().optional(),
  advisor_id: z.string().uuid().optional()
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type DocumentQueryInput = z.infer<typeof documentQuerySchema>;
