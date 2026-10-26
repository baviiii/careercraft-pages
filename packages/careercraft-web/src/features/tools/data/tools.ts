/* The public tool pages (/tools and /tools/:slug): what each tool is for,
   how it works, why it exists, and what it won't do.

   Every claim here is checked against the code it describes. When a tool
   changes, change its page: a page that oversells is worse than no page.
   Titles and descriptions for search live in src/seo/public-pages.json
   (prerender and usePageMeta read them from there); this file holds the
   page itself. */

export type Stage = "figure" | "ready" | "go";

export const STAGES: Record<Stage, { n: string; name: string; line: string }> = {
  figure: { n: "01", name: "Figure it out", line: "Work out what fits and what the market is doing." },
  ready: { n: "02", name: "Get ready", line: "Get the résumé and the letter into shape." },
  go: { n: "03", name: "Go for it", line: "Apply, keep track, and practise the interview." },
};

export interface Tool {
  slug: string;
  /** Name as used around the app. */
  name: string;
  stage: Stage;
  /** The page heading, written as the thing people search for. */
  h1: string;
  /** The end of h1 that the layout picks out (must be its last words). */
  accent?: string;
  lede: string;
  /** Short facts under the heading. */
  facts: string[];
  /** Where the tool lives in the app. Signed-in visitors go straight there;
      others sign up first and are brought back to it (setGuestReturnTo). */
  appPath: string;
  cta: { label: string };
  /** The closing panel's heading. */
  closing: string;
  /** Whether trying it needs an account, said plainly on the page.
      "partial": usable without one (the builder), so its button never detours via sign-up. */
  account: "free" | "partial";
  shot: { src: string; alt: string; caption: string };
  /** Numbered notes pinned to the main screenshot. x and y are percentages
      of the image, pointing at the thing the note describes. */
  callouts?: Array<{ x: number; y: number; title: string; body: string }>;
  /** Questions or jobs it's good for, in the visitor's words. `quotes`
      when the items are things you'd type into the tool. */
  goodFor?: { heading: string; items: string[]; quotes?: boolean };
  /** A short recording, shown after "How it works". Plays once. */
  clip?: { src: string; still: string; alt: string; caption: string };
  /** A second screenshot, shown after "How it works". */
  extraShot?: { src: string; alt: string; caption: string; path: string };
  steps: Array<{ title: string; body: string }>;
  /** "Why it exists": the background, in a few short paragraphs. */
  background: { heading: string; paragraphs: string[] };
  australia: string[];
  limits: string[];
  faqs: Array<{ q: string; a: string }>;
  related: string[];
}

export const TOOLS: Tool[] = [
  /* ─────────────── Get ready ─────────────── */
  {
    slug: "resume-builder",
    name: "Résumé builder",
    stage: "ready",
    h1: "A résumé builder that writes the Australian way",
    accent: "writes the Australian way",
    lede:
      "Paste the résumé you already have, or start from a blank page. Edit it with the finished page beside you, choose one of 25 templates, then download a print-ready PDF.",
    facts: ["Free", "No account to start", "25 templates", "PDF export"],
    appPath: "/builder",
    cta: { label: "Start building, no account needed" },
    closing: "Start your résumé.",
    account: "partial",
    shot: {
      src: "/tools/resume-builder.webp",
      alt: "The résumé builder's edit step: sections on the left, the finished page updating on the right",
      caption: "Editing a sample résumé, with the page updating as you type.",
    },
    clip: {
      src: "/tools/resume-builder-clip.webp",
      still: "/tools/resume-builder.webp",
      alt: "Typing a summary into the résumé builder while the page preview updates beside it",
      caption: "Type on the left, and the page on the right keeps up.",
    },
    callouts: [
      { x: 4.3, y: 27.6, title: "Four steps", body: "Start, edit, design, download. You can go back to any of them." },
      { x: 31.4, y: 46.6, title: "Saved as you go", body: "Your draft is kept in this browser until you make a free account, then it moves into your account." },
      { x: 73.4, y: 46, title: "Tailor it to an ad", body: "Paste the job you're going for, so you can shape each point toward it." },
      { x: 58.9, y: 56.9, title: "The page, live", body: "The preview updates as you type and shows how many pages it runs to." },
    ],
    goodFor: {
      heading: "Good for",
      items: [
        "Turning an old Word résumé into something current",
        "Writing your first résumé from a blank page",
        "Reshaping an overseas CV for Australian employers",
        "Trying a new design without retyping anything",
        "Getting a draft together before you decide to sign up",
      ],
    },
    steps: [
      {
        title: "Bring what you have",
        body: "Paste your résumé's text and Faircopy sorts it into sections: contact details, summary, experience, education, skills and referees. With a free account you can upload a PDF, a Word file or even a photo of a printed page instead.",
      },
      {
        title: "Edit with the page beside you",
        body: "Change any section and watch the page update. Signed in, you can rewrite a single bullet against the job you're going for, and keep or bin the result.",
      },
      {
        title: "Pick a design",
        body: "Choose from 25 templates, from plain and traditional to more modern layouts. Switching design never touches your content, so try as many as you like.",
      },
      {
        title: "Download",
        body: "Export a print-ready PDF. Your résumé is saved to My Résumés, ready to check against a job ad or turn into a cover letter.",
      },
    ],
    background: {
      heading: "Why build another résumé builder?",
      paragraphs: [
        "Most résumé builders, and most résumé advice online, are written for the American market: keep it to one page, never list referees, spell it 'organized'. Follow that in Australia and you can come across as someone who hasn't applied here before.",
        "Australian employers are used to two or three pages, a referees section (or 'available on request'), qualifications under their real AQF names, and Australian spelling. The templates and the rewriting in Faircopy are set up for that, so you're not fighting the tool to do it properly.",
        "You can get a long way without signing up. Your draft lives in your browser until you make a free account, then it moves into your account so nothing is lost.",
      ],
    },
    australia: [
      "Two to three pages is normal here, and nothing in Faircopy pushes you down to one",
      "A referees section has its own place",
      "Qualifications keep their AQF names: Certificate III, Diploma, Bachelor",
      "Australian spelling throughout: organised, programme where it fits, licence",
      "No photo, date of birth or marital status fields, because Australian résumés leave them out",
    ],
    limits: [
      "It won't invent experience. Rewrites work from what you wrote, so read every one before you keep it",
      "Downloading needs a free account. Until then your draft is saved in this browser only",
      "Uploading a PDF, Word file or photo needs a free account too. Pasting text works without one",
      "A few designs don't have a PDF version yet. If you pick one, you're told before you download",
    ],
    faqs: [
      {
        q: "Is it really free?",
        a: "Building, editing, choosing a template and downloading a PDF are free. A free account is needed to download, upload files and use the AI rewriting.",
      },
      {
        q: "What happens to my draft if I don't sign up?",
        a: "It's saved in this browser on this device. If you clear your browser data, it's gone. Make a free account and the draft moves into your account automatically.",
      },
      {
        q: "Should my résumé be one page?",
        a: "Not in Australia. Two to three pages is normal for most roles; graduates often fit on one or two. What matters more is that the first page shows why you fit the job.",
      },
      {
        q: "Do I need to list referees?",
        a: "Most Australian employers expect either two referees with contact details or 'Referees available on request'. The builder has a referees section for either.",
      },
    ],
    related: ["ats-checker", "bullet-rewrite", "cover-letters"],
  },
  {
    slug: "bullet-rewrite",
    name: "Bullet rewrite",
    stage: "ready",
    h1: "Rewrite a weak résumé bullet into a strong one",
    accent: "into a strong one",
    lede:
      "Paste a line like 'Responsible for stock control'. Add the job ad if you have it. You get back a plain, specific rewrite that says what you did, with what, and what came of it.",
    facts: ["Free account", "One line at a time", "Steered by the job ad"],
    appPath: "/rewrite",
    cta: { label: "Try it free" },
    closing: "Rewrite your first bullet.",
    account: "free",
    shot: {
      src: "/tools/bullet-rewrite.webp",
      alt: "The bullet rewrite tool with an original bullet, a job ad and the rewritten line",
      caption: "A vague duty rewritten into something specific, steered by the job ad.",
    },
    callouts: [
      { x: 57.5, y: 42, title: "One line in", body: "Paste a bullet that reads like a duty rather than something you did." },
      { x: 57.5, y: 55.5, title: "The ad steers it", body: "Optional. With the job ad, the rewrite picks up the words that employer uses." },
      { x: 57.5, y: 88.9, title: "Before and after", body: "The original is struck through above its rewrite. Copy the new line straight into your résumé." },
    ],
    goodFor: {
      heading: "Lines worth rewriting",
      quotes: true,
      items: [
        "Responsible for stock control and ordering",
        "Duties included customer service",
        "Assisted with patient care on the ward",
        "Worked on the company website",
        "Helped with end-of-month reporting",
      ],
    },
    steps: [
      { title: "Paste one bullet", body: "Any line from your résumé that reads like a job description rather than something you did." },
      {
        title: "Add the job ad (optional)",
        body: "Paste the ad you're applying for and the rewrite leans toward the words that employer uses.",
      },
      {
        title: "Read, check, copy",
        body: "You get one rewritten line. Check it says what really happened, then copy it into your résumé. Earlier rewrites stay in the list while you work.",
      },
    ],
    background: {
      heading: "Why 'responsible for' doesn't land",
      paragraphs: [
        "A recruiter skimming a pile of applications isn't reading for duties. Everyone in the role had the same duties. They're looking for what you in particular did and how well.",
        "'Responsible for stock control' tells them your job title. 'Ran weekly stock counts in the store's inventory system and cut write-offs' tells them something about you. The rewrite aims for that second kind of line: what you did, the tool or method you used, and the result if there was one.",
        "It deliberately avoids the buzzwords that make résumés sound alike: spearheaded, leveraged, results-driven, passionate about. Plain and specific reads as more credible.",
      ],
    },
    australia: [
      "Written in Australian English",
      "Keeps the language of your field: clinical terms for nurses, equipment and tickets for trades, systems for office roles",
      "Never turns your work rights into American visa terms",
    ],
    limits: [
      "Check every number. The rewrite can suggest an approximate result like 'around 20%' to show the shape of a strong line. If it isn't true for you, change it or take it out",
      "It rewrites one line at a time. To rewrite a whole résumé against a job, use the ATS checker",
      "It only knows what you paste. A rewrite can't add a skill or result it hasn't been told about",
    ],
    faqs: [
      {
        q: "Will it make things up?",
        a: "It won't invent skills or jobs, but it may suggest an approximate figure to show what a strong line looks like. Treat any number as a prompt to put in your real one.",
      },
      {
        q: "Do I need the job ad?",
        a: "No, but it helps. With the ad, the rewrite picks up the words that employer uses, which is what both people and screening software look for.",
      },
      {
        q: "Can I rewrite a whole résumé?",
        a: "Yes, from the ATS checker: paste the job ad, then rewrite sections against it. In the résumé builder you can also rewrite any bullet in place.",
      },
    ],
    related: ["resume-builder", "ats-checker", "cover-letters"],
  },
  {
    slug: "cover-letters",
    name: "Cover letters",
    stage: "ready",
    h1: "Write a cover letter for an Australian job, from your own résumé",
    accent: "from your own résumé",
    lede:
      "Pick your résumé, paste the job ad, choose a tone. You get a letter drawn from your real experience, in Australian English, that you can edit line by line before it goes anywhere.",
    facts: ["Free account", "Three tones", "Saved to the application"],
    appPath: "/cover-letter",
    cta: { label: "Write one free" },
    closing: "Write your next cover letter.",
    account: "free",
    shot: {
      src: "/tools/cover-letters.webp",
      alt: "The cover letter desk: the brief on the left and the letter on a sheet of stationery on the right",
      caption: "The brief on the left, the letter on the right, saved letters underneath.",
    },
    callouts: [
      { x: 39.3, y: 32.9, title: "Your résumé, your examples", body: "The letter draws on the résumé you pick, so its examples are things you've actually done." },
      { x: 41.5, y: 23.6, title: "Tied to the application", body: "Started from a job in your tracker, the letter knows the role and company, and saves to that application." },
      { x: 33.2, y: 69.4, title: "Three tones", body: "Professional, confident or casual. Try each and keep the one that sounds like you." },
      { x: 45.2, y: 53.8, title: "Edit it on the page", body: "Change anything before you save it, copy it or download it." },
    ],
    goodFor: {
      heading: "Good for",
      items: [
        "An application due tonight that asks for a letter",
        "A role you really want, where a generic letter won't do",
        "Trying three versions and keeping the best",
        "Keeping each letter with the application it went to",
      ],
    },
    steps: [
      { title: "Choose your résumé", body: "Use one you've built or saved in Faircopy, so the letter draws on what you've actually done." },
      {
        title: "Paste the job ad",
        body: "Or start from a job in your tracker, and the role and company come with it. The letter answers that ad, not a generic one.",
      },
      {
        title: "Pick a tone",
        body: "Professional for traditional workplaces, confident to lead with what you've achieved, or casual for teams that write that way.",
      },
      {
        title: "Edit, then keep it",
        body: "Change anything on the page. Save it to your library, or to the tracked application it's for, then copy it or download it as text.",
      },
    ],
    background: {
      heading: "What an Australian cover letter is for",
      paragraphs: [
        "A cover letter answers two questions your résumé can't: why this job, and why you for it. In Australia it's usually kept to a page, addressed to a person where the ad names one, and written in plain language.",
        "Most generated letters fail the same way: they could be about anyone. They praise the company in general terms and list adjectives. Faircopy's letters start from your résumé and the ad, so the examples are yours and the fit is specific.",
        "It never leaves placeholders like [Hiring Manager] or [Company Name] in the letter. If the ad doesn't name the company, it writes 'your team' rather than guessing.",
      ],
    },
    australia: [
      "Australian English throughout",
      "Uses the role and company names exactly as the ad gives them",
      "Carries your right-to-work wording through as you wrote it",
      "Keeps to a length Australian employers expect",
    ],
    limits: [
      "Read it before you send it. It's a strong first draft, and you know details it doesn't",
      "Letters download as plain text, ready to paste into an email or your own document",
      "Government jobs often ask for a separate selection-criteria statement. A cover letter doesn't replace it. The selection-criteria drafter in Interview practice helps with that",
    ],
    faqs: [
      {
        q: "Do Australian employers still read cover letters?",
        a: "Many do, especially for smaller employers and roles with lots of applicants. When an ad asks for one, a specific letter is one of the easiest ways to stand out.",
      },
      {
        q: "Which tone should I pick?",
        a: "Professional suits most corporate, government and healthcare roles. Confident suits sales and leadership roles. Casual suits startups and creative teams. You can try all three and keep the best.",
      },
      {
        q: "Can I write one for a job in my tracker?",
        a: "Yes. Start from the job in your tracker and the letter is attached to that application when you save it.",
      },
    ],
    related: ["resume-builder", "ats-checker", "job-tracker"],
  },

  /* ─────────────── Go for it ─────────────── */
  {
    slug: "ats-checker",
    name: "ATS checker",
    stage: "go",
    h1: "Check your résumé against the job ad before you apply",
    accent: "before you apply",
    lede:
      "Paste the ad and choose your résumé. You get a match score with the reasoning shown: the keywords you're missing, the requirements you meet and the ones you don't, and what a recruiter would flag on a first read.",
    facts: ["Free account", "Score with reasons", "Built for Australian résumés"],
    appPath: "/analysis",
    cta: { label: "Check my résumé free" },
    closing: "Check your résumé against the ad.",
    account: "free",
    shot: {
      src: "/tools/ats-checker.webp",
      alt: "An ATS report: overall score, four part scores, and tabs for keywords, red flags and fixes",
      caption: "A sample report: the score, what it's made of, and where to look next.",
    },
    clip: {
      src: "/tools/ats-checker-clip.webp",
      still: "/tools/ats-checker.webp",
      alt: "Running an ATS check: the résumé and job ad, the check running, then the scored report",
      caption: "Résumé and ad in, report out.",
    },
    callouts: [
      { x: 27.5, y: 22.8, title: "The overall score", body: "Built from the four part scores beside it. Use it to compare versions of your résumé for the same ad." },
      { x: 53.6, y: 17, title: "What it's made of", body: "Skills, experience, keywords and format, each scored on its own." },
      { x: 27.4, y: 50.6, title: "Where to look next", body: "Keywords matched and missing, red flags and quick fixes, each covered in detail further down." },
      { x: 58.3, y: 67.8, title: "Fix these first", body: "The changes likely to matter most, in order." },
    ],
    goodFor: {
      heading: "Run it when",
      items: [
        "You've tailored your résumé and want a second look before you apply",
        "An ad lists a lot of requirements and you're not sure you cover them",
        "You're changing fields and want to see which keywords you're missing",
        "You want to compare two versions of your résumé for the same job",
      ],
    },
    steps: [
      { title: "Choose your résumé", body: "Upload one or pick a résumé you've saved in Faircopy." },
      { title: "Paste the full job ad", body: "The whole ad, not the summary. The more of it there is, the more there is to check against." },
      {
        title: "Read the report",
        body: "An overall score built from four parts: skills, experience, keywords and format. Then tabs for the job brief, keyword gaps, the quality of your writing, red flags, and suggested fixes.",
      },
      {
        title: "Act on it",
        body: "Rewrite sections against the ad, write a cover letter from the same ad, and save the improved version as a new résumé.",
      },
    ],
    background: {
      heading: "What an ATS actually does",
      paragraphs: [
        "An applicant tracking system is the software many employers use to collect applications: systems like PageUp or Workday sit behind a lot of 'Apply now' buttons. It stores your résumé, lets recruiters search and sort applicants, and sometimes asks screening questions.",
        "You may have read that 75% of résumés are rejected by robots before a person sees them. There's no good evidence for that figure. In most workplaces a person still makes the call; the software files, searches and ranks. What matters is that a recruiter searching for 'wound care' or 'Xero' finds you, and that your résumé reads clearly once they open it.",
        "So the checker isn't trying to beat a machine. It shows you where your résumé and the ad don't line up, so you can fix what's true and fixable before a person reads it.",
      ],
    },
    australia: [
      "Doesn't take marks off for two or three pages, a referees section, AQF qualification names or Australian spelling",
      "Does flag a photo, date of birth, marital status or American spelling",
      "Flags missing work-rights information when the ad asks for it",
      "Warns you when the ad asks for selection criteria, which a résumé alone won't satisfy",
      "Works for any field, from nursing and trades to finance, not just tech",
    ],
    limits: [
      "The score is a guide, not a prediction. Every employer sets up their system differently, and none of them share how",
      "It can only check what you paste. A shortened ad means a shorter check",
      "It won't keyword-stuff for you. Add a keyword only where it's true for you",
    ],
    faqs: [
      {
        q: "What's a good score?",
        a: "There's no pass mark. Use the score to compare versions of your résumé for the same ad, and focus on the gaps that are true and fixable.",
      },
      {
        q: "Does it work for jobs outside tech?",
        a: "Yes. It reads the ad and your résumé in the language of your field, whether that's clinical care, a trade, retail or finance.",
      },
      {
        q: "Will it change my résumé?",
        a: "Not unless you choose to. Suggestions stay suggestions until you save an improved version.",
      },
      {
        q: "The job asks for selection criteria. Is that covered?",
        a: "The checker tells you when an ad expects a selection-criteria statement. Writing one is a separate task, which the drafter in Interview practice helps with.",
      },
    ],
    related: ["resume-builder", "bullet-rewrite", "cover-letters"],
  },
  {
    slug: "job-tracker",
    name: "Job tracker",
    stage: "go",
    h1: "A job application tracker that tells you what to do next",
    accent: "tells you what to do next",
    lede:
      "Every application on one board, from saved to offer. Faircopy points out what's waiting on you, when it's worth following up, and how many of the employers you've applied to have got back to you.",
    facts: ["Free account", "Saved to offer", "Follow-up nudges"],
    appPath: "/tracker",
    cta: { label: "Start tracking free" },
    closing: "Put your job hunt on one board.",
    account: "free",
    shot: {
      src: "/tools/job-tracker.webp",
      alt: "The job tracker board with columns for saved, applied, interview and offer",
      caption: "A sample board, with what needs doing next at the top.",
    },
    callouts: [
      { x: 65.2, y: 24.8, title: "Your search at a glance", body: "How many jobs are moving, interviews lined up, and how many employers have got back to you." },
      { x: 86, y: 35.8, title: "Up next", body: "What needs you: an interview to prepare for, or an employer you haven't heard from in a while." },
      { x: 38.1, y: 54.3, title: "Saved to offer", body: "Each job sits in a column. Tap 'I applied' or 'Got an interview' to move it on." },
      { x: 71.6, y: 72, title: "What went with it", body: "Each card shows whether a résumé and a cover letter are attached to that application." },
    ],
    goodFor: {
      heading: "Good for",
      items: [
        "Applying to more than a handful of jobs at once",
        "Keeping the résumé and letter with each application",
        "Knowing when it's reasonable to follow up",
        "Seeing how many employers have actually got back to you",
        "Keeping jobs you've saved apart from the ones you've applied for",
      ],
    },
    steps: [
      { title: "Add a job", body: "Type in the details, or save one from Browse jobs in a tap." },
      {
        title: "Move it along",
        body: "Saved, applied, interview, offer or not this time. Moving a job from saved to applied stamps the date for you.",
      },
      {
        title: "See what's next",
        body: "Up next lists what needs you: an interview coming up, or an employer you haven't heard from in a while. 'No word from them in 16 days. Nudge them?'",
      },
      {
        title: "Do the work from the job",
        body: "From any job, check your résumé against the ad, write a cover letter for it, or set the interview date and practise.",
      },
    ],
    background: {
      heading: "Why track applications at all",
      paragraphs: [
        "When you're applying for a lot of roles, they blur. Which version of the résumé went where? Did that recruiter ever call back? Was the interview Tuesday or Thursday?",
        "A tracker answers those at a glance, and it shows you the shape of your search: how many jobs are saved, applied for, at interview and at offer. Jobs you've saved to look at later sit in their own column, apart from the ones you've actually applied for.",
        "Because the tracker sits next to the other tools, each job is a starting point: the ATS check, the cover letter and the interview practice all know which job they're for.",
      ],
    },
    australia: [
      "Works for jobs anywhere in Australia, in any field",
      "Jobs from Browse jobs come straight in from live Australian ads",
    ],
    limits: [
      "It doesn't email employers or read your inbox. You move a job along yourself, in a tap",
      "It doesn't apply for you. Applications still happen on the employer's site",
    ],
    faqs: [
      { q: "Is it free?", a: "Yes, with a free account." },
      {
        q: "Will it remind me to follow up?",
        a: "Up next flags employers you haven't heard from in a while, so you can decide whether to nudge them. It doesn't send anything for you.",
      },
      {
        q: "Can I attach a cover letter to an application?",
        a: "Yes. Write a letter from the job and it's attached to that application when you save it.",
      },
    ],
    related: ["browse-jobs", "cover-letters", "interview-practice"],
  },
  {
    slug: "interview-practice",
    name: "Interview practice",
    stage: "go",
    h1: "Practise job interviews and see how every answer is scored",
    accent: "see how every answer is scored",
    lede:
      "Pick the kind of interview you've got coming: a phone screen, behavioural, technical or the full thing. Answer the questions properly, then see how each answer was scored, what it was missing, and try it again.",
    facts: ["Free account", "Four interview types", "STAR scoring shown"],
    appPath: "/interview-prep",
    cta: { label: "Practise free" },
    closing: "Practise for your next interview.",
    account: "free",
    shot: {
      src: "/tools/interview-practice.webp",
      alt: "The interview practice hub with the four interview types to choose from",
      caption: "Choose the kind of interview you're preparing for.",
    },
    callouts: [
      { x: 35, y: 83, title: "From your tracker", body: "An interview date in your tracker shows up here with a countdown and the rounds to practise." },
      { x: 41, y: 56.3, title: "Pitched at your level", body: "Questions follow the role and seniority you're going for. Change it any time." },
      { x: 49.3, y: 67.9, title: "Your story library", body: "Keep your strongest answer for each competency, and look back at past sessions in History." },
    ],
    goodFor: {
      heading: "Practise for",
      items: [
        "A recruiter phone screen next week",
        "A behavioural panel: 'Tell me about a time when…'",
        "A technical round in your field",
        "A government role with selection criteria",
        "Having your best stories ready before the day",
      ],
    },
    steps: [
      {
        title: "Choose the interview",
        body: "Phone screen, behavioural, technical, or a full interview. Each runs differently: a phone screen covers the basics Australian recruiters ask, a behavioural round asks for one story per competency.",
      },
      {
        title: "Choose how you want feedback",
        body: "Realistic holds feedback until the end, like the real thing. Coached gives it after every answer.",
      },
      {
        title: "Answer properly",
        body: "Write your answer as you'd say it. Faircopy shows answer length as speaking time, so you can tell a ramble from a one-liner.",
      },
      {
        title: "Read the debrief, then retry",
        body: "See how the score was made, which parts of STAR your answer covered (highlighted in your own words), and whether you said 'I' or 'we'. Retry any question and watch the score change.",
      },
    ],
    background: {
      heading: "Why interviews reward practice",
      paragraphs: [
        "Most behavioural interview questions ('Tell me about a time when…') are looking for the same shape of answer: the Situation, the Task, the Action you took, the Result, and ideally what you'd do differently next time. That's STAR, or STARR with the reflection.",
        "Knowing the shape and doing it under pressure are different things. The common slips are easy to spot once someone points them out: all situation and no action, 'we' where they wanted 'I', or no result at all. The debrief points them out, answer by answer.",
        "Your best stories are worth keeping. The story library saves your strongest answer for each competency, so you walk in with them ready.",
      ],
    },
    australia: [
      "Phone screens cover what Australian recruiters ask early: availability, work rights, salary expectations",
      "Story library can follow the APS Integrated Leadership System or the NSW Public Sector Capability Framework",
      "A selection-criteria drafter for government applications",
      "Interview dates from your tracker come with a practice plan sized to the days you have left",
    ],
    limits: [
      "It's practice, not a prediction. A real panel will ask its own questions",
      "Feedback comes from AI and can be wrong. Treat it as a second opinion, not a verdict",
      "Typing always works. Spoken answers are being rolled out and may not be on for everyone yet",
    ],
    faqs: [
      {
        q: "What's STAR?",
        a: "Situation, Task, Action, Result: the structure most behavioural questions are looking for. STARR adds a Reflection, what you learned or would change.",
      },
      {
        q: "Realistic or Coached?",
        a: "Coached while you're learning the shape of a good answer, Realistic when you want to rehearse the real thing without interruptions.",
      },
      {
        q: "Does it help with government selection criteria?",
        a: "Yes. The story library can follow the APS or NSW capability frameworks, and there's a drafter for selection-criteria statements.",
      },
    ],
    related: ["job-tracker", "career-coach", "cover-letters"],
  },

  /* ─────────────── Figure it out ─────────────── */
  {
    slug: "career-coach",
    name: "Career coach",
    stage: "figure",
    h1: "A career coach that shows you its sources",
    accent: "shows you its sources",
    lede:
      "Ask about roles, pathways, qualifications or where the work is, and follow up like a conversation. Each answer comes with the published documents behind it, so you can check the claim rather than take our word for it.",
    facts: ["Free account", "Cited answers", "Deepest on South Australia"],
    appPath: "/career-coach",
    cta: { label: "Ask the coach free" },
    closing: "Ask the coach your question.",
    account: "free",
    shot: {
      src: "/tools/career-coach.webp",
      alt: "The career coach answering a question about nursing pathways, with source chips under the answer",
      caption: "An answer with the documents it came from underneath.",
    },
    callouts: [
      { x: 27.6, y: 26.6, title: "It looks things up first", body: "This bar shows how long it spent and how many searches it ran. Open it to see what it looked for." },
      { x: 96.4, y: 35.2, title: "Claims are numbered", body: "A number in brackets points to the source behind that sentence." },
      { x: 24.4, y: 79.3, title: "The documents behind it", body: "Every source is listed under the answer. Open one to check the detail yourself." },
    ],
    goodFor: {
      heading: "Good questions to ask it",
      quotes: true,
      items: [
        "How do I move from enrolled nurse to registered nurse?",
        "Where are the electrician jobs in South Australia?",
        "Which qualification do I need to start in aged care?",
        "Which industries in SA are expected to need more workers?",
        "Is a Certificate IV enough to start in IT support?",
      ],
    },
    clip: {
      src: "/tools/career-coach-clip.webp",
      still: "/tools/career-coach.webp",
      alt: "Asking the career coach a question: it searches, then writes an answer with sources",
      caption: "The coach searches first, then answers with its sources underneath.",
    },
    steps: [
      { title: "Ask a question", body: "'How do I move from enrolled nurse to registered nurse?' or 'Where are the electrician jobs in SA?'" },
      {
        title: "The coach looks it up",
        body: "It searches its library of published reports and plans, sometimes several times for one question, and you can see what it's looking for as it works.",
      },
      { title: "Read the answer and its sources", body: "Each answer lists the documents it drew on. Open them to check the detail." },
      { title: "Follow up", body: "Ask 'which of those is quicker?' and it remembers what you were talking about." },
    ],
    background: {
      heading: "Why an answer should come with a source",
      paragraphs: [
        "Career advice online is often confident and wrong, or right for another country. When the question is which qualification to get or which region is hiring, a wrong answer costs months.",
        "So the coach answers from a library of published documents, mostly government workforce plans and reports, and shows you which ones. If it can't find something, it should say so rather than guess.",
      ],
    },
    australia: [
      "Its library is Australian, and deepest on South Australia today",
      "Answers use Australian qualification names and pathways",
    ],
    limits: [
      "Coverage outside South Australia is thinner for now",
      "A thorough answer can take around half a minute while it searches",
      "It's not a registered careers counsellor, migration agent or lawyer. For visa or legal questions, ask one",
    ],
    faqs: [
      {
        q: "Where do the answers come from?",
        a: "From a library of published documents, mostly government reports and workforce plans. Each answer lists the documents it used.",
      },
      {
        q: "Does it work outside South Australia?",
        a: "Yes for general questions, but its sources are deepest on SA today. Coverage is widening.",
      },
      {
        q: "Can it give visa advice?",
        a: "No. It can point you to published information, but visa questions need a registered migration agent.",
      },
    ],
    related: ["market-news", "browse-jobs", "interview-practice"],
  },
  {
    slug: "market-news",
    name: "Market news",
    stage: "figure",
    h1: "Australian job market news, sorted for your role",
    accent: "sorted for your role",
    lede:
      "Work stories from Australian outlets, put in order of how close they are to the work you do, plus the live numbers for your role: how many ads, what they pay, where they are and who's hiring.",
    facts: ["Free account", "Australian sources", "Live ad numbers"],
    appPath: "/job-market-news",
    cta: { label: "Read the market free" },
    closing: "See what's moving in your field.",
    account: "free",
    shot: {
      src: "/tools/market-news.webp",
      alt: "Market news: a list of Australian work stories, with why each one is relevant",
      caption: "Stories ranked for a sample profile, each saying why it's there.",
    },
    extraShot: {
      src: "/tools/market-numbers.webp",
      alt: "Your market: live ad count, salary bands and ads by state for clinical nurse roles",
      caption: "The 'Your market' tab: live ads, what they pay and where they are.",
      path: "faircopy.au/job-market-news?tab=market",
    },
    callouts: [
      { x: 62.5, y: 36.1, title: "Read by topic", body: "Hiring, pay, job cuts, visas, AI, skills and study, or workplace." },
      { x: 88.2, y: 41.6, title: "When it was checked", body: "The page reads Australian publishers' own feeds and says when it last looked." },
      { x: 53.8, y: 46, title: "Sorted for you", body: "Stories closest to your role come first, and the page says so in plain words." },
      { x: 30.8, y: 64.9, title: "Why it's there", body: "Each story says why it's near the top: your role, your industry, or a company in your tracker." },
    ],
    goodFor: {
      heading: "Good for",
      items: [
        "Working out whether it's you or a slow month in your field",
        "Checking what a role advertises before you name a salary",
        "Seeing which states have the most ads for your role",
        "Keeping up with visa and skilled-migration news",
        "Spotting news about employers you've applied to",
      ],
    },
    steps: [
      {
        title: "Read the news by topic",
        body: "Hiring, pay, job cuts, visas, AI, skills and study, or workplace. Stories come from outlets like Jobs and Skills Australia, the ABC and The Conversation, and every headline opens the original.",
      },
      {
        title: "See what's relevant to you",
        body: "'For you' puts the stories closest to your role first and says why in plain words. A story that names a company in your tracker is flagged.",
      },
      {
        title: "Check your market in numbers",
        body: "For any role: live ads across Australia, what they advertise, the spread of pay, ads by state, the employers advertising most, and advertised pay month by month.",
      },
    ],
    background: {
      heading: "Is it you, or the market?",
      paragraphs: [
        "When applications go quiet, it's hard to tell whether the problem is your résumé or a slow month in your field. Knowing what's happening in hiring, pay and job cuts for your kind of work helps you tell the difference.",
        "The numbers come from live Australian job ads, and the page says where each figure comes from and when it was checked. Nothing is filled in to make a chart look busier: if a figure didn't come back, it isn't shown.",
      ],
    },
    australia: [
      "Every news source is Australian",
      "Topics include visas and skilled migration",
      "Numbers are broken down by state and territory",
    ],
    limits: [
      "Pay figures are what ads advertise. Many ads don't list pay at all",
      "Ad numbers cover the listings Adzuna sees, which is a lot but not every job in Australia",
      "Stories are ranked, never hidden, so you still see the big news even if it isn't about your field",
    ],
    faqs: [
      {
        q: "Where does the news come from?",
        a: "From Australian publishers' own feeds, including Jobs and Skills Australia, HCAMag, the ABC, The Conversation and The Guardian's Australian immigration coverage.",
      },
      {
        q: "How is it sorted for me?",
        a: "By your target role, industry and skills, and by companies in your tracker, with newer stories ahead of older ones. Each story says why it's near the top.",
      },
      {
        q: "Where do the job numbers come from?",
        a: "From Adzuna, which collects job ads from across Australia. Each block says when it was checked.",
      },
    ],
    related: ["browse-jobs", "career-coach", "job-tracker"],
  },
  {
    slug: "browse-jobs",
    name: "Browse jobs",
    stage: "figure",
    h1: "Search Australian jobs, sorted by how well they fit you",
    accent: "sorted by how well they fit you",
    lede:
      "Search live job ads by role and place. With a profile, they're sorted by fit, with the reasons in words. Narrow by hours, remote, pay listed or graduate roles, and save the ones you want to your tracker in a tap.",
    facts: ["Free account", "Live Australian ads", "One tap to your tracker"],
    appPath: "/au-jobs",
    cta: { label: "Search jobs free" },
    closing: "Find your next role.",
    account: "free",
    shot: {
      src: "/tools/browse-jobs.webp",
      alt: "Browse jobs: a search for registered nurse roles, with job cards showing pay, hours and fit",
      caption: "A sample search, with fit, pay and hours on every ad.",
    },
    callouts: [
      { x: 70.8, y: 35.6, title: "Search like a sentence", body: "Type a role and a place, or start from the role in your profile." },
      { x: 20.6, y: 53.7, title: "Filters that count", body: "Each filter shows how many of the ads found match it, before you tap it." },
      { x: 77.2, y: 52.2, title: "This search in numbers", body: "Typical pay from the ads that list it, hours, and how many are fresh. Estimates are left out." },
      { x: 43.8, y: 86.6, title: "Fit, with reasons", body: "A strong fit says why in words: your target role, your skills, your current role." },
    ],
    goodFor: {
      heading: "Good for",
      items: [
        "Finding roles near you that fit your profile",
        "Ads that list pay, so you're not guessing",
        "Graduate and entry-level roles",
        "Part-time, casual or remote work",
        "Saving a job now and tailoring for it later",
      ],
    },
    steps: [
      {
        title: "Search",
        body: "Type a role and a place, or start from the role and city in your profile.",
      },
      {
        title: "Sort and narrow",
        body: "Best fit first, or newest. Then narrow to full-time, part-time, casual or contract, remote, ads that list pay, ads from this week, or graduate and entry-level roles.",
      },
      {
        title: "Save to your tracker",
        body: "One tap puts a job in your tracker's Saved column, ready to check your résumé against it or write the letter.",
      },
    ],
    background: {
      heading: "Why search here instead of a job board?",
      paragraphs: [
        "Job boards are good at listing jobs. The work starts after that: tailoring the résumé, writing the letter, keeping track of where you applied. Searching here puts each ad one tap away from all of that.",
        "Fit is explained, not just scored. A strong-fit ad tells you why: your target role, your skills, the pay you're after. When an ad doesn't list pay, any estimate is marked as an estimate.",
      ],
    },
    australia: ["Live ads from across Australia, searchable by city or suburb", "Pay shown in Australian dollars, with estimates labelled"],
    limits: [
      "Listings come from Adzuna, which covers a lot of the market but not every job on every board",
      "Ads arrive as summaries. Open the full ad before you apply, and paste all of it into the ATS checker",
    ],
    faqs: [
      { q: "Where do the jobs come from?", a: "From Adzuna, which collects job ads from across Australia. Every ad links to the original." },
      {
        q: "What does 'est.' next to pay mean?",
        a: "The ad didn't list pay, so the figure is Adzuna's estimate for a similar role. Ads that list pay show it without the label.",
      },
      {
        q: "How is fit worked out?",
        a: "From your profile: target role, skills, location, pay and work preferences, plus how close the ad is in meaning to your experience. Each ad shows the reasons.",
      },
    ],
    related: ["job-tracker", "ats-checker", "market-news"],
  },
];

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);

/** Tools in stage order, for the index page and the homepage. */
export const TOOLS_BY_STAGE = (Object.keys(STAGES) as Stage[]).map((stage) => ({
  stage,
  ...STAGES[stage],
  tools: TOOLS.filter((t) => t.stage === stage),
}));
