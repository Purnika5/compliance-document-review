import { z } from 'zod';

export const submitDocumentSchema = z.object({
  title: z.string({ required_error: 'Document title is required' }).min(1, 'Document title is required').max(255),
  description: z.string().optional()
});

export const updateStatusSchema = z.object({
  status: z.enum(['Approved', 'Needs Revision', 'Rejected'], {
    errorMap: () => ({ message: "Status must be 'Approved', 'Needs Revision', or 'Rejected'" })
  })
});

export const documentQuerySchema = z.object({
  status: z.string().optional(),
  advisor_id: z.string().uuid('Invalid advisor ID format').optional()
});

export const documentIdParamSchema = z.object({
  id: z.string().uuid('Invalid document ID format')
});

export type SubmitDocumentInput = z.infer<typeof submitDocumentSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type DocumentQueryInput = z.infer<typeof documentQuerySchema>;
export type DocumentIdParamInput = z.infer<typeof documentIdParamSchema>;
