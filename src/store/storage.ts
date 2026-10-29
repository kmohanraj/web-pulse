/**
 * redux-persist storage adapter backed by chrome.storage.local.
 * Works in extension pages; chrome.storage is available without a localStorage shim.
 */
export const chromeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(key);
    const value: unknown = result[key];
    return typeof value === 'string' ? value : null;
  },
  setItem: (key: string, value: string): Promise<void> => chrome.storage.local.set({ [key]: value }),
  removeItem: (key: string): Promise<void> => chrome.storage.local.remove(key),
};
