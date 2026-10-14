export type InputSignals = { lineCount: number; duplicateLineCount: number; timestampedLineCount: number; olderThanSevenDaysCount: number; futureTimestampCount: number };
export type HistoryItem = {
  inputSignals?: InputSignals;
  operationalContext?: string;
  actionability?: string;
  falsePositiveRisk?: string;
  noiseAssessment?: string;
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
  inputSignals?: InputSignals;
  operationalContext?: string;
  actionability?: string;
  falsePositiveRisk?: string;
  noiseAssessment?: string;
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
  error?: { code: string; message: string; requestId?: string };
};

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(requestId ? `${message} Reference: ${requestId}` : message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

type DeleteAnalysisResponse = {
  message: string;
  deletedAnalysis: HistoryItem;
};

type GetHistoryParams = {
  beforeId?: number;
  search?: string;
  severity?: string;
  limit?: number;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

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
  const data = (await response.json().catch(() => { throw new ApiError("The service is temporarily unavailable. Please retry.", response.status); })) as T &
    ApiErrorResponse;

  if (!response.ok) {
    throw new ApiError(
      data.error?.message ?? data.message ?? data.summary ?? "The server could not complete the request.",
      response.status, data.error?.code, data.error?.requestId
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

export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', headers: getAuthHeaders(), body: '{}' });
  if (!response.ok) await getResponseData(response);
}

export async function analyzeLog(
  log: string,
  requestKey: string = crypto.randomUUID(),
  context: string = ""
): Promise<AnalysisResult> {
  const response = await fetch(
    `${API_BASE_URL}/api/analyze`,
    {
      method: "POST",
      headers: { ...getAuthHeaders(), "Idempotency-Key": requestKey },
      body: JSON.stringify({ log, context, analytics: localStorage.getItem("analytics") === "yes" }),
    }
  );

  return getResponseData<AnalysisResult>(response);
}

export async function getHistory({
  beforeId,
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
  if (beforeId) query.set("beforeId", String(beforeId));

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

export type Plans = { freeLimit: number; proLimit: number; maxLogBytes: number; available: boolean; pricing: { amount: number; currency: string; interval: string } | null };
export type Account = { account: { plan: string; subscriptionStatus: string; currentPeriodEnd: string | null; hasBillingCustomer: boolean; cancelAtPeriodEnd: boolean }; usage: { used: number; reserved: number; remaining: number; limit: number; plan: string } };
export async function getPlans(): Promise<Plans> {
  return getResponseData<Plans>(await fetch(`${API_BASE_URL}/api/billing/plans`));
}
export async function getAccount(): Promise<Account> {
  return getResponseData<Account>(await fetch(`${API_BASE_URL}/api/account`, { headers: getAuthHeaders() }));
}
export async function openBilling(action: 'checkout' | 'portal') {
  const data = await getResponseData<{ url: string }>(await fetch(`${API_BASE_URL}/api/billing/${action}`, { method: 'POST', headers: getAuthHeaders(), body: '{}' }));
  window.location.assign(data.url);
}
export function trackEvent(event: string) {
  if (localStorage.getItem('analytics') !== 'yes') return;
  void fetch(`${API_BASE_URL}/api/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event }), keepalive: true }).catch(() => {});
}
