import axios from "axios";

type Stack = "frontend";
type Level = "debug" | "info" | "warn" | "error" | "fatal";
type Package = "api" | "component" | "hook" | "page" | "state" | "style" | "auth" | "config" | "middleware" | "utils";

let cachedToken: string | null = null;

async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    const res = await axios.post("/api/auth-token");
    cachedToken = res.data.token;
    return cachedToken;
  } catch {
    return null;
  }
}

export async function Log(stack: Stack, level: Level, pkg: Package, message: string) {
  try {
    const token = await getToken();
    if (!token) return;

    await axios.post(
      "http://20.207.122.201/evaluation-service/logs",
      { stack, level, package: pkg, message },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
  } catch {
    console.warn("[Logger] Failed to ship frontend log");
  }
}
