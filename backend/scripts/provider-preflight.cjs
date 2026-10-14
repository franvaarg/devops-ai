require('dotenv').config({quiet:true});
const { GoogleGenAI } = require('@google/genai');
const { context } = require('../src/operations/logger');
const requestId = require('node:crypto').randomUUID();
context.run({ requestId }, async()=>{
 if (process.argv.includes('--analysis')) {
  const boundary = require.resolve('../src/operations/provider');
  require.cache[boundary] = { id: boundary, filename: boundary, loaded: true, exports: { providerCall: (_provider, operation) => operation() } };
  const result = await require('../src/services/aiService').analyzeLog('INFO healthcheck healthy; all requests succeeded; no failures observed');
  console.log(JSON.stringify({requestId,analysisSucceeded:true,actionability:result.actionability})); return;
 }
 const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
 const models = await ai.models.list({config:{pageSize:100,httpOptions:{timeout:15000}}});
 const names=[];
 for await(const model of models) { if(model.name?.includes('gemini')) names.push(model.name); }
 console.log(JSON.stringify({configuredModel:process.env.GEMINI_MODEL||'gemini-3.6-flash',availableModels:names},null,2));
}).catch(e=>{console.log(JSON.stringify({requestId,providerStatus:e.status||e.code||null,errorType:e.name||'ProviderError',causeCode:e.cause?.code||null}));process.exitCode=1});
