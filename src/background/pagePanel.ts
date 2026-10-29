interface PanelHost extends Window {
  __webpulseClosePanel?: () => void;
}

export function installPagePanelAction(): void {
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id === undefined || !canMountPanel(tab.url)) {
      return;
    }
    void chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        func: togglePagePanel,
        args: [chrome.runtime.getURL('popup.html')],
      })
      .catch(() => undefined);
  });
}

function canMountPanel(url: string | undefined): boolean {
  if (!url) {
    return true;
  }
  return url.startsWith('http://') || url.startsWith('https://');
}

// Injected into the page. Must not reference module bindings.
function togglePagePanel(popupUrl: string): void {
  const panelId = 'webpulse-qa-panel';
  const hostWindow = window as PanelHost;
  const existing = document.getElementById(panelId);
  if (existing) {
    hostWindow.__webpulseClosePanel?.();
    existing.remove();
    return;
  }

  const host = document.createElement('webpulse-qa-panel');
  host.id = panelId;
  host.style.setProperty('all', 'initial', 'important');
  host.style.setProperty('position', 'fixed', 'important');
  host.style.setProperty('top', '16px', 'important');
  host.style.setProperty('right', '16px', 'important');
  host.style.setProperty('z-index', '2147483647', 'important');
  host.style.setProperty('width', 'min(440px, calc(100vw - 32px))', 'important');
  host.style.setProperty('height', 'min(720px, calc(100vh - 32px))', 'important');
  host.style.setProperty('display', 'block', 'important');
  host.style.setProperty('border-radius', '16px', 'important');
  host.style.setProperty('overflow', 'hidden', 'important');
  host.style.setProperty('box-shadow', '0 18px 50px rgba(15, 23, 42, 0.28)', 'important');

  const frame = document.createElement('iframe');
  frame.title = 'WebPulse QA';
  frame.src = popupUrl;
  frame.style.setProperty('width', '100%', 'important');
  frame.style.setProperty('height', '100%', 'important');
  frame.style.setProperty('border', '0', 'important');
  frame.style.setProperty('background', 'transparent', 'important');

  const shadow = host.attachShadow({ mode: 'open' });
  shadow.append(frame);
  document.documentElement.append(host);

  const extensionOrigin = new URL(popupUrl).origin;
  const onMessage = (event: MessageEvent): void => {
    if (event.origin !== extensionOrigin) {
      return;
    }
    const data = event.data as { source?: string; type?: string } | null;
    if (data?.source === 'webpulse-qa' && data.type === 'close-panel') {
      close();
    }
  };
  const close = (): void => {
    window.removeEventListener('message', onMessage);
    delete hostWindow.__webpulseClosePanel;
    host.remove();
  };
  hostWindow.__webpulseClosePanel = close;
  window.addEventListener('message', onMessage);
}
