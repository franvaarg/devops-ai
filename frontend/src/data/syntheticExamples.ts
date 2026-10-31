export const syntheticExamples = [
  {
    name: "Failing orders",
    log: "10:42 WARN legacy cache API deprecated\n10:43 ERROR database connection refused\n10:43 GET /orders 503\n10:44 GET /orders 503",
    action: "Action Required",
    severity: "High",
    confidence: "Medium",
    risk: "Low",
    summary: "Orders are failing. The warning may be unrelated.",
    cause:
      "Connection failures coincide with repeated 503 responses. Database unavailability is a possible cause; the excerpt does not establish why it failed.",
    evidence: "10:43 GET /orders 503",
    next: "Check database health and connectivity from the application before changing configuration.",
  },
  {
    name: "Recovered retry",
    log: "10:42 WARN legacy cache API deprecated\n10:43 ERROR cache refresh timeout; retry scheduled\n10:44 INFO cache refresh retry succeeded\n10:45 INFO requests=100 failures=0",
    action: "Likely Noise",
    severity: "Low",
    confidence: "Low",
    risk: "High",
    summary: "The refresh recovered. No request failures are shown.",
    cause:
      "The initial timeout cause is unknown. Recovery and successful requests support a low-impact assessment of this window.",
    evidence: "10:44 INFO cache refresh retry succeeded",
    next: "Confirm retries are expected and check latency before dismissing repeated timeouts.",
  },
  {
    name: "Missing context",
    log: "ERROR payment dependency request timeout",
    action: "Investigate",
    severity: "Medium",
    confidence: "Low",
    risk: "High",
    summary: "A timeout needs context before escalation.",
    cause:
      "One timeout does not establish failed payments, an outage or a root cause. Recovery, environment and customer impact were not supplied.",
    evidence: "ERROR payment dependency request timeout",
    next: "Collect adjacent timestamps, retry outcomes and failed-request counts.",
  },
];
