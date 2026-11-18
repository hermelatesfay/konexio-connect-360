# Express Interest form: specification

| Field | Type | Required | Notes |
|---|---|---|---|
| Full name | Text | Yes | |
| Organisation | Text | No | |
| Email | Email | Yes | Validate format |
| I am a... | Dropdown: Employer / Client / Donor / Partner / Other | Yes | Used for routing |
| I am interested in | Dropdown: A specific alumni profile / A skill pathway / General | Yes | |
| Message | Long text | Yes | Limit length (for example 1,000 characters) |
| Consent to be contacted | Checkbox | Yes | Link to the privacy notice |
| Website (hidden honeypot) | Hidden text | No | Bots fill it in: discard those submissions |

**After submit:** show a confirmation message, send an acknowledgement email to the sender, and notify recipients using `data/express_interest_routing_rules.csv`.

**Test it with:** `data/express_interest_sample_submissions.csv` (includes spam and a no-consent case).
