import { useState, useEffect, useCallback } from "react";
import {
  fetchNotifications,
  fetchPriorityNotifications,
  Notification,
  NotificationType,
  PaginatedResponse,
} from "../lib/api";
import { Log } from "../lib/logger";

const READ_KEY = "read_notification_ids";

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(READ_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

export function useNotifications(page: number, limit: number, type?: NotificationType) {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadIds(getReadIds());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Log("frontend", "info", "hook", `Fetching notifications page=${page} limit=${limit} type=${type ?? "all"}`);
      const result = await fetchNotifications(page, limit, type);
      setData(result);
    } catch (err: any) {
      await Log("frontend", "error", "hook", `Failed to fetch notifications: ${err.message}`);
      setError("Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, type]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    if (!data) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      data.notifications.forEach((n) => next.add(n.id));
      saveReadIds(next);
      return next;
    });
  }, [data]);

  const notifications: Notification[] = (data?.notifications ?? []).map((n) => ({
    ...n,
    isRead: readIds.has(n.id),
  }));

  return { notifications, meta: data, loading, error, refetch: load, markRead, markAllRead };
}

export function usePriorityNotifications(n: number) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadIds(getReadIds());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Log("frontend", "info", "hook", `Fetching top ${n} priority notifications`);
      const result = await fetchPriorityNotifications(n);
      setNotifications(result);
    } catch (err: any) {
      await Log("frontend", "error", "hook", `Failed to fetch priority notifications: ${err.message}`);
      setError("Failed to load priority notifications.");
    } finally {
      setLoading(false);
    }
  }, [n]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const mapped = notifications.map((n) => ({ ...n, isRead: readIds.has(n.id) }));

  return { notifications: mapped, loading, error, refetch: load, markRead };
}
