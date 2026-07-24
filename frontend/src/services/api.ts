export type HistoryItem = {
  id: number;
  severity: string;
  summary: string;
  rootCause: string;
  recommendation: string;
  steps: string[];
  originalLog: string;
  createdAt: string;
};

export type AnalysisResult = {
  severity: string;
  summary: string;
  rootCause: string;
  recommendation: string;
  steps: string[];
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

const API_BASE_URL = "http://localhost:3000";

async function getResponseData<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & ApiErrorResponse;

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.summary ||
        "The server could not complete the request."
    );
  }

  return data;
}

export async function analyzeLog(
  log: string
): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ log }),
  });

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
    `${API_BASE_URL}/api/history?${query.toString()}`
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
    }
  );

  return getResponseData<DeleteAnalysisResponse>(response);
}