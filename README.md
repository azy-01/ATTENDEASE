# ATTENDEASE

ATTENDEASE is an Angular-based attendance management app with separate instructor and student experiences, powered by a mock API for local development.

## Tech Stack

- Angular 21 (standalone components + router)
- TypeScript
- JSON Server (mock backend via `db.json`)
- SweetAlert2 and QR code utilities

## Prerequisites

- Node.js 20+
- npm 11+

## Getting Started

Install dependencies:

```bash
npm install
```

Run frontend and mock API together:

```bash
npm run dev
```

This starts:

- Angular app at `http://localhost:4200`
- JSON Server API at `http://localhost:3000`

If you only need one service:

```bash
npm run start   # Angular only
npm run api     # Mock API only
```

## Available Scripts

- `npm run dev` - Runs Angular and JSON Server concurrently
- `npm run start` - Runs Angular dev server
- `npm run api` - Runs JSON Server using `db.json`
- `npm run build` - Creates production build in `dist/`
- `npm run watch` - Development build in watch mode
- `npm run test` - Runs unit tests

## App Routes

Main route groups:

- `/` - Landing page
- `/instructor/*` - Instructor dashboard pages (`overview`, `attendance`, `records`, `students`, `classes`, `schedules`, `reports`, `settings`)
- `/student/*` - Student dashboard pages (`overview`, `schedule`, `attendance`, `qr-code`, `settings`)

## Project Notes

- Mock data is stored in `db.json`.
- This project uses standalone Angular components rather than NgModules.

## Account email notifications (EmailJS)

Signup, approval, rejection, and archive emails are sent from the browser via [EmailJS](https://www.emailjs.com/). Configure credentials in `src/environments/environment.ts` under `accountEmail`.

**EmailJS template requirements** (template `template_xdnxlzw` or your replacement):

- **Subject:** `{{subject}}`
- **Body:** greeting (`Hi {{user_name}},`) + `{{message}}`
- **Reason (reject/archive only):** `Reason: {{reason}}` — leave this line out if you prefer a single body block; approval/signup emails send an empty `reason`
- **To:** `{{to_email}}`

Optional environment fields:

- `accountEmail.appUrl` — login link included in approval emails (default `http://localhost:4200`)
- `accountEmail.adminNotifyEmails` — Gmail addresses for new-registration admin alerts (must be `@gmail.com`; leave `[]` to skip)

See [docs/signup-email-notification-plan.md](docs/signup-email-notification-plan.md) for the full lifecycle and test matrix.

## Angular CLI

This project uses Angular CLI `21.2.7`.

Useful command reference:

- [Angular CLI Overview](https://angular.dev/tools/cli)
