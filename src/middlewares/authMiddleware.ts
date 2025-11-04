import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const auth = req.header("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    (req as any).userId = decoded.sub;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
