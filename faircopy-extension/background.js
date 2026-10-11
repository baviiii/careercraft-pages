/* Faircopy: Save job — the toolbar button.

   On click: read the job ad in the current tab (extract.js), then open
   Faircopy's /save-job page with what was found. The job travels in the URL
   fragment (#job=…), which the browser never sends to a server, so it goes
   from this tab to the user's own Faircopy tab and nowhere else.

   The extension holds no login. Faircopy saves the job with its own session.
   Permissions are activeTab + scripting: it can only read a page when the
   user clicks the button on it. */

const DEFAULT_BASE = "https://www.faircopy.au";

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !/^https?:/.test(tab.url || "")) {
    flash(tab.id, "!", "#C2412D");
    return;
  }

  // If the page can't be read (some sites block scripts), still hand over the
  // address and title — the user pastes the ad on Faircopy's side.
  let job = { url: tab.url, title: tab.title || "", source: hostLabel(tab.url) };
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["extract.js"],
    });
    if (res && res.result) job = res.result;
  } catch (error) {
    console.warn("[faircopy] Couldn't read this page:", error);
  }

  const { baseUrl } = await chrome.storage.sync.get({ baseUrl: DEFAULT_BASE });
  const base = String(baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
  await chrome.tabs.create({
    url: `${base}/save-job#job=${encode(job)}`,
    index: tab.index + 1,
  });
  flash(tab.id, "✓", "#3F7A5C");
});

/** base64url of the UTF-8 JSON, so accents and en dashes survive. */
function encode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function hostLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function flash(tabId, text, color) {
  if (!tabId) return;
  chrome.action.setBadgeBackgroundColor({ tabId, color });
  chrome.action.setBadgeText({ tabId, text });
  setTimeout(() => chrome.action.setBadgeText({ tabId, text: "" }), 2500);
}
