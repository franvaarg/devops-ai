import { useState } from 'react';
// Owner-supplied policies are shown only when configured; no invented legal terms.
export default function ProductFooter() {
  const [consent, setConsent] = useState(localStorage.getItem('analytics') === 'yes');
  const privacy = import.meta.env.VITE_PRIVACY_URL;
  const terms = import.meta.env.VITE_TERMS_URL;
  const support = import.meta.env.VITE_SUPPORT_EMAIL;
  const company = import.meta.env.VITE_LEGAL_NAME;
  return <div className="mt-8 border-t border-slate-300 py-6 text-sm dark:border-slate-700">
    {company && <p>{company} · KANYI</p>}
    <div className="my-3 flex flex-wrap gap-4">{privacy && <a className="underline" href={privacy}>Privacy policy</a>}{terms && <a className="underline" href={terms}>Terms of service</a>}{support && <a className="underline" href={`mailto:${support}`}>Contact support</a>}</div>
    <details><summary className="cursor-pointer font-semibold">Log data and privacy</summary><p className="mt-3 max-w-3xl leading-6">Submitted logs and operational context are sent to Google Gemini after best-effort secret redaction. The log, context and result are stored in KANYI’s database until you delete the analysis. Remove credentials and personal data first; redaction is incomplete. Deleting an analysis removes it from the live database. Provider and backup retention follow the operator’s policies and configuration.</p></details>
    <label className="mt-4 flex items-start gap-2"><input type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); localStorage.setItem('analytics', e.target.checked ? 'yes' : 'no'); }} /> Share anonymous product journey events. No log content, email, or advertising cookies. You can disable this at any time.</label>
  </div>;
}
