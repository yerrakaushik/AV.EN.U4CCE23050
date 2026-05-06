import { Request, Response, NextFunction } from "express";
import { Log } from "./logger";

export async function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  await Log("backend", "info", "middleware", `${req.method} ${req.path} received`);

  res.on("finish", async () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    await Log("backend", level, "middleware", `${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });

  next();
}
