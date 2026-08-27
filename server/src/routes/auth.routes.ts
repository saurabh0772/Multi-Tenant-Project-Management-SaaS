import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);

// Protected endpoints
authRouter.post("/logout-all", authenticate, logoutAll);
authRouter.get("/me", authenticate, me);

export default authRouter;
