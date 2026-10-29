import type {
  SecurityCheck,
  SecurityCheckId,
  SecurityCookieFact,
  SecurityDomSnapshot,
  SecurityHeaderSnapshot,
  SecurityIssue,
  SecurityReport,
  SecuritySeverity,
} from './types';

const HTTPS_MAX = 15;
const MIXED_MAX = 15;
const CSP_MAX = 20;
const HSTS_MAX = 15;
const COOKIES_MAX = 10;
const XSS_MAX = 15;
const IFRAME_MAX = 10;
const HSTS_MIN_AGE = 15_552_000;

export class SecurityAnalyzerService {
  analyze(dom: SecurityDomSnapshot, headers: SecurityHeaderSnapshot, cookies: SecurityCookieFact[]): SecurityReport {
    const checks = [
      checkHttps(dom),
      checkMixedContent(dom),
      checkCsp(dom, headers),
      checkHsts(dom, headers),
      checkCookies(cookies, headers),
      checkXss(dom, headers),
      checkIframes(dom, headers),
    ];

    return {
      pageUrl: dom.pageUrl,
      score: checks.reduce((total, check) => total + check.score, 0),
      checks,
      analyzedAt: new Date().toISOString(),
    };
  }
}

function checkHttps(dom: SecurityDomSnapshot): SecurityCheck {
  if (dom.protocol === 'https:') {
    return scored('https', 'HTTPS', HTTPS_MAX, [], dom.pageUrl, 'Page is served over HTTPS.');
  }
  return scored(
    'https',
    'HTTPS',
    HTTPS_MAX,
    [issue('fail', dom.pageUrl, 'Page is not served over HTTPS.')],
    dom.protocol,
    'Redirect HTTP traffic to HTTPS before relying on the other header checks.',
  );
}

function checkMixedContent(dom: SecurityDomSnapshot): SecurityCheck {
  if (dom.protocol !== 'https:') {
    return scored('mixedContent', 'Mixed content', MIXED_MAX, [], 'Skipped until HTTPS', 'Enable HTTPS, then recheck mixed content.');
  }

  const issues = dom.mixedContent.map((item) =>
    issue(
      item.active ? 'fail' : 'warning',
      item.url,
      item.active ? `Active mixed content in <${item.tag}>.` : `Passive mixed content in <${item.tag}>.`,
    ),
  );
  if (dom.mixedContentTotal > dom.mixedContent.length) {
    issues.push(issue('warning', 'document', `${dom.mixedContentTotal - dom.mixedContent.length} more mixed-content URLs were not listed.`));
  }

  return scored(
    'mixedContent',
    'Mixed content',
    MIXED_MAX,
    issues,
    issues.length === 0 ? 'No HTTP resources' : `${dom.mixedContentTotal} HTTP resources`,
    issues.length === 0 ? 'HTTPS page does not reference HTTP resources.' : 'Load scripts, frames, images, and form actions over HTTPS.',
  );
}

function checkCsp(dom: SecurityDomSnapshot, headers: SecurityHeaderSnapshot): SecurityCheck {
  const policy = headers.csp ?? dom.metaCsp;
  const reportOnly = headers.cspReportOnly ?? dom.metaCspReportOnly;
  if (!policy && reportOnly) {
    return scored(
      'csp',
      'CSP',
      CSP_MAX,
      [issue('warning', 'document', 'Only a report-only Content-Security-Policy is present.')],
      reportOnly,
      'Enforce a Content-Security-Policy header. Report-only mode does not block attacks.',
    );
  }
  if (!policy) {
    return scored(
      'csp',
      'CSP',
      CSP_MAX,
      [issue('fail', 'document', 'Content-Security-Policy is missing.')],
      'Missing',
      'Send a Content-Security-Policy header with default-src or script-src.',
    );
  }

  const directives = parseDirectives(policy);
  const issues: SecurityIssue[] = [];
  const scriptSrc = directives.get('script-src') ?? directives.get('default-src');
  if (!scriptSrc) {
    issues.push(issue('fail', 'content-security-policy', 'CSP has neither script-src nor default-src.'));
  }
  if (scriptSrc?.includes("'unsafe-inline'")) {
    issues.push(issue('warning', 'script-src', "script-src allows 'unsafe-inline'."));
  }
  if (scriptSrc?.includes("'unsafe-eval'")) {
    issues.push(issue('warning', 'script-src', "script-src allows 'unsafe-eval'."));
  }
  if (headers.csp === null && dom.metaCsp) {
    issues.push(issue('warning', 'meta', 'CSP is set in a meta tag. Prefer the HTTP header so it applies to the whole response.'));
  }

  return scored(
    'csp',
    'CSP',
    CSP_MAX,
    issues,
    policy,
    issues.length === 0 ? 'CSP restricts scripts.' : 'Tighten script-src and deliver CSP as a response header.',
  );
}

function checkHsts(dom: SecurityDomSnapshot, headers: SecurityHeaderSnapshot): SecurityCheck {
  if (dom.protocol !== 'https:') {
    return scored(
      'hsts',
      'HSTS',
      HSTS_MAX,
      [issue('warning', dom.pageUrl, 'HSTS is ignored on HTTP responses.')],
      'Not applicable',
      'Serve HTTPS before sending Strict-Transport-Security.',
    );
  }
  if (!headers.hsts) {
    return scored(
      'hsts',
      'HSTS',
      HSTS_MAX,
      [issue('fail', 'strict-transport-security', 'Strict-Transport-Security is missing.')],
      'Missing',
      'Send Strict-Transport-Security with max-age of at least 15552000 and includeSubDomains.',
    );
  }

  const maxAge = Number(/max-age=(\d+)/i.exec(headers.hsts)?.[1] ?? '0');
  const issues: SecurityIssue[] = [];
  if (!Number.isFinite(maxAge) || maxAge <= 0) {
    issues.push(issue('fail', headers.hsts, 'HSTS max-age is missing or zero.'));
  } else if (maxAge < HSTS_MIN_AGE) {
    issues.push(issue('warning', headers.hsts, `HSTS max-age is ${maxAge}. Use at least ${HSTS_MIN_AGE}.`));
  }
  if (!/includesubdomains/i.test(headers.hsts)) {
    issues.push(issue('warning', headers.hsts, 'HSTS does not include subdomains.'));
  }

  return scored('hsts', 'HSTS', HSTS_MAX, issues, headers.hsts, issues.length === 0 ? 'HSTS max-age covers subdomains.' : 'Raise max-age and add includeSubDomains.');
}

function checkCookies(cookies: SecurityCookieFact[], headers: SecurityHeaderSnapshot): SecurityCheck {
  if (headers.error && cookies.length === 0) {
    return scored(
      'cookies',
      'Secure cookies',
      COOKIES_MAX,
      [issue('warning', 'set-cookie', headers.error)],
      'Unavailable',
      'Run the scan again so cookie flags can be read. A reload is not required.',
    );
  }
  if (cookies.length === 0) {
    return scored(
      'cookies',
      'Secure cookies',
      COOKIES_MAX,
      [],
      'No cookies for this URL',
      'When cookies are set, mark them Secure, HttpOnly, and SameSite=Lax or Strict.',
    );
  }

  const issues: SecurityIssue[] = [];
  for (const cookie of cookies) {
    const label = cookie.name || 'cookie';
    if (!cookie.secure) {
      issues.push(issue('fail', label, 'Cookie is missing Secure.'));
    }
    if (!cookie.httpOnly) {
      issues.push(issue('warning', label, 'Cookie is readable by script. Use HttpOnly unless JavaScript must read it.'));
    }
    if (cookie.sameSite === 'none' && !cookie.secure) {
      issues.push(issue('fail', label, 'SameSite=None requires Secure.'));
    } else if (cookie.sameSite === 'unspecified') {
      issues.push(issue('warning', label, 'Cookie has no explicit SameSite attribute.'));
    }
  }

  return scored(
    'cookies',
    'Secure cookies',
    COOKIES_MAX,
    issues,
    `${cookies.length} cookies`,
    issues.length === 0 ? 'Cookie flags include Secure and an explicit SameSite.' : 'Set Secure, HttpOnly, and SameSite=Lax or Strict on session cookies.',
  );
}

function checkXss(dom: SecurityDomSnapshot, headers: SecurityHeaderSnapshot): SecurityCheck {
  const issues: SecurityIssue[] = [];
  const nosniff = headers.xContentTypeOptions?.trim().toLowerCase() ?? '';
  if (nosniff !== 'nosniff') {
    issues.push(issue('warning', 'x-content-type-options', 'X-Content-Type-Options: nosniff is missing.'));
  }
  const xssHeader = headers.xXssProtection?.trim().toLowerCase() ?? '';
  if (xssHeader.startsWith('0')) {
    issues.push(issue('warning', 'x-xss-protection', 'X-XSS-Protection is disabled. Rely on CSP, but do not force the filter off without one.'));
  } else if (xssHeader === '') {
    issues.push(issue('warning', 'x-xss-protection', 'X-XSS-Protection is absent. Modern browsers ignore it; CSP is the control that matters.'));
  }
  if (dom.javascriptUrlCount > 0) {
    issues.push(issue('fail', 'document', `${dom.javascriptUrlCount} javascript: URL(s) can execute script.`));
  }
  if (dom.inlineHandlerCount > 0) {
    issues.push(issue('warning', 'document', `${dom.inlineHandlerCount} inline event handler(s) increase XSS impact.`));
  }

  return scored(
    'xss',
    'XSS protections',
    XSS_MAX,
    issues,
    nosniff === 'nosniff' ? 'nosniff' : 'Missing nosniff',
    issues.length === 0 ? 'Response asks browsers not to sniff content types.' : 'Send nosniff and remove javascript: URLs and inline handlers.',
  );
}

function checkIframes(dom: SecurityDomSnapshot, headers: SecurityHeaderSnapshot): SecurityCheck {
  const directives = parseDirectives(headers.csp ?? dom.metaCsp ?? '');
  const ancestors = directives.get('frame-ancestors') ?? [];
  const framing = headers.xFrameOptions?.trim() || (ancestors.length > 0 ? `frame-ancestors ${ancestors.join(' ')}` : '');
  const issues: SecurityIssue[] = [];

  if (!headers.xFrameOptions && ancestors.length === 0) {
    issues.push(issue('warning', 'document', 'No X-Frame-Options or CSP frame-ancestors policy.'));
  } else if (ancestors.includes('*')) {
    issues.push(issue('fail', 'frame-ancestors', 'frame-ancestors allows any site to embed this page.'));
  } else if (headers.xFrameOptions && !/^(deny|sameorigin)$/i.test(headers.xFrameOptions.trim())) {
    issues.push(issue('warning', headers.xFrameOptions, 'X-Frame-Options should be DENY or SAMEORIGIN.'));
  }

  for (const frame of dom.iframes) {
    if (frame.sandbox === null) {
      issues.push(issue('warning', frame.target, 'Iframe has no sandbox attribute.'));
      continue;
    }
    const tokens = new Set(frame.sandbox.toLowerCase().split(/\s+/).filter(Boolean));
    if (tokens.has('allow-scripts') && tokens.has('allow-same-origin')) {
      issues.push(issue('fail', frame.target, 'sandbox allows scripts and same-origin, which weakens the sandbox.'));
    }
  }
  if (dom.iframeTotal > dom.iframes.length) {
    issues.push(issue('warning', 'document', `${dom.iframeTotal - dom.iframes.length} more iframes were not listed.`));
  }

  return scored(
    'iframes',
    'Iframe restrictions',
    IFRAME_MAX,
    issues,
    dom.iframeTotal === 0 ? framing || 'No iframes' : `${dom.iframeTotal} iframes`,
    issues.length === 0 ? 'Framing policy and iframe sandboxes are in place.' : 'Set frame-ancestors and sandbox third-party iframes.',
  );
}

function parseDirectives(policy: string): Map<string, string[]> {
  const directives = new Map<string, string[]>();
  for (const part of policy.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    const name = tokens[0]?.toLowerCase();
    if (!name) {
      continue;
    }
    directives.set(name, tokens.slice(1).map((token) => token.toLowerCase()));
  }
  return directives;
}

function scored(
  id: SecurityCheckId,
  label: string,
  maxScore: number,
  issues: SecurityIssue[],
  value: string,
  recommendation: string,
): SecurityCheck {
  const fails = issues.filter((item) => item.severity === 'fail').length;
  const warnings = issues.length - fails;
  const penalty = Math.min(maxScore, fails * 5 + warnings * 2);
  const severity: SecuritySeverity = fails > 0 ? 'fail' : warnings > 0 ? 'warning' : 'pass';
  return {
    id,
    label,
    severity,
    score: maxScore - penalty,
    maxScore,
    value,
    recommendation,
    issues: issues.slice(0, 8),
  };
}

function issue(severity: Exclude<SecuritySeverity, 'pass'>, target: string, message: string): SecurityIssue {
  return { severity, target, message };
}
