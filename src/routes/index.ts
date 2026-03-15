import { Router } from "express";
import { gameRoutes } from "../modules/game/game.routes";
import { categoryRoutes } from "../modules/category/category.routes";
import { userRoutes } from "../modules/user/user.routes";

const router = Router();

router.use("/games", gameRoutes);
router.use("/categories", categoryRoutes);
router.use("/users", userRoutes);

export const routes = router;
