# Auth email templates

The five emails Supabase sends on Faircopy's behalf. `_base.html` is the shared
skeleton for reference — each template repeats it rather than importing it,
because Supabase takes one self-contained HTML string per template.

| File | Supabase template | Sent when |
|---|---|---|
| `confirm-signup.html` | Confirm signup | A new account needs its address verified |
| `reset-password.html` | Reset password | Someone asks for a password reset |
| `magic-link.html` | Magic link | Passwordless sign-in |
| `change-email.html` | Change email address | An existing account moves address |
| `invite.html` | Invite user | An admin invites someone |

## These do not reach production on their own

`config.toml` configures **local development only** — `supabase start`. Production
auth settings live in the Supabase dashboard, and nothing in this repo pushes
them there.

**Local:** already wired. `supabase start`, trigger an email, read it at
Inbucket — `http://127.0.0.1:54324`. Nothing leaves the machine.

**Production:** Dashboard → Authentication → Emails → Templates. Paste the file
contents into the matching template and set the subject to match the
`[auth.email.template.*]` blocks in `config.toml`. Repeat when a template
changes here — there is no sync, so these files and the dashboard **will** drift
unless someone keeps them together.

## Why the HTML looks like 2005

Email clients are not browsers. Rendering is the Word engine in Outlook, and a
stripped subset elsewhere.

- **Tables, not flex or grid.** Outlook supports neither.
- **Inline styles on everything.** Gmail strips `<style>` blocks in several
  contexts, so anything that matters cannot live in a stylesheet.
- **600px maximum.** Wider gets clipped in some desktop clients.
- **Buttons are tables.** Outlook ignores padding on inline elements, so a
  padded `<a>` collapses into bare underlined text.
- **No web fonts.** They fail silently in Outlook and Gmail. Faircopy's
  Bricolage Grotesque is unavailable here; a bold system sans with tight
  tracking stands in for it in the wordmark and headings.
- **One image: the mark.** `faircopy-mark-email.png`, a 7 KB 96px PNG served
  from `https://www.faircopy.au/brand/` and shown at 40px. PNG, not the site's
  WebP, because Outlook can't show WebP. The wordmark beside it is text, so
  with images blocked (often the default) the email still says "Faircopy".
  The image has to be live on the site before a template using it is pasted
  into the dashboard.
- **No SVG, no background images, no JavaScript.**
- **Every email has a preheader** — the grey line beside the subject. Without
  one, clients pull the first visible text, which here would be "Faircopy" alone.

## The copy rules

Each email says what happened, what to do, and what to do if it wasn't you.

The "wasn't you" line is not boilerplate. A password reset someone did not ask
for is alarming, and the email should say plainly that ignoring it is safe and
the link is useless without access to that inbox. `change-email.html` goes
further and tells them to contact support, because an unexpected address change
is the one case that genuinely suggests a compromised password.

No marketing in transactional mail. Someone resetting a password at 11pm does
not want a feature tour. The one exception: the two emails a new person gets
first — confirm sign-up and invite — end with a short "Your workshop for the
next move" block, the three stages from the homepage (Figure it out / Get
ready / Go for it) in one line each. It sits below the button, so the action
still comes first, and it adds no links.

## Variables

Supabase substitutes these:

| Variable | Is |
|---|---|
| `{{ .ConfirmationURL }}` | The signed action link |
| `{{ .Email }}` | The recipient |
| `{{ .NewEmail }}` | Email-change only: the address being moved to |
| `{{ .Token }}` | 6-digit code, if you prefer a code to a link |
| `{{ .SiteURL }}` | `site_url` from auth config |

Every template exposes the link twice: the button, and the raw URL below it for
clients that strip buttons or users who prefer to look before they click.

## Deliverability

`faircopy.au` mail has landed in spam. DNS and the Resend relay are correct —
the cause is a new domain with no sending reputation, and it improves with
volume and age. See `CONCERNS.md`. Nothing in these templates changes that,
though staying image-free and link-light helps rather than hurts.
