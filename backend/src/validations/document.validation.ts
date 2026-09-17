import { z } from 'zod';

export const submitDocumentSchema = z.object({
  title: z.string({ required_error: 'Document title is required' }).min(1, 'Document title is required').max(255),
  description: z.string().optional()
});

export const updateStatusSchema = z.object({
  status: z.enum(['Approved', 'Needs Revision', 'Rejected'], {
    errorMap: () => ({ message: "Status must be 'Approved', 'Needs Revision', or 'Rejected'" })
  }),
  comment: z.string().max(2000, 'Comment must be 2000 characters or less').optional()
});

export const resubmitDocumentSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional()
});

export const queueQuerySchema = z.object({
  status: z.string().optional()
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
export type ResubmitDocumentInput = z.infer<typeof resubmitDocumentSchema>;
export type QueueQueryInput = z.infer<typeof queueQuerySchema>;
export type DocumentQueryInput = z.infer<typeof documentQuerySchema>;
export type DocumentIdParamInput = z.infer<typeof documentIdParamSchema>;

