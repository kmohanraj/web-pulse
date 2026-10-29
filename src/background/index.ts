import { installPagePanelAction } from './pagePanel';
import { startNetworkMonitor } from './networkMonitor';

startNetworkMonitor();
installPagePanelAction();

// Clear the per-tab badge when a page starts loading so stale counts are not shown.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    void chrome.action.setBadgeText({ tabId, text: '' });
  }
});
