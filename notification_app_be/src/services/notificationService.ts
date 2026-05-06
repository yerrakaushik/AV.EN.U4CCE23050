import axios from "axios";
import { getAuthToken } from "../config/auth";
import { Notification, NotificationType, PaginatedNotifications } from "../domain/notification";
import { Log } from "../middleware/logger";

const BASE_URL = "http://20.207.122.201";

export async function fetchNotifications(
  page: number = 1,
  limit: number = 10,
  notification_type?: NotificationType
): Promise<PaginatedNotifications> {
  const token = await getAuthToken();
  const params: Record<string, string | number> = { page, limit };
  if (notification_type) params["notification_type"] = notification_type;

  await Log("backend", "info", "service", `Fetching notifications page=${page} limit=${limit} type=${notification_type ?? "all"}`);

  const response = await axios.get(`${BASE_URL}/evaluation-service/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });

  const raw: Notification[] = (response.data.notifications ?? []).map((n: any) => ({
    id: n.ID,
    type: n.Type as NotificationType,
    message: n.Message,
    timestamp: n.Timestamp,
    isRead: false,
  }));

  await Log("backend", "info", "service", `Fetched ${raw.length} notifications successfully`);

  const start = (page - 1) * limit;
  const paginated = raw.slice(start, start + limit);

  return {
    notifications: paginated,
    total: raw.length,
    page,
    limit,
    totalPages: Math.ceil(raw.length / limit),
  };
}

export async function fetchTopNByPriority(n: number = 10): Promise<Notification[]> {
  await Log("backend", "info", "service", `Computing top ${n} priority notifications`);

  const token = await getAuthToken();
  const response = await axios.get(`${BASE_URL}/evaluation-service/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const raw: Notification[] = (response.data.notifications ?? []).map((item: any) => ({
    id: item.ID,
    type: item.Type as NotificationType,
    message: item.Message,
    timestamp: item.Timestamp,
    isRead: false,
  }));

  const weight: Record<NotificationType, number> = {
    Placement: 30,
    Result: 20,
    Event: 10,
  };

  const now = Date.now();

  const scored = raw.map((notification) => {
    const ageHours = (now - new Date(notification.timestamp).getTime()) / (1000 * 60 * 60);
    const recency = Math.max(0, 100 - ageHours);
    const score = weight[notification.type] + recency;
    return { notification, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, n).map((s) => s.notification);
  await Log("backend", "info", "service", `Top ${n} notifications computed`);
  return top;
}
