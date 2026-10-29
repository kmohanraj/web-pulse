export async function activeWebTab(): Promise<chrome.tabs.Tab | undefined> {
  const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (isWebTab(current)) {
    return current;
  }

  const [focused] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (isWebTab(focused)) {
    return focused;
  }

  const tabs = await chrome.tabs.query({ active: true });
  return tabs
    .filter((tab) => isWebTab(tab))
    .sort((left, right) => (right.lastAccessed ?? 0) - (left.lastAccessed ?? 0))[0];
}

export function isWebTab(tab: chrome.tabs.Tab | undefined): tab is chrome.tabs.Tab {
  return tab?.id !== undefined && (tab.url?.startsWith('http://') === true || tab.url?.startsWith('https://') === true);
}
