import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000",
});

export type NotificationType = "Event" | "Result" | "Placement";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface PaginatedResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchNotifications(
  page: number = 1,
  limit: number = 10,
  notification_type?: NotificationType
): Promise<PaginatedResponse> {
  const params: Record<string, string | number> = { page, limit };
  if (notification_type) params["notification_type"] = notification_type;

  const res = await api.get("/api/notifications", { params });
  return res.data;
}

export async function fetchPriorityNotifications(n: number = 10): Promise<Notification[]> {
  const res = await api.get("/api/notifications/priority", { params: { n } });
  return res.data.notifications;
}
