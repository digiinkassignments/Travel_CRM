import type { Response } from "express";

export function ok(res: Response, data: unknown, message = "Operation completed successfully") {
  return res.json({ success: true, data, message });
}

export function fail(res: Response, statusCode: number, message: string, code: string) {
  return res.status(statusCode).json({ success: false, message, code });
}
