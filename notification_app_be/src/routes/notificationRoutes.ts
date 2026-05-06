import { Router } from "express";
import {
  getNotifications,
  getPriorityNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController";

const router = Router();

router.get("/", getNotifications);
router.get("/priority", getPriorityNotifications);
router.patch("/:id/read", markAsRead);
router.patch("/read-all", markAllAsRead);

export default router;
