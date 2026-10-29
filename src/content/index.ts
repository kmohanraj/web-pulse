import type { CollectAccessibilityRequest, CollectAccessibilityResponse } from '@/modules/accessibility/types';
import type { CollectImagesRequest, CollectImagesResponse } from '@/modules/images/types';
import type { CollectLinksRequest, CollectLinksResponse } from '@/modules/links/types';
import type { CollectSeoRequest, CollectSeoResponse } from '@/modules/seo/types';
import type { CollectSecurityRequest, CollectSecurityResponse } from '@/modules/security/types';
import type { ScanReport, ScanRequest, ScanResponse } from '@/shared/types';
import { collectAccessibilitySnapshot } from './collectAccessibility';
import { collectApiCalls } from './apiMonitor';
import { collectSecuritySnapshot } from './collectSecurity';
import { collectSeoSnapshot } from './collectSeo';
import { collectPageImages } from './collectImages';
import { collectPageLinks } from './collectLinks';
import { validateLinks } from './linkValidator';
import { collectPageAudit } from './pageAudit';

// Injected on demand via chrome.scripting; the flag prevents duplicate listeners.
const LOADED_FLAG = '__webpulseQaContentLoaded';

function isScanRequest(message: unknown): message is ScanRequest {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as ScanRequest).type === 'WEBPULSE_RUN_SCAN'
  );
}

function isCollectImagesRequest(message: unknown): message is CollectImagesRequest {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as CollectImagesRequest).type === 'WEBPULSE_COLLECT_IMAGES'
  );
}

function isCollectLinksRequest(message: unknown): message is CollectLinksRequest {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as CollectLinksRequest).type === 'WEBPULSE_COLLECT_LINKS'
  );
}

function isCollectSeoRequest(message: unknown): message is CollectSeoRequest {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as CollectSeoRequest).type === 'WEBPULSE_COLLECT_SEO'
  );
}

function isCollectAccessibilityRequest(message: unknown): message is CollectAccessibilityRequest {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as CollectAccessibilityRequest).type === 'WEBPULSE_COLLECT_ACCESSIBILITY'
  );
}

function isCollectSecurityRequest(message: unknown): message is CollectSecurityRequest {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as CollectSecurityRequest).type === 'WEBPULSE_COLLECT_SECURITY'
  );
}

function buildReport(includeApiMonitor: boolean): ScanReport {
  return {
    url: location.href,
    title: document.title,
    scannedAt: new Date().toISOString(),
    links: validateLinks(document),
    api: includeApiMonitor ? collectApiCalls() : null,
    audit: collectPageAudit(document),
  };
}

const globalScope = globalThis as unknown as Record<string, unknown>;

if (!globalScope[LOADED_FLAG]) {
  globalScope[LOADED_FLAG] = true;

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (isCollectImagesRequest(message)) {
      void collectPageImages(document)
        .then((images) => {
          const response: CollectImagesResponse = { ok: true, pageUrl: location.href, images };
          sendResponse(response);
        })
        .catch((error: unknown) => {
          const response: CollectImagesResponse = {
            ok: false,
            error: error instanceof Error ? error.message : 'Could not collect images.',
          };
          sendResponse(response);
        });
      return true;
    }

    if (isCollectLinksRequest(message)) {
      const response: CollectLinksResponse = (() => {
        try {
          return { ok: true, pageUrl: location.href, links: collectPageLinks(document) };
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : 'Could not collect links.' };
        }
      })();
      sendResponse(response);
      return false;
    }

    if (isCollectSeoRequest(message)) {
      const response: CollectSeoResponse = (() => {
        try {
          return { ok: true, snapshot: collectSeoSnapshot(document) };
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : 'Could not collect SEO metadata.' };
        }
      })();
      sendResponse(response);
      return false;
    }

    if (isCollectAccessibilityRequest(message)) {
      const response: CollectAccessibilityResponse = (() => {
        try {
          return { ok: true, snapshot: collectAccessibilitySnapshot(document) };
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : 'Could not collect accessibility data.' };
        }
      })();
      sendResponse(response);
      return false;
    }

    if (isCollectSecurityRequest(message)) {
      const response: CollectSecurityResponse = (() => {
        try {
          return { ok: true, snapshot: collectSecuritySnapshot(document) };
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : 'Could not collect security data.' };
        }
      })();
      sendResponse(response);
      return false;
    }

    if (!isScanRequest(message)) {
      return false;
    }

    const response: ScanResponse = (() => {
      try {
        return { ok: true, report: buildReport(message.includeApiMonitor) };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Scan failed.' };
      }
    })();

    sendResponse(response);
    return false;
  });
}
