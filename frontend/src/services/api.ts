export type HistoryItem = {
  id: number;
  severity: string;
  summary: string;
  evidence: string[];
  rootCause: string;
  confidence: string;
  recommendation: string;
  steps: string[];
  originalLog: string;
  createdAt: string;
};

export type AnalysisResult = {
  severity: string;
  summary: string;
  evidence: string[];
  rootCause: string;
  confidence: string;
  recommendation: string;
  steps: string[];
};

export type AuthResponse = {
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    createdAt?: string;
  };
};

export type CurrentUserResponse = {
  user: {
    id: number;
    email: string;
  };
};

type ApiErrorResponse = {
  message?: string;
  summary?: string;
};

type DeleteAnalysisResponse = {
  message: string;
  deletedAnalysis: HistoryItem;
};

type GetHistoryParams = {
  search?: string;
  severity?: string;
  limit?: number;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");

  if (!token) {
    return {
      "Content-Type": "application/json",
    };
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function getResponseData<T>(
  response: Response
): Promise<T> {
  const data = (await response.json()) as T &
    ApiErrorResponse;

  if (!response.ok) {
    throw new Error(
      data.message ??
        data.summary ??
        "The server could not complete the request."
    );
  }

  return data;
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/register`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    }
  );

  return getResponseData<AuthResponse>(response);
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/login`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  return getResponseData<AuthResponse>(response);
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/forgot-password`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    }
  );

  return getResponseData<{ message: string }>(response);
}

export async function resetPassword(
  token: string,
  password: string
): Promise<{ message: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/reset-password`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ password, token }),
    }
  );

  return getResponseData<{ message: string }>(response);
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/me`,
    {
      headers: getAuthHeaders(),
    }
  );

  return getResponseData<CurrentUserResponse>(response);
}

export async function analyzeLog(
  log: string
): Promise<AnalysisResult> {
  const response = await fetch(
    `${API_BASE_URL}/api/analyze`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ log }),
    }
  );

  return getResponseData<AnalysisResult>(response);
}

export async function getHistory({
  search = "",
  severity = "",
  limit = 50,
}: GetHistoryParams = {}): Promise<HistoryItem[]> {
  const query = new URLSearchParams();

  if (search.trim()) {
    query.set("search", search.trim());
  }

  if (severity) {
    query.set("severity", severity);
  }

  query.set("limit", String(limit));

  const response = await fetch(
    `${API_BASE_URL}/api/history?${query.toString()}`,
    {
      headers: getAuthHeaders(),
    }
  );

  return getResponseData<HistoryItem[]>(response);
}

export async function deleteAnalysis(
  id: number
): Promise<DeleteAnalysisResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/history/${id}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  return getResponseData<DeleteAnalysisResponse>(response);
}
