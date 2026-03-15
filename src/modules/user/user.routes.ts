import { Router } from "express";
import { userController } from "./user.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import type { RegisterBody, LoginBody, UserRequest } from "./user.interface";

const router = Router();

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as UserRequest<RegisterBody>;
    await userController.register(typedReq, res);
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as UserRequest<LoginBody>;
    await userController.login(typedReq, res);
  }),
);

export const userRoutes = router;
