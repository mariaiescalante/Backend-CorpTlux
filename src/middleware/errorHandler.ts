import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ message: "Ruta no encontrada" });
}

interface MysqlErrorLike extends Error {
  code?: string;
  errno?: number;
}

interface ValidationErrorLike extends Error {
  statusCode?: number;
  errors?: { field: string; message: string }[];
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  const valErr = err as ValidationErrorLike;
  if (valErr.statusCode && valErr.errors) {
    res.status(valErr.statusCode).json({ message: valErr.message, errors: valErr.errors });
    return;
  }

  if (err instanceof SyntaxError && "status" in err && (err as { status?: number }).status === 400) {
    res.status(400).json({ message: "JSON malformado en la petición" });
    return;
  }

  const mysqlErr = err as MysqlErrorLike;
  if (mysqlErr.errno === 1062) {
    res.status(409).json({ message: "Registro duplicado" });
    return;
  }
  if (mysqlErr.errno === 1451) {
    res.status(409).json({ message: "El registro tiene dependencias y no puede eliminarse" });
    return;
  }
  if (mysqlErr.errno === 1452) {
    res.status(400).json({ message: "Referencia foránea inválida" });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Error interno del servidor" });
}
