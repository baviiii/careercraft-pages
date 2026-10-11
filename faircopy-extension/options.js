const DEFAULT_BASE = "https://www.faircopy.au";
const input = document.getElementById("base");
const status = document.getElementById("status");

const show = (message, ok = true) => {
  status.textContent = message;
  status.style.color = ok ? "#3F7A5C" : "#C2412D";
  setTimeout(() => (status.textContent = ""), 2500);
};

chrome.storage.sync.get({ baseUrl: DEFAULT_BASE }).then(({ baseUrl }) => {
  input.value = baseUrl;
});

document.getElementById("save").addEventListener("click", async () => {
  let url;
  try {
    url = new URL(input.value.trim());
  } catch {
    show("That isn't a web address.", false);
    return;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    show("Use an http(s) address.", false);
    return;
  }
  await chrome.storage.sync.set({ baseUrl: url.origin });
  input.value = url.origin;
  show("Saved");
});

document.getElementById("reset").addEventListener("click", async () => {
  await chrome.storage.sync.set({ baseUrl: DEFAULT_BASE });
  input.value = DEFAULT_BASE;
  show("Reset");
});
