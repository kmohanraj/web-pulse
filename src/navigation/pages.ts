import type { ShellPage } from '@/shared/types';

export interface NavItem {
  id: ShellPage;
  label: string;
  description: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Scan the active page' },
  { id: 'network', label: 'Network', description: 'Fetch, XHR, and GraphQL' },
  { id: 'images', label: 'Images', description: 'Broken images and alt text' },
  { id: 'seo', label: 'SEO', description: 'On-page metadata score' },
  { id: 'accessibility', label: 'Accessibility', description: 'Labels, headings, and ARIA' },
  { id: 'security', label: 'Security', description: 'HTTPS, headers, and cookies' },
  { id: 'performance', label: 'Performance', description: 'TTFB, FCP, LCP, CLS, and INP' },
  { id: 'reports', label: 'Reports', description: 'Saved scan history' },
  { id: 'settings', label: 'Settings', description: 'Theme, export, and scan limits' },
];

export function isShellPage(value: string): value is ShellPage {
  return (
    value === 'dashboard' ||
    value === 'network' ||
    value === 'images' ||
    value === 'seo' ||
    value === 'accessibility' ||
    value === 'security' ||
    value === 'performance' ||
    value === 'settings' ||
    value === 'reports'
  );
}

export function pageFromHash(hash: string): ShellPage {
  const id = hash.replace(/^#\/?/, '').split(/[?#]/)[0] ?? '';
  return isShellPage(id) ? id : 'dashboard';
}

export function hashForPage(page: ShellPage): string {
  return `#/${page}`;
}

export function extensionPageUrl(page: ShellPage): string {
  return chrome.runtime.getURL(`dashboard.html${hashForPage(page)}`);
}
