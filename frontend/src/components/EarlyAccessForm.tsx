import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, requestEarlyAccess, trackEvent } from '../services/api';

export default function EarlyAccessForm() {
  const [values, setValues] = useState({ email: '', role: '', useCase: '', company: '', teamSize: '', website: '' });
  const [status, setStatus] = useState<'idle' | 'pending' | 'success'>('idle');
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const confirmation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (status === 'success') confirmation.current?.focus();
  }, [status]);
  const update = (key: keyof typeof values, value: string) => setValues(previous => ({ ...previous, [key]: value }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus('pending'); setError(''); trackEvent('access_submit_started');
    try {
      await requestEarlyAccess(values);
      setStatus('success'); trackEvent('access_request_received');
    } catch (failure) {
      const message = failure instanceof ApiError && failure.status === 429
        ? 'Too many requests. Please wait an hour before trying again.'
        : failure instanceof ApiError && failure.status === 400
          ? 'Check your email, professional role and primary use case, then try again.'
          : 'We could not confirm your request. Your details are still here. Please try again shortly.';
      setError(message); setStatus('idle');
    } finally { inFlight.current = false; }
  }
  if (status === 'success') return <div ref={confirmation} tabIndex={-1} className="access-confirmation" role="status">
    <span className="confirmation-icon" aria-hidden="true">✓</span>
    <h3>Your request has been received.</h3>
    <p>We’ll contact you about early-access availability. No account has been created.</p>
  </div>;
  return <form className="access-form" onSubmit={submit} aria-label="Early access request" aria-busy={status === 'pending'}>
    <p className="form-required">Fields marked * are required.</p>
    <fieldset className="form-fields" disabled={status === 'pending'}><legend className="sr-only">Your access request details</legend>
      <div className="field-wide"><label htmlFor="access-email">Email *</label><input id="access-email" name="email" type="email" autoComplete="email" maxLength={254} required value={values.email} onChange={e => update('email', e.target.value)} placeholder="you@company.com" /></div>
      <div><label htmlFor="access-role">Professional role *</label><select id="access-role" name="role" required value={values.role} onChange={e => update('role', e.target.value)}><option value="">Select your role</option>{['Engineering leadership', 'Software engineering', 'DevOps / SRE', 'Technical support', 'Founder', 'Other'].map(value => <option key={value}>{value}</option>)}</select></div>
      <div><label htmlFor="access-use-case">Primary use case *</label><select id="access-use-case" name="useCase" required value={values.useCase} onChange={e => update('useCase', e.target.value)}><option value="">Select a use case</option>{['Application errors', 'Failed deployments', 'Support escalations', 'Evaluating incident triage'].map(value => <option key={value}>{value}</option>)}</select></div>
      <div><label htmlFor="access-company">Company or website <span>(optional)</span></label><input id="access-company" name="company" autoComplete="organization" maxLength={160} value={values.company} onChange={e => update('company', e.target.value)} /></div>
      <div><label htmlFor="access-team">Team size <span>(optional)</span></label><select id="access-team" name="teamSize" value={values.teamSize} onChange={e => update('teamSize', e.target.value)}><option value="">Select team size</option>{['1–5', '6–20', '21–50', '51+'].map(value => <option key={value}>{value}</option>)}</select></div>
    </fieldset>
    <div className="form-trap" aria-hidden="true"><label htmlFor="access-website">Leave this field empty<input id="access-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={e => update('website', e.target.value)} /></label></div>
    <p className="form-note" id="access-data-note">Your details are used to review your request and contact you about access. Do not include production logs, credentials, or personal customer data.</p>
    <button className="primary" type="submit" disabled={status === 'pending'} aria-describedby="access-data-note">{status === 'pending' ? 'Submitting request…' : 'Submit Access Request'}<span aria-hidden="true"> ↗</span></button>
    {status === 'pending' && <p role="status" className="form-note">Waiting for confirmation…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}
