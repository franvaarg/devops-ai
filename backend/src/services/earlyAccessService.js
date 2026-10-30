const { AppError } = require('../operations/errors');
const roles = ['Engineering leadership', 'Software engineering', 'DevOps / SRE', 'Technical support', 'Founder', 'Other'];
const useCases = ['Application errors', 'Failed deployments', 'Support escalations', 'Evaluating incident triage'];
const teamSizes = ['1–5', '6–20', '21–50', '51+'];

function validateLead(input) {
  const allowed = ['email', 'role', 'useCase', 'company', 'teamSize', 'website'];
  if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some(key => !allowed.includes(key))) throw new AppError('LEAD_INVALID');
  const text = (key, max) => {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.length > max || /[\x00-\x1f\x7f]/.test(value)) throw new AppError('LEAD_INVALID');
    return value.trim();
  };
  const email = text('email', 254).toLowerCase();
  const role = text('role', 60);
  const useCase = text('useCase', 80);
  const company = text('company', 160);
  const teamSize = text('teamSize', 20);
  const website = text('website', 200); // Honeypot, never stored.
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email) ||
      email.split('@')[0].length > 64 || email.split('@')[0].startsWith('.') || email.includes('..') ||
      !roles.includes(role) || !useCases.includes(useCase) || (teamSize && !teamSizes.includes(teamSize)) || website) throw new AppError('LEAD_INVALID');
  return { email, role, useCase, company, teamSize };
}

async function saveLead(input, database) {
  const lead = validateLead(input);
  // A unique normalized email handles concurrent retries. Do not overwrite a
  // prior request from an unauthenticated caller or disclose whether it exists.
  await database.query(`INSERT INTO early_access_leads(email, professional_role, primary_use_case, company, team_size)
    VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING`,
  [lead.email, lead.role, lead.useCase, lead.company || null, lead.teamSize || null]);
}
module.exports = { validateLead, saveLead };
