require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function analyzeLog(log) {
  const prompt = `
You are a senior DevOps engineer.

Analyze the following log and respond ONLY with valid JSON.
Do not use markdown.
Do not wrap the response in backticks.

JSON format:
{
  "severity": "Low | Medium | High | Critical",
  "summary": "Short summary of the issue",
  "rootCause": "Most likely root cause",
  "recommendation": "Main recommendation to fix it",
  "steps": [
    "Step 1",
    "Step 2",
    "Step 3"
  ]
}

Log:
${log}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text;

  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      severity: "Unknown",
      summary: text,
      rootCause: "Could not parse AI response as JSON.",
      recommendation: "Review the raw AI response.",
      steps: [],
    };
  }
}

module.exports = {
  analyzeLog,
};