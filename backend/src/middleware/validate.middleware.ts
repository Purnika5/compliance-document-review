import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodTypeAny } from 'zod';

export interface RequestValidationSchema {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export const validate = (schema: RequestValidationSchema | ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema instanceof ZodType) {
        req.body = await schema.parseAsync(req.body);
      } else {
        const target = schema as RequestValidationSchema;
        if (target.body) {
          req.body = await target.body.parseAsync(req.body);
        }
        if (target.query) {
          req.query = await target.query.parseAsync(req.query);
        }
        if (target.params) {
          req.params = await target.params.parseAsync(req.params);
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateRequest = validate;
