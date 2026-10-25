# Changelog

Notable changes to the public Lostopedia organization template are recorded here.
Template releases are independent of versions and deployments maintained by
organizations using this project.

Entries follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
See [the release guide](docs/releases.md) for version rules and release steps.

## Unreleased

### Added

- Changelog, versioning guidance, and a maintainer release workflow.

## 0.1.0 — Existing public baseline (recorded 2026-10-25)

The template was already publicly available before formal release tracking began.
This entry retains the existing `package.json` version and summarizes the existing
template. **2026-10-25 is the baseline recording date, not the original launch
date.** Earlier release dates have not been reconstructed.

Release: [v0.1.0](https://github.com/S-W-Leong/lostopedia/releases/tag/v0.1.0)
Source: [`ccc36fa`](https://github.com/S-W-Leong/lostopedia/commit/ccc36faa105aa26a43c14a8e3e1538c3fc1c2e13)

### Existing capabilities

- One organization per deployment, with validated configuration for identity, registration domains, location, office pickup, and claimant reference labels.
- Account registration, email verification, login, and password recovery.
- Authenticated item browsing, search, map views, posting, image uploads, and item status management.
- Map markers loaded for the visible viewport, with the map remaining interactive during marker loading.
- Item matching, notifications, reputation, recovery credit, and moderation workflows.
- Fresh-install database migrations, organization setup scripts, Auth email templates, and a separately scheduled expiration function.
- Automated app, fresh-database, and secret-scanning checks.

### Installation and feature availability

- Replace the fictional Example Community configuration before inviting real members.
- Direct messaging and admin automation/MCP are paused by default.
- Images use public storage URLs; configure storage and collection instructions for your organization.
- Included migrations target fresh installations. This baseline does not provide an upgrade path for an existing operational database.
