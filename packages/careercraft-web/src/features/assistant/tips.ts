/* What Fay says the first time someone opens each page: a few short tips,
   one at a time ("Tell me more" for the next). Every claim here was checked
   against the page it describes — keep it that way when a page changes. */

export const PAGE_TIPS: Record<string, string[]> = {
  "/dashboard": [
    "This is home. Your résumés, applications and today's next step all start here.",
    "Your profile in Settings tunes jobs, news and interview prep to you.",
    "Click me any time for shortcuts to every page. You can drag me somewhere else, too.",
  ],
  "/my-resumes": [
    "All your saved résumés live here.",
    "Start a new one from scratch, or upload the one you have and Faircopy lays it out for you.",
    "Open one in the builder to change how it looks or download a PDF.",
  ],
  "/analysis": [
    "This checks your résumé against a job ad, the way an applicant tracking system would.",
    "Paste the whole ad: requirements, responsibilities, all of it. The more it sees, the fairer the score.",
    "You'll see the keywords you're missing and what to fix, and you can rewrite your résumé for that job.",
  ],
  "/cover-letter": [
    "Write a cover letter for a specific job here.",
    "Write it yourself, paste one you already have, or fill in the brief and write it from your résumé.",
    "Start one from a job in your tracker and it's attached to that job when you save it.",
  ],
  "/tracker": [
    "This is your job board. Jobs move along from Saved to Applied, Interview and Offer.",
    "Drag a card to move it. Set a follow-up date and I'll remind you when it's due.",
    "Got an email about a job? Paste it into that job and Faircopy suggests whether it's an interview, offer or rejection.",
    "The Faircopy browser button saves jobs from any job ad straight onto this board.",
  ],
  "/interview-prep": [
    "Practise interviews here: a phone screen, behavioural, technical or a full interview.",
    "Each answer is scored, and the debrief shows what to work on next.",
    "Save your best examples in Stories so they're ready for the real thing.",
  ],
  "/au-jobs": [
    "Search Australian job ads here.",
    "Fill in your profile and the results are sorted by how well they suit you.",
    "Save a job and it goes straight onto your tracker.",
  ],
  "/job-market-news": [
    "Australian job market news, gathered from trusted sources.",
    "The Your market tab shows advertised pay for your kind of role, month by month.",
  ],
  "/intelligence": [
    "Career insights: what's changing in your field, who's hiring and which skills are in demand.",
    "What to learn suggests skills worth picking up next.",
  ],
  "/settings": [
    "Your profile lives here. The more complete it is, the sharper your job matches and interview prep.",
    "Add your certificates and licences. Recruiters and ATS scans look for them.",
  ],
};

export function tipsFor(pathname: string): string[] {
  return PAGE_TIPS[pathname] ?? [];
}
