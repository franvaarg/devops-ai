require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is missing from the environment."
  );
}

const ai = new GoogleGenAI({
  apiKey,
});

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    severity: {
      type: "string",
      enum: ["Low", "Medium", "High", "Critical"],
    },
    summary: {
      type: "string",
    },
    rootCause: {
      type: "string",
    },
    recommendation: {
      type: "string",
    },
    steps: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: [
    "severity",
    "summary",
    "rootCause",
    "recommendation",
    "steps",
  ],
};

async function analyzeLog(log) {
  const cleanLog =
    typeof log === "string" ? log.trim() : "";

  if (!cleanLog) {
    throw new Error("A valid log is required.");
  }

  const prompt = `
You are a senior DevOps incident-response engineer.

Analyze the infrastructure or application log below.

Severity rules:

Critical:
Complete production outage, severe data loss, major security breach,
payment failure, or a core service is entirely unavailable.

High:
Major degradation or partial outage affecting many users.
Immediate attention is required, but the whole system is not down.

Medium:
Limited degradation, elevated latency, resource pressure, or a recoverable
problem. The service remains available and there is no data loss.

Low:
Informational or minor issue with little or no user impact.

Return a concise diagnosis with practical troubleshooting steps.

Log:
${cleanLog}
`;

 const response = await ai.models.generateContent({
  model: "gemini-3.6-flash",
  contents: prompt,
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: responseSchema,
  },
});

  const text = response.text;

  if (!text) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error(
      "Gemini JSON parsing error:",
      error
    );

    console.error(
      "Gemini raw response:",
      text
    );

    throw new Error(
      "Gemini returned an invalid JSON response."
    );
  }
}

module.exports = {
  analyzeLog,
};