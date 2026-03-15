import { Response } from "express";
import { sendSuccess } from "../../utils/response";
import { userService } from "./user.service";
import type { UserRequest, RegisterBody, LoginBody } from "./user.interface";

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
}

export const userController = new UserController();
