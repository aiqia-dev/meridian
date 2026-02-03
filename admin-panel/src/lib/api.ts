const API_BASE = "/admin/api";

export interface LoginResponse {
  token: string;
  expires_at: string;
  username: string;
}

export interface ApiError {
  error: string;
}

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Login failed");
  }

  return response.json();
}

export async function verifyToken(): Promise<boolean> {
  const token = localStorage.getItem("meridian_token");
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE}/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function executeCommand(command: string): Promise<any> {
  const token = localStorage.getItem("meridian_token");
  const response = await fetch(`${API_BASE}/command`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ command }),
  });

  if (!response.ok) {
    throw new Error("Command failed");
  }

  return response.json();
}

export function logout() {
  localStorage.removeItem("meridian_token");
  window.location.href = "/admin/login/";
}
