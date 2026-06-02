# Edura Data Flows

This document defines where each type of Edura data lives, how it reaches the UI, and which files are safe to change during frontend work.

## Core Principle

Edura currently has three different persistence layers:

1. Repository JSON files for curated public data.
2. Google Sheets through Apps Script for user submissions and approvals.
3. Browser localStorage for personal user state.

These layers should stay separate unless there is a deliberate migration plan.

## Public Jobs

Source of truth:
- `data/jobs-public.json`

Used by:
- `index.html`
- `chat-engine.js`
- `publish-job.html` social proof counters

Loaded through:
- `assets/js/config.js`
- `assets/js/data-loader.js`

Notes:
- This file contains the approved scraped/curated jobs.
- Frontend work should read this file but not edit it directly.
- Data pipeline changes belong to Meytal's data layer.

## Submitted Jobs

Source of truth:
- Google Sheet tab: `posted_jobs`
- Apps Script file: `submissions-apps-script.gs`

Submission entrypoint:
- `publish-job.html`
- action: `submit_job`

Approval flow:
- New submission is saved with a generated `JOB-*` ref id.
- Meytal receives an approval email.
- Approval link calls Apps Script with `action=approve&type=job`.
- Approved rows become visible through `?action=approved`.

Used by:
- `index.html`
- `chat-engine.js`

Notes:
- Submitted jobs are not written into `data/jobs-public.json`.
- The site merges approved submitted jobs with `jobs-public.json` at runtime.

## Public Teachers

Source of truth:
- `data/teachers-public.json`

Used by:
- `teachers.html`
- `chat-engine.js`
- `publish-job.html` social proof counters

Loaded through:
- `assets/js/config.js`
- `assets/js/data-loader.js`

Notes:
- Old references to `data/teachers.json` should not be reintroduced.

## Submitted Teachers

Source of truth:
- Google Sheet tab: `posted_teachers`
- Apps Script file: `submissions-apps-script.gs`

Submission entrypoint:
- `publish-job.html`
- action: `submit_teacher`

Approval flow:
- New submission is saved with a generated `TCH-*` ref id.
- Meytal receives an approval email.
- Approval link calls Apps Script with `action=approve&type=teacher`.
- Approved rows become visible through `?action=approved`.

Used by:
- `teachers.html`
- `chat-engine.js`

## Saved Jobs

Source of truth:
- Browser `localStorage`

Used by:
- `saved.html`
- `chat-engine.js`

Notes:
- Saved jobs are personal to the current browser.
- They are not server-side records and do not sync between devices.

## Alerts And Principal Updates

Source of truth:
- Google Sheet tabs: `alerts`, `principal_alerts`
- Apps Script file: `submissions-apps-script.gs`

Entrypoints:
- `saved.html`
- `manager-tenders.html`

Config:
- Apps Script URL is centralized in `assets/js/config.js`.

## Frontend Config Contract

All frontend pages should use:

- `window.EduraConfig` for URLs.
- `window.EduraData` for JSON/API reads.

Current shared files:

- `assets/js/config.js`
- `assets/js/data-loader.js`

Avoid:

- Hardcoding Apps Script URLs inside page scripts.
- Reintroducing references to missing files such as `data/jobs.json`, `data/teachers.json`, or `data/fb-teachers.json`.

## Safe Frontend Work

Safe to change:

- HTML layout and visual structure.
- CSS and extracted CSS files.
- UI behavior that does not change data contracts.
- Shared frontend helpers under `assets/js/`.

Needs caution:

- `submissions-apps-script.gs`
- `chat-engine.js`
- `matching.js`
- files under `data/`
- `staging.html`

## Next Architecture Steps

1. Extract shared design tokens into `assets/css/tokens.css`.
2. Extract global reset/base styles into `assets/css/base.css`.
3. Extract repeated layout elements into shared CSS and small UI helpers.
4. Keep page-specific behavior in page-specific files only after the shared foundation is stable.
