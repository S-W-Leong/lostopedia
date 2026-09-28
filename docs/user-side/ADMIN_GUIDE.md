# Admin Guide

Welcome to the admin guide for your organization. This page is for admin users who moderate content, manage users, and keep the platform safe and trustworthy.

---

## Table of Contents

1. [Admin Role Overview](#admin-role-overview)
2. [Access and Permissions](#access-and-permissions)
3. [Admin Dashboard](#admin-dashboard)
4. [Flag Review Workflow](#flag-review-workflow)
5. [User Management Workflow](#user-management-workflow)
6. [Item Moderation Workflow](#item-moderation-workflow)
7. [Reputation Management](#reputation-management)
8. [Safety and Consistency Guidelines](#safety-and-consistency-guidelines)
9. [Escalation and Incident Handling](#escalation-and-incident-handling)
10. [Admin Automation (Paused by Default)](#admin-automation-paused-by-default)
11. [Quick Daily Checklist](#quick-daily-checklist)
12. [FAQ](#faq)

---

## Admin Role Overview

As an admin, your responsibilities are to:

- Review and resolve user-submitted flags
- Moderate item listings and remove harmful content
- Manage user accounts (including bans/unbans when needed)
- Apply fair and documented reputation adjustments
- Keep moderation decisions consistent and auditable

Admins should act with fairness, speed, and clear reasoning. Every meaningful action should be based on evidence and platform policy.

---

## Access and Permissions

### Who can access admin pages?

Only users with `is_admin = true` can access admin routes.

### Admin routes

- `/admin` - dashboard
- `/admin/flags` - flag queue and review actions
- `/admin/users` - user management
- `/admin/items` - item moderation

### Permission behavior

- Non-admin access is blocked by server-side checks
- Unauthorized requests return `401`
- Admin actions are recorded for auditability (for example: reviewed-by, removed-by, banned-by)

---

## Admin Dashboard

Use `/admin` as your starting point each session.

Key metrics:

- **Total Users** - registered accounts
- **Total Items** - all listings
- **Pending Flags** - unresolved reports needing action
- **Banned Users** - currently restricted accounts

Recommended routine:

1. Check pending flags first
2. Review spikes in flagged content or bans
3. Investigate outliers in user activity

---

## Flag Review Workflow

Route: `/admin/flags`

### Status tabs

- **Pending** - needs review
- **Reviewed** - action completed
- **Dismissed** - report determined invalid

### Review process (recommended)

1. Open a pending flag and review:
   - Report reason and reporter notes
   - Flagged item details
   - Poster profile and prior moderation history
2. Decide outcome using evidence:
   - **Dismiss** when report is invalid or insufficient
   - **Remove Item** when listing violates policy
   - **Warn User** for lower-severity violations or first offenses
   - **Ban User** for severe or repeated abuse
3. Add clear review notes:
   - What evidence you used
   - Why action was chosen
   - Any follow-up needed
4. Complete review and verify queue updates correctly

### Decision tips

- Prefer the least severe action that still protects users
- Escalate quickly for scams, harassment, or explicit abuse
- Avoid dismissing reports without brief documentation

---

## User Management Workflow

Route: `/admin/users`

### Core actions

- Search by email or display name
- Review user details and recent activity
- Ban or unban users
- Adjust reputation when justified

### Before banning a user

Check:

- Number and pattern of validated flags
- Severity of the latest violation
- History of warnings or prior actions
- Whether behavior appears malicious or repeated

### Ban guidelines

- Always provide a clear ban reason
- Use bans for repeated or severe violations
- Prefer warnings for low-severity first incidents
- Reassess bans when credible appeals are received

---

## Item Moderation Workflow

Route: `/admin/items`

### Available tools

- Search by title or description
- Filter by type, status, category, and flagged state
- Review full item details and poster context
- Remove or restore items
- Run bulk moderation actions when needed

For a found item collected through the office workflow, record the claimant's name and the configured member reference before completing it. The reference may be optional, depending on `config/organization.json`. Claimant details are restricted to the item's owner and administrators; do not copy them into public notes or item descriptions. The collection name, address, and optional contact details displayed on Help are configured by the operator.

### Remove item checklist

Before removal:

1. Confirm violation with evidence
2. Check if issue can be corrected instead of removed
3. Add a precise removal reason

After removal:

1. Verify item status is updated (`removed`)
2. Confirm moderation metadata is captured
3. Confirm related user impact is appropriate

### Restore item checklist

Restore only when:

- Original removal was incorrect, or
- New context proves no policy violation

Document why restoration was performed.

---

## Reputation Management

Admins can make reputation adjustments to reflect behavior that automatic scoring does not fully capture.

### Ground rules

- Use manual adjustments sparingly
- Keep point values proportional to severity
- Provide a specific reason (not generic text)
- Link adjustments to relevant incidents when possible

### Good adjustment examples

- Repeated low-grade abuse after warning: small negative adjustment
- Clear positive corrective behavior after prior penalty: small positive adjustment
- Serious bad-faith behavior confirmed by evidence: stronger negative adjustment

---

## Safety and Consistency Guidelines

To keep moderation fair across admins:

- Apply the same standards to similar cases
- Base decisions on content and behavior, not personal traits
- Keep notes short but specific
- Avoid over-penalizing single low-risk mistakes
- Escalate high-risk threats immediately

When uncertain, leave clear notes and request a second admin review.

---

## Escalation and Incident Handling

Escalate quickly when reports involve:

- Credible threats to personal safety
- Persistent harassment or stalking patterns
- Financial scams or identity abuse
- Possible legal or local safety issues

Escalation steps:

1. Preserve evidence and links
2. Apply immediate containment action (remove content and/or temporary ban)
3. Notify appropriate internal contacts
4. Record a concise incident summary for follow-up

---

## Admin Automation (Paused by Default)

The admin automation and MCP API are disabled by default. Operators may opt in with `NEXT_PUBLIC_ADMIN_AUTOMATION_ENABLED=true` after reviewing scopes, token storage, rate limits, and audit logs. See the [admin MCP adapter guide](../../mcp/lostopedia-admin/README.md) for client configuration using the deployment's own canonical origin. Never commit a PAT or a local MCP connection file.

For destructive automation, request a dry run, review the response, then use its confirmation token. Ordinary moderation in the admin UI does not require automation.

---

## Quick Daily Checklist

Use this checklist to stay consistent:

1. Review all pending flags
2. Resolve high-severity cases first
3. Scan newly banned users for consistency
4. Review removed items for reason quality
5. Confirm unresolved escalations are handed off

---

## FAQ

### Should I always ban users for flagged content?

No. Use proportional action. Many first-time or low-severity issues should start with warning or item removal rather than immediate ban.

### When should I dismiss a flag?

Dismiss when evidence does not support a policy violation or when a report is clearly invalid. Add a short reason for audit clarity.

### Can I restore removed items?

Yes. Restore when removal was made in error or new evidence shows the content is compliant.

### How detailed should review notes be?

Keep notes concise but specific enough that another admin can understand the decision without redoing the entire investigation.

### How often should admins check `/admin/flags`?

At minimum once daily. During high activity periods, check multiple times per day to keep the queue healthy.

---

*Last Updated: April 5, 2026*
*Version: 1.0 - Initial admin user guide*
