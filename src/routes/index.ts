import { Router } from "express";
import { gameRoutes } from "../modules/game/game.routes";
import { categoryRoutes } from "../modules/category/category.routes";
import { userRoutes } from "../modules/user/user.routes";
import { playSessionRoutes } from "../modules/play-session/play-session.routes";
import { gameLikeRoutes } from "../modules/game-like/game-like.routes";

const router = Router();

router.use("/games", gameRoutes);
router.use("/categories", categoryRoutes);
router.use("/users", userRoutes);
router.use("/play-sessions", playSessionRoutes);
router.use("/game-likes", gameLikeRoutes);

export const routes = router;
