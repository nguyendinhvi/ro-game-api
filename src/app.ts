import express from "express";
import cors from "cors";
import { env } from "./config";
import { routes } from "./routes";
import { errorHandler, notFoundHandler } from "./middleware";

const app = express();

app.use(
  cors({
    origin: env.corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "x-custom-origin",
      "vdb_token",
    ],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
