import { Router } from "express";
import { userController } from "./user.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticate } from "../../middleware/authenticate";
import type { RegisterBody, LoginBody, UserRequest, IUserQuery, IUserAnalyticsQuery, GoogleLoginBody } from "./user.interface";

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

router.post(
  "/google",
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as UserRequest<GoogleLoginBody>;
    await userController.googleLogin(typedReq, res);
  }),
);

router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    await userController.logout(req, res);
  }),
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    await userController.me(req, res);
  }),
);

router.get(
  "/analytics/daily",
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as UserRequest<
      unknown,
      unknown,
      IUserAnalyticsQuery
    >;
    await userController.dailyAnalytics(typedReq, res);
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as UserRequest<unknown, unknown, IUserQuery>;
    await userController.list(typedReq, res);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as UserRequest<unknown, { id: string }>;
    await userController.delete(typedReq, res);
  }),
);

export const userRoutes = router;
