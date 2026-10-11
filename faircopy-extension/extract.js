/* Faircopy: Save job — reads the job ad in the current tab.

   Injected only when the user clicks the toolbar button (activeTab). It reads
   the page and returns what it found; it sends nothing anywhere itself.

   Order of trust:
   1. schema.org JobPosting data, which most company career sites and hiring
      systems (PageUp, Workday, Greenhouse, Lever, JobAdder…) publish for
      Google Jobs. Structured, so the most reliable.
   2. A per-site reader for boards that don't publish it: SEEK, LinkedIn,
      Indeed.
   3. Whatever the user has selected, or failing that the page's main text.
      If you select the ad text before clicking, that's what gets saved.

   The value of the last expression is what executeScript hands back. */

(() => {
  const MAX_DESCRIPTION = 20000;

  /* ── text helpers ─────────────────────────────────────────── */

  const tidy = (s) =>
    (s || "")
      .replace(/ /g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const textOf = (el) => (el ? tidy(el.innerText) : "");
  const one = (selector) => textOf(document.querySelector(selector));

  /* JobPosting descriptions are HTML. DOMParser gives an inert document:
     nothing in it runs or loads. Block tags become line breaks first so the
     paragraphs and bullet points survive as text. */
  const htmlToText = (html) => {
    if (!html) return "";
    const marked = String(html)
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<(br|\/p|\/div|\/h[1-6]|\/tr|\/ul|\/ol)[^>]*>/gi, "\n");
    const doc = new DOMParser().parseFromString(marked, "text/html");
    return tidy(doc.body.textContent || "");
  };

  /* ── 1. schema.org JobPosting ─────────────────────────────── */

  const findJobPosting = () => {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      let data;
      try {
        data = JSON.parse(script.textContent);
      } catch {
        continue;
      }
      const stack = [data];
      while (stack.length) {
        const node = stack.pop();
        if (!node || typeof node !== "object") continue;
        if (Array.isArray(node)) {
          stack.push(...node);
          continue;
        }
        const types = [].concat(node["@type"] || []);
        if (types.includes("JobPosting")) return node;
        if (node["@graph"]) stack.push(node["@graph"]);
      }
    }
    return null;
  };

  const nameOf = (v) => (typeof v === "string" ? v : v && typeof v === "object" ? v.name || "" : "");

  const locationOf = (posting) => {
    if (posting.jobLocationType === "TELECOMMUTE") return "Remote";
    const places = [].concat(posting.jobLocation || []);
    const parts = places
      .map((place) => {
        const a = (place && place.address) || {};
        if (typeof a === "string") return a;
        return [a.addressLocality, a.addressRegion].filter(Boolean).join(" ");
      })
      .filter(Boolean);
    return [...new Set(parts)].join(" · ");
  };

  const salaryOf = (posting) => {
    const s = posting.baseSalary;
    if (!s || typeof s !== "object") return "";
    const v = s.value && typeof s.value === "object" ? s.value : { value: s.value };
    const money = (n) => (typeof n === "number" ? `$${n.toLocaleString("en-AU")}` : n ? `$${n}` : "");
    const range =
      v.minValue && v.maxValue
        ? `${money(v.minValue)} – ${money(v.maxValue)}`
        : money(v.value || v.minValue || v.maxValue);
    const unit = (v.unitText || "").toLowerCase();
    return range ? `${range}${unit ? ` per ${unit}` : ""}` : "";
  };

  const fromJobPosting = () => {
    const posting = findJobPosting();
    if (!posting) return null;
    return {
      title: nameOf(posting.title),
      company: nameOf(posting.hiringOrganization),
      location: locationOf(posting),
      workType: [].concat(posting.employmentType || []).join(", "),
      salary: salaryOf(posting),
      url: typeof posting.url === "string" ? posting.url : "",
      description: htmlToText(posting.description),
    };
  };

  /* ── 2. per-site readers ──────────────────────────────────── */

  /* Finds a section by its heading text ("About the job") rather than by
     class names, which LinkedIn renames often. Climbs from the heading to
     the first container holding real body text. */
  const sectionByHeading = (pattern) => {
    const heading = [...document.querySelectorAll("h1, h2, h3, h4, strong, span, div")].find(
      (el) => el.children.length === 0 && pattern.test((el.textContent || "").trim()),
    );
    let box = heading;
    for (let i = 0; i < 8 && box && textOf(box).length < 300; i++) box = box.parentElement;
    if (!box) return "";
    return textOf(box).replace(pattern, "").trim();
  };

  const host = location.hostname;
  const isSeek = /(^|\.)seek\.(com\.au|co\.nz)$|^(au|nz)\.seek\.com$/.test(host);
  const isLinkedIn = /(^|\.)linkedin\.com$/.test(host) && location.pathname.startsWith("/jobs");
  const isIndeed = /(^|\.)indeed\.com$/.test(host);

  const param = (name) => new URLSearchParams(location.search).get(name);

  const fromSite = () => {
    if (isSeek) {
      // The search page shows the ad in a side panel with the same markers.
      const id = param("jobId") || (location.pathname.match(/\/job\/(\d+)/) || [])[1];
      return {
        source: "SEEK",
        title: one('[data-automation="job-detail-title"]'),
        company: one('[data-automation="advertiser-name"]'),
        location: one('[data-automation="job-detail-location"]'),
        workType: one('[data-automation="job-detail-work-type"]'),
        salary: one('[data-automation="job-detail-salary"]'),
        url: id ? `${location.origin}/job/${id}` : "",
        description: one('[data-automation="jobAdDetails"]'),
      };
    }
    if (isLinkedIn) {
      // The job page's tab title reads "Role | Company | LinkedIn".
      const parts = document.title.replace(/^\(\d+\)\s*/, "").split(" | ");
      const byTitle = parts.length >= 3 && /linkedin/i.test(parts[parts.length - 1]);
      const id = param("currentJobId") || (location.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d+)/) || [])[1];
      // First line shaped like "Edinburgh, South Australia, Australia · Reposted …".
      const topLine = (document.querySelector("main")?.innerText || "")
        .split("\n")
        .find((line) => / · /.test(line) && /,/.test(line.split(" · ")[0]));
      return {
        source: "LinkedIn",
        title: byTitle ? parts[0] : "",
        company: byTitle ? parts[1] : "",
        location: topLine ? topLine.split(" · ")[0].trim() : "",
        workType: "",
        salary: "",
        url: id ? `https://www.linkedin.com/jobs/view/${id}/` : "",
        description: sectionByHeading(/^about the (job|role)$/i),
      };
    }
    if (isIndeed) {
      const jk = param("jk") || param("vjk");
      return {
        source: "Indeed",
        title: one('[data-testid="jobsearch-JobInfoHeader-title"]') || one("h1"),
        company: one('[data-testid="inlineHeader-companyName"]'),
        location: one('[data-testid="inlineHeader-companyLocation"]') || one('[data-testid="job-location"]'),
        workType: "",
        salary: one("#salaryInfoAndJobType"),
        url: jk ? `${location.origin}/viewjob?jk=${jk}` : "",
        description: one("#jobDescriptionText"),
      };
    }
    return null;
  };

  /* ── 3. put it together ───────────────────────────────────── */

  const structured = fromJobPosting();
  const site = fromSite();
  const pick = (key) => (structured && structured[key]) || (site && site[key]) || "";

  const candidates = [structured && structured.description, site && site.description].filter(Boolean);
  let description = candidates.sort((a, b) => b.length - a.length)[0] || "";
  let method = structured ? "schema.org" : site ? site.source.toLowerCase() : "page";

  // An explicit selection wins: the user is telling us which text is the ad.
  const selection = tidy(String(window.getSelection() || ""));
  if (selection.length >= 200) {
    description = selection;
    method = "selection";
  }

  if (!description) {
    const main = [document.querySelector("main"), document.querySelector("article"), document.querySelector('[role="main"]')]
      .filter(Boolean)
      .sort((a, b) => textOf(b).length - textOf(a).length)[0];
    description = textOf(main);
    method = "page";
  }

  return {
    source: (site && site.source) || location.hostname.replace(/^www\./, ""),
    method,
    title: pick("title") || document.title,
    company: pick("company"),
    location: pick("location"),
    workType: pick("workType"),
    salary: pick("salary"),
    url: pick("url") || location.href,
    description: description.slice(0, MAX_DESCRIPTION),
  };
})();
