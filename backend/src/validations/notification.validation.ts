import { z } from 'zod';

export const notificationQuerySchema = z.object({
  unread_only: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
});

export const notificationIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid notification ID format' })
});
