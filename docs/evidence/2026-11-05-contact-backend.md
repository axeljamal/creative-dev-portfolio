# Contact form backend: working end to end (5 Nov 2026)

Record of the contact form on axelle.marea-dvipa.uk working from the browser through the Worker to an email alert.

## How it fits together

Browser form → Turnstile spam check → `POST /api/contact` on the Cloudflare Worker → message saved in D1 → alert email to hello@marea-dvipa.uk through the Email Routing `send_email` binding, with Reply-To set to the sender.

## Evidence

**Form:** after Send, the page showed "Success!" in the Turnstile box and "Thanks, your message is on its way." ([2026-11-05-contact-form-success.png](2026-11-05-contact-form-success.png), the live site in Safari, after the 13:54 test)

**Worker logs** (`wrangler tail`):

```
POST https://axelle.marea-dvipa.uk/api/admin/test-alert - Ok @ 05/11/2026, 13:04:46
  (error) Alert email through Email Routing failed MIMETEXT_INVALID_HEADER_VALUE: The value for the header "Reply-To" is invalid.
POST https://axelle.marea-dvipa.uk/api/admin/test-alert - Ok @ 05/11/2026, 13:05:40
POST https://axelle.marea-dvipa.uk/api/contact - Ok @ 05/11/2026, 13:06:38
POST https://axelle.marea-dvipa.uk/api/contact - Ok @ 05/11/2026, 13:10:39
POST https://axelle.marea-dvipa.uk/api/contact - Ok @ 05/11/2026, 13:54:12
```

The first line is the bug before the fix (commit 43c1cc3). Every request after it ran with no errors.

**Test alert** (`POST /api/admin/test-alert`, behind the admin token), after the fix:

```json
{"result":"sent through Email Routing"}
```

**D1** (`messages` table), newest rows:

| created_at (UTC)         | status |
| ------------------------ | ------ |
| 2026-11-05T13:54:12.267Z | new    |
| 2026-11-05T13:10:39.235Z | new    |
| 2026-11-05T13:06:38.537Z | new    |

**Email Routing dashboard:** [2026-11-05-email-routing-dashboard.png](2026-11-05-email-routing-dashboard.png) shows routing enabled and 5 of 5 emails delivered in the last 7 days. "Email DNS records misconfigured" is expected: the domain's MX records point to Google Workspace, which hosts the hello@ inbox, and the Worker only uses Email Routing to send.
