import { Request, Response } from "express";
import { fetchNotifications, fetchTopNByPriority } from "../services/notificationService";
import { NotificationType } from "../domain/notification";
import { Log } from "../middleware/logger";

export async function getNotifications(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const notification_type = req.query.notification_type as NotificationType | undefined;

    await Log("backend", "info", "controller", `getNotifications called page=${page} limit=${limit}`);

    const data = await fetchNotifications(page, limit, notification_type);
    res.status(200).json(data);
  } catch (err: any) {
    await Log("backend", "error", "controller", `getNotifications failed: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
}

export async function getPriorityNotifications(req: Request, res: Response) {
  try {
    const n = parseInt(req.query.n as string) || 10;

    await Log("backend", "info", "controller", `getPriorityNotifications called n=${n}`);

    const data = await fetchTopNByPriority(n);
    res.status(200).json({ notifications: data });
  } catch (err: any) {
    await Log("backend", "error", "controller", `getPriorityNotifications failed: ${err.message}`);
    res.status(500).json({ error: "Failed to compute priority notifications" });
  }
}

export async function markAsRead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await Log("backend", "info", "controller", `markAsRead called for id=${id}`);
    res.status(200).json({ success: true, id });
  } catch (err: any) {
    await Log("backend", "error", "controller", `markAsRead failed: ${err.message}`);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
}

export async function markAllAsRead(req: Request, res: Response) {
  try {
    await Log("backend", "info", "controller", "markAllAsRead called");
    res.status(200).json({ success: true });
  } catch (err: any) {
    await Log("backend", "error", "controller", `markAllAsRead failed: ${err.message}`);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
}
