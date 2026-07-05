require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function analyzeLog(log) {
  const prompt = `
You are a senior DevOps engineer.

Analyze the following log and respond in this format:

Summary:
Recommendation:

Log:
${log}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text;
}

module.exports = {
  analyzeLog,
};