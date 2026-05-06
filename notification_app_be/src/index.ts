import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import notificationRoutes from "./routes/notificationRoutes";
import { requestLogger } from "./middleware/requestLogger";
import { Log } from "./middleware/logger";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/api/notifications", notificationRoutes);

app.get("/health", async (_req, res) => {
  await Log("backend", "info", "route", "Health check endpoint hit");
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, async () => {
  await Log("backend", "info", "config", `Server started on port ${PORT}`);
  console.log(`Server running on http://localhost:${PORT}`);
});
