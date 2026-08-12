import { Request, Response, NextFunction } from "express";
import { z } from "zod";

interface ValidateOptions {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

export function validate({ body, query, params }: ValidateOptions) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (body) req.body = body.parse(req.body);
      if (query) req.query = query.parse(req.query) as Request["query"];
      if (params) req.params = params.parse(req.params) as Request["params"];
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        const validationError = new Error("Error de validación") as Error & {
          statusCode: number;
          errors: typeof errors;
        };
        validationError.statusCode = 400;
        validationError.errors = errors;
        next(validationError);
        return;
      }
      next(err);
    }
  };
}
