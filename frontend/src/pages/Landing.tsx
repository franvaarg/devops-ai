import { useEffect } from 'react';
import { WorkspaceBar } from '../components/ui/Workspace';
import ProductFooter from '../components/ProductFooter';
import PublicDemo from '../components/PublicDemo';
import EarlyAccessForm from '../components/EarlyAccessForm';
import { trackEvent } from '../services/api';
import { earlyAccessEnabled, marketingOnly } from '../config/publicMode';

const steps = [
  ['01', 'Bring the relevant excerpt', 'Paste application logs or upload a .log or .txt file up to 16 KiB. Add context about the environment and recent changes.'],
  ['02', 'Review the assessment', 'Explore severity, actionability, potential causes, and the evidence behind the assessment. See where context is missing.'],
  ['03', 'Verify your next step', 'Use structured troubleshooting checks to guide your investigation. Revisit saved assessments and export a PDF when needed.'],
];
const questions = [
  ['What does early access include?', 'Request access to evaluate KANYI’s individual-account incident triage workflow. Submitting a request does not create an account or guarantee an invitation. We’ll contact you about availability.'],
  ['Can I connect my monitoring tools?', 'The current workflow uses pasted excerpts and text uploads. Native monitoring connectors and continuous log collection are not available.'],
  ['Can my team share a workspace?', 'KANYI currently uses individual accounts. Shared workspaces and team permissions are not available. Team size helps us understand who is interested.'],
  ['Will KANYI identify the root cause every time?', 'No. An excerpt can omit the information needed to establish a cause or incident impact. Causes are hypotheses, confidence is qualitative, and recommendations require human verification.'],
  ['What can I submit for analysis?', 'A relevant text excerpt up to 16 KiB, pasted directly or uploaded as a .log or .txt file, with optional operational context. Remove credentials and personal data before submission. Do not submit logs through the early-access form.'],
  ['Where do submitted logs go?', 'After best-effort secret redaction, logs and operational context are sent to Google Gemini. KANYI stores the redacted input and result until the analysis is deleted. Redaction is incomplete. Provider and backup retention depend on the operator’s policies and configuration.'],
];

export default function Landing({ onStart }: { onStart?: () => void }) {
  const accessLabel = marketingOnly ? 'Try the Free Demo' : earlyAccessEnabled ? 'Request Early Access' : 'Early access opening soon';
  const accessTarget = marketingOnly ? '#demo' : '#early-access';
  const visibleQuestions = marketingOnly ? [
    ['How do I try the demo?', 'Choose any of the three synthetic scenarios and inspect the assessment and source evidence. The demo is free and available immediately.'],
    ['Is this live AI analysis?', 'No. These are prepared synthetic examples that run locally in your browser. No Gemini, backend, authentication, payment, or analytics requests are made.'],
    ['Can I use my own logs?', 'This demo accepts no uploads or real logs. No personal information or backend connection is required.'],
    ['What does confidence mean?', 'Confidence is qualitative and reflects the context available in each example. Potential causes are hypotheses; recommended next steps need human verification.'],
  ] : questions.map(([question, answer], index) => {
    if (!earlyAccessEnabled && index === 0) return [question, 'Early access is not open yet. Explore the synthetic demo to see the individual-account incident triage workflow. This site is not accepting access requests.'];
    if (!earlyAccessEnabled && index === 2) return [question, 'KANYI currently uses individual accounts. Shared workspaces and team permissions are not available.'];
    if (!earlyAccessEnabled && index === 4) return [question, 'The application supports a relevant text excerpt up to 16 KiB, pasted directly or uploaded as a .log or .txt file, with optional operational context. Remove credentials and personal data before submission. The synthetic demo does not accept your logs.'];
    return [question, answer];
  });
  useEffect(() => { trackEvent('landing'); }, []);
  return <main className="marketing" id="top">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="nav-shell"><nav aria-label="Main navigation">
      <a className="brand" href="#top" aria-label="KANYI home"><span className="brand-mark" aria-hidden="true">K</span>KANYI</a>
      <div className="nav-sections"><a href="#demo">{marketingOnly ? 'Free demo' : 'Product'}</a><a href="#how">How it works</a><a href="#data">Data handling</a></div>
      <div className="nav-actions">{!marketingOnly && onStart && <button className="sign-in" onClick={onStart}>Sign in</button>}<a className="button primary" href={accessTarget} onClick={() => trackEvent('access_cta_clicked')}>{accessLabel}<span aria-hidden="true"> ↗</span></a></div>
    </nav></div>
    <section className="hero" id="main-content" aria-labelledby="hero-title">
      <div className="hero-copy"><p className="eyebrow"><span className="status-dot" aria-hidden="true" /> AI-Powered Incident Triage</p>
        <h1 id="hero-title">Turn application logs into <em>actionable incident insights.</em></h1>
        <p className="intro">Review potential root causes, assess severity, inspect supporting evidence, and get structured troubleshooting recommendations from a log excerpt.</p>
        <div className="hero-actions"><a className="button primary" href={accessTarget} onClick={() => trackEvent('access_cta_clicked')}>{accessLabel}<span aria-hidden="true"> ↗</span></a><a className="button secondary" href={marketingOnly ? '#how' : '#demo'} onClick={() => trackEvent('demo_opened')}>{marketingOnly ? 'Explore How It Works' : 'Explore the Demo'}<span aria-hidden="true"> ↓</span></a></div>
        <p className="hero-note">Free synthetic demo. No login, credit card, or personal information required.</p>
        <div className="hero-signals"><span>Potential causes</span><span>Source evidence</span><span>Next checks</span></div>
      </div>
      <div className="hero-product"><WorkspaceBar label="KANYI / incident assessment" detail="SYNTHETIC" /><PublicDemo /></div>
    </section>
    <div className="audience-strip"><p>Built for investigations across engineering, DevOps, and technical support.</p><span>Human judgment stays in the loop.</span></div>
    <section id="how" aria-labelledby="how-title"><div className="section-heading"><div><p className="eyebrow">The workflow</p><h2 id="how-title">From a log excerpt<br />to a clearer next step.</h2></div><p>A focused workflow for the moment you have logs, but need a structured way to investigate.</p></div>
      <div className="three-cols workflow-cards">{(marketingOnly ? [
        ['01', 'Choose a synthetic scenario', 'Explore prepared examples of failing orders, recovered retries, and missing context. No uploads or real log processing are available in this demo.'],
        ['02', 'Review the assessment', 'Compare severity, confidence, potential causes, and recommendations. These are prepared illustrations, not live AI analysis.'],
        ['03', 'Inspect the evidence', 'Open the source evidence and compare it with the selected synthetic log. Use the next checks to understand evidence-based troubleshooting.'],
      ] : steps).map(([number, title, body]) => <article key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
    </section>
    <section className="use-cases" aria-labelledby="use-cases-title"><p className="eyebrow">Where KANYI fits</p><h2 id="use-cases-title">For the questions behind the error.</h2><div className="three-cols">
      {[
        ['Application errors', 'What needs attention?', 'Investigate request failures, dependency timeouts, and database errors using the evidence in your excerpt.'],
        ['Failed deployments', 'What should I check first?', 'Review startup and deployment logs for possible configuration or dependency issues. Verify current impact separately.'],
        ['Support escalations', 'What can we establish?', 'Turn a supplied log excerpt into an assessment of potential causes, supporting evidence, and missing context.'],
      ].map(([label, title, body]) => <article key={label}><p className="card-label">{label}</p><h3>{title}</h3><p>{body}</p></article>)}
      </div><p className="section-note">{marketingOnly ? 'Explore three prepared incident scenarios, inspect the evidence, and compare the recommended next checks.' : 'A focused tool for individual accounts. Shared workspaces and native monitoring integrations are not available.'}</p>
    </section>
    <section className="evidence-section" aria-labelledby="evidence-title"><div><p className="eyebrow">Evidence before certainty</p><h2 id="evidence-title">See the reasoning.<br />Keep your judgment.</h2><p className="intro">An error line is a starting point. KANYI helps structure the investigation without treating every warning as an outage.</p><a className="text-link" href="#demo">Inspect the example evidence <span aria-hidden="true">↗</span></a></div><div className="evidence-list">{[
      ['Evidence you can inspect', 'Review source excerpts alongside the assessment. Matching evidence to a log does not establish that the diagnosis is correct.'],
      ['Uncertainty made explicit', 'Potential causes remain hypotheses. Confidence is qualitative, and missing context can change the conclusion.'],
      ['Checks for a human to verify', 'Review troubleshooting recommendations against your environment. KANYI does not execute fixes or monitor current system health.'],
    ].map(([title, body], index) => <article key={title}><span aria-hidden="true">0{index + 1}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></section>
    {marketingOnly ? <section id="data" className="data-section" aria-labelledby="data-title"><div><p className="eyebrow">Transparent demo experience</p><h2 id="data-title">Synthetic examples.<br />Local exploration.</h2><p>This synthetic demo does not accept or process your logs.</p></div><div className="data-grid">
      <article><h3>Prepared examples</h3><p>Every scenario uses synthetic logs and a prepared assessment. The demo does not perform live AI analysis.</p></article>
      <article><h3>Runs in your browser</h3><p>Scenario selection and evidence inspection run locally. No backend connection or analytics requests are needed.</p></article>
      <article><h3>Free to explore</h3><p>No login, credit card, or personal information is required. Choose a scenario and start exploring.</p></article>
    </div></section> :
    <section id="data" className="data-section" aria-labelledby="data-title"><div><p className="eyebrow">Transparent data handling</p><h2 id="data-title">Know where your logs go.</h2><p>Review your organization’s data requirements before submitting an excerpt.</p></div><div className="data-grid">
      <article><h3>Before submission</h3><p>Remove credentials and personal data yourself. KANYI attempts to redact common secrets, but redaction is incomplete.</p></article>
      <article><h3>Processing and storage</h3><p>Redacted logs and context are sent to Google Gemini. Inputs and results are stored in KANYI’s database until you delete the analysis.</p></article>
      <article><h3>Deletion boundaries</h3><p>Analysis deletion removes the live database record. Provider and backup retention follow the operator’s policies and configuration.</p></article>
    </div></section>}
    {!marketingOnly && (earlyAccessEnabled ? <section id="early-access" className="access-section" aria-labelledby="access-title"><div><p className="eyebrow">Request early access</p><h2 id="access-title">Bring your investigation<br />into focus.</h2><p className="intro">Tell us how you investigate incidents. We’ll review your request and contact you about early-access availability.</p><ul className="access-benefits"><li>Evaluate the individual-account workflow</li><li>Share the use cases that matter to your team</li><li>No production logs or password needed to request access</li></ul><p className="section-note">An access request does not guarantee an invitation.</p></div><EarlyAccessForm /></section> : <section id="early-access" className="access-section" aria-labelledby="access-title">
      <div><p className="eyebrow">Early access</p><h2 id="access-title">Bring your investigation<br />into focus.</h2><p className="intro">Explore the synthetic demo to see KANYI’s approach to incident triage.</p></div>
      <div className="access-confirmation"><h3>Early access opening soon</h3><p>We’re not accepting access requests yet. There is no signup form or waiting list on this site.</p><a className="button primary" href="#demo">Explore the Demo<span aria-hidden="true"> ↑</span></a></div>
    </section>)}
    <section className="faq-section" aria-labelledby="faq-title"><div><p className="eyebrow">A few things to know</p><h2 id="faq-title">Before you get started.</h2></div><div className="faq">{visibleQuestions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
    <footer><div className="footer-top"><a className="brand" href="#top"><span className="brand-mark" aria-hidden="true">K</span>KANYI</a><p>A clearer next step for your incident investigation.</p><a className="text-link" href={accessTarget} onClick={() => trackEvent('access_cta_clicked')}>{accessLabel} <span aria-hidden="true">↗</span></a></div><ProductFooter marketingOnly={marketingOnly} /></footer>
  </main>;
}
