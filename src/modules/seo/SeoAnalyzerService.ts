import type { SeoCheck, SeoCheckId, SeoReport, SeoSeverity, SeoSnapshot } from './types';

const TITLE_MAX = 20;
const DESCRIPTION_MAX = 15;
const CANONICAL_MAX = 15;
const H1_MAX = 15;
const OPEN_GRAPH_MAX = 15;
const TWITTER_MAX = 10;
const ROBOTS_MAX = 10;

const TWITTER_CARDS = new Set(['summary', 'summary_large_image', 'app', 'player']);

export class SeoAnalyzerService {
  analyze(snapshot: SeoSnapshot): SeoReport {
    const checks = [
      checkTitle(snapshot),
      checkDescription(snapshot),
      checkCanonical(snapshot),
      checkH1(snapshot),
      checkOpenGraph(snapshot),
      checkTwitter(snapshot),
      checkRobots(snapshot),
    ];

    return {
      pageUrl: snapshot.pageUrl,
      score: checks.reduce((total, check) => total + check.score, 0),
      checks,
      analyzedAt: new Date().toISOString(),
    };
  }
}

function checkTitle(snapshot: SeoSnapshot): SeoCheck {
  const title = snapshot.title.trim();
  const length = title.length;
  if (length === 0) {
    return result('title', 'Page title', 'fail', 0, TITLE_MAX, 'Missing', 'Add a unique title between 30 and 60 characters.');
  }
  if (length < 15) {
    return result('title', 'Page title', 'fail', 6, TITLE_MAX, title, `Title is ${length} characters. Expand it to 30–60 characters.`);
  }
  if (length < 30) {
    return result('title', 'Page title', 'warning', 12, TITLE_MAX, title, `Title is ${length} characters. Aim for 30–60 characters.`);
  }
  if (length > 70) {
    return result('title', 'Page title', 'warning', 8, TITLE_MAX, title, `Title is ${length} characters and may be truncated. Shorten it to 60 or fewer.`);
  }
  if (length > 60) {
    return result('title', 'Page title', 'warning', 14, TITLE_MAX, title, `Title is ${length} characters. Shorten it to 60 or fewer.`);
  }
  return result('title', 'Page title', 'pass', TITLE_MAX, TITLE_MAX, title, 'Title length is in the recommended range.');
}

function checkDescription(snapshot: SeoSnapshot): SeoCheck {
  const description = snapshot.description?.trim() ?? '';
  const length = description.length;
  if (length === 0) {
    return result('description', 'Meta description', 'fail', 0, DESCRIPTION_MAX, 'Missing', 'Add a meta description between 70 and 160 characters.');
  }
  if (length < 50) {
    return result('description', 'Meta description', 'warning', 6, DESCRIPTION_MAX, description, `Description is ${length} characters. Expand it to 70–160 characters.`);
  }
  if (length < 70) {
    return result('description', 'Meta description', 'warning', 10, DESCRIPTION_MAX, description, `Description is ${length} characters. Aim for 70–160 characters.`);
  }
  if (length > 200) {
    return result('description', 'Meta description', 'warning', 6, DESCRIPTION_MAX, description, `Description is ${length} characters and will be truncated. Shorten it to 160 or fewer.`);
  }
  if (length > 160) {
    return result('description', 'Meta description', 'warning', 10, DESCRIPTION_MAX, description, `Description is ${length} characters. Shorten it to 160 or fewer.`);
  }
  return result('description', 'Meta description', 'pass', DESCRIPTION_MAX, DESCRIPTION_MAX, description, 'Description length is in the recommended range.');
}

function checkCanonical(snapshot: SeoSnapshot): SeoCheck {
  if (snapshot.canonicals.length === 0) {
    return result('canonical', 'Canonical URL', 'warning', 4, CANONICAL_MAX, 'Missing', 'Add one absolute canonical URL that matches this page.');
  }
  if (snapshot.canonicals.length > 1) {
    return result('canonical', 'Canonical URL', 'fail', 0, CANONICAL_MAX, snapshot.canonicals.join(', '), 'Keep a single canonical link.');
  }

  const raw = snapshot.canonicals[0] ?? '';
  const canonical = parseUrl(raw, snapshot.pageUrl);
  if (!canonical || (canonical.protocol !== 'http:' && canonical.protocol !== 'https:')) {
    return result('canonical', 'Canonical URL', 'fail', 0, CANONICAL_MAX, raw, 'Replace the canonical href with an absolute http or https URL.');
  }
  if (!isAbsoluteHttp(raw)) {
    return result('canonical', 'Canonical URL', 'warning', 8, CANONICAL_MAX, canonical.href, 'Use an absolute canonical URL instead of a relative one.');
  }

  const page = parseUrl(snapshot.pageUrl, snapshot.pageUrl);
  if (page && normalizeUrl(canonical) === normalizeUrl(page)) {
    return result('canonical', 'Canonical URL', 'pass', CANONICAL_MAX, CANONICAL_MAX, canonical.href, 'Canonical URL matches this page.');
  }
  return result('canonical', 'Canonical URL', 'warning', 10, CANONICAL_MAX, canonical.href, 'Canonical points to a different URL. Confirm this page should be indexed there.');
}

function checkH1(snapshot: SeoSnapshot): SeoCheck {
  if (snapshot.h1s.length === 0) {
    return result('h1', 'H1 tags', 'fail', 0, H1_MAX, 'Missing', 'Add one H1 that describes the page.');
  }
  if (snapshot.h1s.length > 1) {
    return result('h1', 'H1 tags', 'warning', 8, H1_MAX, snapshot.h1s.join(' | '), `Page has ${snapshot.h1s.length} H1 elements. Keep a single H1.`);
  }

  const heading = snapshot.h1s[0] ?? '';
  if (!sharesKeyword(snapshot.title, heading)) {
    return result('h1', 'H1 tags', 'warning', 12, H1_MAX, heading, 'H1 does not share a meaningful word with the title. Align them around the same topic.');
  }
  return result('h1', 'H1 tags', 'pass', H1_MAX, H1_MAX, heading, 'Page has one H1 aligned with the title.');
}

function checkOpenGraph(snapshot: SeoSnapshot): SeoCheck {
  const required = [
    ['og:title', 4],
    ['og:description', 3],
    ['og:image', 4],
    ['og:url', 2],
    ['og:type', 2],
  ] as const;
  const missing: string[] = [];
  let score = 0;

  for (const [key, points] of required) {
    const value = snapshot.openGraph[key]?.trim() ?? '';
    if (value === '') {
      missing.push(key);
      continue;
    }
    if ((key === 'og:image' || key === 'og:url') && !isAbsoluteHttp(value)) {
      missing.push(`${key} (not absolute)`);
      score += Math.max(0, points - 2);
      continue;
    }
    score += points;
  }

  const value = Object.entries(snapshot.openGraph)
    .map(([key, content]) => `${key}=${content}`)
    .join(' · ');
  if (missing.length === required.length) {
    return result('openGraph', 'Open Graph tags', 'fail', 0, OPEN_GRAPH_MAX, 'Missing', 'Add og:title, og:description, og:image, og:url, and og:type.');
  }
  if (missing.length > 0) {
    return result('openGraph', 'Open Graph tags', 'warning', score, OPEN_GRAPH_MAX, value || 'Partial', `Fix Open Graph fields: ${missing.join(', ')}.`);
  }
  return result('openGraph', 'Open Graph tags', 'pass', OPEN_GRAPH_MAX, OPEN_GRAPH_MAX, value, 'Required Open Graph tags are present.');
}

function checkTwitter(snapshot: SeoSnapshot): SeoCheck {
  const card = snapshot.twitter['twitter:card']?.trim().toLowerCase() ?? '';
  const title = snapshot.twitter['twitter:title']?.trim() ?? snapshot.openGraph['og:title']?.trim() ?? '';
  const description = snapshot.twitter['twitter:description']?.trim() ?? snapshot.openGraph['og:description']?.trim() ?? '';
  const image = snapshot.twitter['twitter:image']?.trim() ?? snapshot.openGraph['og:image']?.trim() ?? '';
  const missing: string[] = [];
  let score = 0;

  if (TWITTER_CARDS.has(card)) {
    score += 4;
  } else {
    missing.push(card === '' ? 'twitter:card' : 'twitter:card (unsupported)');
  }
  if (snapshot.twitter['twitter:title']) {
    score += 2;
  } else if (title !== '') {
    score += 1;
    missing.push('twitter:title');
  } else {
    missing.push('twitter:title');
  }
  if (snapshot.twitter['twitter:description']) {
    score += 2;
  } else if (description !== '') {
    score += 1;
    missing.push('twitter:description');
  } else {
    missing.push('twitter:description');
  }

  const imageRequired = card === 'summary_large_image' || card === '';
  if (image !== '' && isAbsoluteHttp(image)) {
    score += 2;
  } else if (!imageRequired && image === '') {
    score += 2;
  } else {
    missing.push('twitter:image');
  }

  const value = Object.entries(snapshot.twitter)
    .map(([key, content]) => `${key}=${content}`)
    .join(' · ');
  if (score === 0) {
    return result('twitter', 'Twitter tags', 'fail', 0, TWITTER_MAX, 'Missing', 'Add twitter:card, twitter:title, twitter:description, and twitter:image.');
  }
  if (missing.length > 0) {
    return result('twitter', 'Twitter tags', 'warning', score, TWITTER_MAX, value || 'Partial', `Add or fix ${missing.join(', ')}.`);
  }
  return result('twitter', 'Twitter tags', 'pass', TWITTER_MAX, TWITTER_MAX, value, 'Twitter card tags are present.');
}

function checkRobots(snapshot: SeoSnapshot): SeoCheck {
  const raw = snapshot.robots?.trim() ?? '';
  if (raw === '') {
    return result('robots', 'Robots meta', 'warning', 6, ROBOTS_MAX, 'Missing', 'Add a robots meta tag. Use index,follow unless this page should be excluded.');
  }

  const tokens = raw
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token !== '');
  const hasNoindex = tokens.includes('noindex') || tokens.includes('none');
  const hasNofollow = tokens.includes('nofollow') || tokens.includes('none');
  const hasIndex = tokens.includes('index') || tokens.includes('all');
  const hasFollow = tokens.includes('follow') || tokens.includes('all');
  const known = new Set(['index', 'noindex', 'follow', 'nofollow', 'none', 'all', 'noarchive', 'nosnippet', 'noimageindex', 'max-snippet', 'max-image-preview', 'max-video-preview']);
  const unknown = tokens.filter((token) => !known.has(token) && !token.includes(':'));

  if (hasIndex && hasNoindex) {
    return result('robots', 'Robots meta', 'fail', 0, ROBOTS_MAX, raw, 'Remove the conflicting index and noindex directives.');
  }
  if (hasNoindex) {
    return result('robots', 'Robots meta', 'fail', 0, ROBOTS_MAX, raw, 'This page is marked noindex, so it will not appear in search results.');
  }
  if (unknown.length > 0) {
    return result('robots', 'Robots meta', 'warning', 6, ROBOTS_MAX, raw, `Remove unrecognized robots directives: ${unknown.join(', ')}.`);
  }
  if (hasNofollow && !hasFollow) {
    return result('robots', 'Robots meta', 'warning', 6, ROBOTS_MAX, raw, 'nofollow blocks link equity. Use index,follow when links should be followed.');
  }
  return result('robots', 'Robots meta', 'pass', ROBOTS_MAX, ROBOTS_MAX, raw, 'Robots meta allows indexing.');
}

function result(
  id: SeoCheckId,
  label: string,
  severity: SeoSeverity,
  score: number,
  maxScore: number,
  value: string,
  recommendation: string,
): SeoCheck {
  return { id, label, severity, score, maxScore, value, recommendation };
}

function parseUrl(value: string, base: string): URL | null {
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}

function isAbsoluteHttp(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function normalizeUrl(url: URL): string {
  const copy = new URL(url.href);
  copy.hash = '';
  if (copy.pathname.length > 1 && copy.pathname.endsWith('/')) {
    copy.pathname = copy.pathname.slice(0, -1);
  }
  return copy.href;
}

function sharesKeyword(title: string, heading: string): boolean {
  const headingWords = keywords(heading);
  if (headingWords.size === 0) {
    return false;
  }
  for (const word of keywords(title)) {
    if (headingWords.has(word)) {
      return true;
    }
  }
  return false;
}

function keywords(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3),
  );
}
