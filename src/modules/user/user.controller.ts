import { Response } from "express";
import { sendSuccess, sendSuccessWithMeta } from "../../utils/response";
import { AppError } from "../../middleware/errorHandler";
import type { AuthRequest } from "../../middleware/authenticate";
import { userService } from "./user.service";
import type {
  UserRequest,
  RegisterBody,
  LoginBody,
  GoogleLoginBody,
  IUserQuery,
  IUserAnalyticsQuery,
} from "./user.interface";

export class UserController {
  async register(
    req: UserRequest<RegisterBody>,
    res: Response,
  ): Promise<Response> {
    const result = await userService.register(req.body);
    return sendSuccess(res, result, 201);
  }

  async login(req: UserRequest<LoginBody>, res: Response): Promise<Response> {
    const result = await userService.login(req.body);
    return sendSuccess(res, result);
  }

  async googleLogin(
    req: UserRequest<GoogleLoginBody>,
    res: Response,
  ): Promise<Response> {
    if (!req.body?.id_token?.trim()) {
      throw new AppError(400, "Google id_token is required");
    }
    const result = await userService.loginWithGoogle(req.body.id_token);
    return sendSuccess(res, result);
  }

  async logout(req: AuthRequest, res: Response): Promise<Response> {
    const userId = req.userId;
    const accessToken = req.accessToken;
    if (!userId || !accessToken) {
      throw new AppError(401, "Unauthorized");
    }

    const result = await userService.logout(userId, accessToken);
    return sendSuccess(res, result);
  }

  async me(req: AuthRequest, res: Response): Promise<Response> {
    const userId = req.userId;
    if (!userId) {
      throw new AppError(401, "Unauthorized");
    }

    const user = await userService.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    return sendSuccess(res, user);
  }

  async list(
    req: UserRequest<unknown, unknown, IUserQuery>,
    res: Response,
  ): Promise<Response> {
    const { data, total, page, limit, total_pages } =
      await userService.findMany(req.query);
    return sendSuccessWithMeta(res, data, { page, limit, total, total_pages });
  }

  async dailyAnalytics(
    req: UserRequest<unknown, unknown, IUserAnalyticsQuery>,
    res: Response,
  ): Promise<Response> {
    const daysRaw = req.query.days
      ? parseInt(String(req.query.days), 10)
      : undefined;
    const days =
      Number.isInteger(daysRaw) && (daysRaw as number) > 0
        ? (daysRaw as number)
        : 14;
    const analytics = await userService.getDailyAnalytics(days);
    return sendSuccess(res, analytics);
  }

  async delete(
    req: UserRequest<unknown, { id: string }>,
    res: Response,
  ): Promise<Response> {
    const deleted = await userService.delete(req.params.id);
    if (!deleted) throw new AppError(404, "User not found");
    return sendSuccess(res, { deleted: true });
  }
}

export const userController = new UserController();
