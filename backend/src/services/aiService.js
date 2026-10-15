const { AppError } = require('../operations/errors');
// Provider adapters expose analyzeLog(log, context) and return validated results.
// Selection is explicit. No credential-dependent or failure-triggered switching.
function createAnalyzer(providers, name) {
  if (!Object.hasOwn(providers, name) || typeof providers[name]?.analyzeLog !== 'function') throw new AppError('AI_PROVIDER_UNAVAILABLE');
  return (log, context = '', options = {}) => providers[name].analyzeLog(log, context, options);
}
const providers = Object.freeze({ gemini: require('./geminiProvider') });
module.exports = {
  analyzeLog: (...args) => createAnalyzer(providers, process.env.AI_PROVIDER || 'gemini')(...args),
  createAnalyzer,
};
