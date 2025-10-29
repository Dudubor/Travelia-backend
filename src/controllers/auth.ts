import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth";
import { loginSchema, registerSchema, forgotPasswordSchema } from "../validators/auth.validators";

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const result = await authService.register(parsed);
    return res.status(201).json(result);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Validation error", issues: err.issues });
    }
    if (err?.message === "EMAIL_TAKEN" || err?.message === "Email já cadastrado") {
      console.log("Email já cadastrado");
      return res.status(409).json({ message: "Email already registered" });
    }
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await authService.login(parsed);
    return res.json(result);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Validation error", issues: err.issues });
    }
    if (err?.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    next(err);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId as string;
    const user = await authService.me(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (err) {
    next(err);
  }
};
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const parsed = forgotPasswordSchema.parse({ email, password });
    const result = await authService.forgotPassword(parsed);
    return res.json(result);
  } catch (err) {
    next(err);
  }
};
