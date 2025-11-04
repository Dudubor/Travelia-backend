import { Router } from "express";
import { forgotPassword, login, me, register } from "../controllers/auth.js";
import { authRequired } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authRequired, me);
router.post("/forgot-password", forgotPassword);

export default router;
