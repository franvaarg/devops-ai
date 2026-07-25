import type { HistoryItem } from "../../services/api";

export type SeverityName =
  | "critical"
  | "high"
  | "medium"
  | "low";

export type SeverityCounts = Record<
  SeverityName,
  number
>;

const severityWeights: Record<
  SeverityName,
  number
> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function getSeverityCounts(
  history: HistoryItem[]
): SeverityCounts {
  return history.reduce<SeverityCounts>(
    (counts, item) => {
      const severity =
        item.severity.toLowerCase() as SeverityName;

      if (severity in counts) {
        counts[severity] += 1;
      }

      return counts;
    },
    {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }
  );
}

export function getCriticalRate(
  total: number,
  criticalCount: number
) {
  if (total === 0) {
    return 0;
  }

  return Math.round(
    (criticalCount / total) * 100
  );
}

export function getAverageSeverityScore(
  history: HistoryItem[]
) {
  if (history.length === 0) {
    return 0;
  }

  const totalScore = history.reduce(
    (score, item) => {
      const severity =
        item.severity.toLowerCase() as SeverityName;

      return (
        score +
        (severityWeights[severity] ?? 0)
      );
    },
    0
  );

  return totalScore / history.length;
}

export function getAverageSeverityLabel(
  score: number
) {
  if (score >= 3.5) {
    return "Critical";
  }

  if (score >= 2.5) {
    return "High";
  }

  if (score >= 1.5) {
    return "Medium";
  }

  if (score > 0) {
    return "Low";
  }

  return "No data";
}

export function getLatestAnalysis(
  history: HistoryItem[]
) {
  if (history.length === 0) {
    return null;
  }

  return [...history].sort(
    (firstItem, secondItem) =>
      new Date(
        secondItem.createdAt
      ).getTime() -
      new Date(firstItem.createdAt).getTime()
  )[0];
}

export function formatDashboardDate(
  dateValue: string
) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}