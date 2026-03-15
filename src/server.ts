import app from "./app";
import { env, connectDatabase } from "./config";

const start = async (): Promise<void> => {
  await connectDatabase();
  app.listen(env.port, () => {
    // console.log(`Server listening on port ${env.port}`);
    // console.log(`API base URL: http://localhost:${env.port}/api`);
  });
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
