# Faircopy: Save job (Chrome extension)

One click on a job ad saves it to your Faircopy tracker with the **full** description. Job boards
only give Faircopy a ~200-character extract, which isn't enough for the ATS check or a cover
letter.

## Install (unpacked, for now)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this `faircopy-extension` folder.
4. Pin it: click the puzzle-piece icon, then the pin next to "Faircopy: Save job".

After editing any file here, press the reload arrow on the extension's card in `chrome://extensions`.

## Use

1. Open a job ad: SEEK, LinkedIn, Indeed, or a company's own careers page.
2. Click the Faircopy button. A Faircopy tab opens with **Add job** filled in and the status set
   to **Saved**.
3. Check the details, pick the résumé you'll use, and save.

If a page isn't read properly, **select the ad text first**, then click. A selection always wins.

## What it reads, and when

- **Only the tab you click it on, only when you click.** It uses `activeTab`, so it has no access
  to any site until you press the button there.
- It reads the ad on the page and opens your Faircopy tab with it. The job travels in the
  address's `#` fragment, which browsers never send to a server. Nothing goes anywhere except
  your own Faircopy tab.
- It holds no login. Faircopy saves the job using your normal sign-in.

## How it finds the ad (`extract.js`)

1. **schema.org `JobPosting` data**, which most company career sites and hiring systems publish
   for Google Jobs (PageUp, Workday, Greenhouse, Lever, JobAdder…).
2. **Per-site readers:**
   - **SEEK:** `data-automation` markers, checked against a live ad on 2026-10-12.
   - **LinkedIn:** the tab title, plus the "About the job" heading.
   - **Indeed:** its `data-testid` markers. These weren't checked live (Indeed showed a bot
     check), so test before relying on it.
3. **Your selection, otherwise the page's main text.**

Sites redesign their pages. When one stops working, the fix is usually one selector in
`extract.js`.

## Testing against a local Faircopy

Right-click the button, choose **Options**, and set the address to `http://localhost:8080` (or
wherever the dev server runs). **Reset** puts it back to `https://www.faircopy.au`.

## Publishing later

Zip the folder's contents (not the folder itself) and upload it to the Chrome Web Store developer
dashboard. There's a one-off US$5 developer fee. You'll need a short privacy statement; "What it
reads, and when" above is most of it.
