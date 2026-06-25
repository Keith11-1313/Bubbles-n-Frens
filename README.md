# Bubbles 'n Frens

Bubbles 'n Frens is a desktop point-of-sale and inventory system for a pet store. It is built with Tauri 2, React, TypeScript, Tailwind CSS, and SQLite.

## Features

- Manager and staff login roles
- Product and inventory management
- Low-stock tracking
- Sales/cart checkout workflow
- Recent sales history
- Manager dashboard and reports
- CSV export for sales reports
- Staff inventory update review flow
- Account management for staff and managers
- Configurable keyboard shortcuts
- Local SQLite database storage

## Download

Installers are published on the GitHub Releases page:

https://github.com/Keith11-1313/Bubbles-n-Frens/releases

For Windows, download the latest `.msi` installer from the release assets, then run it.

## Default Login

On first launch, the app creates a default manager account:

```text
Username: admin
Password: admin123
Role: manager
```

Create staff accounts from the manager account after signing in.

## Tech Stack

- Tauri 2
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- SQLite through Tauri SQL plugin
- Rust backend shell through Tauri

## Project Structure

```text
.
|-- src/                  React application source
|-- src-tauri/            Tauri and Rust app configuration
|-- public/               Public static assets
|-- package.json          Node scripts and dependencies
|-- package-lock.json     Locked npm dependency versions
|-- vite.config.ts        Vite configuration
`-- README.md
```

## Requirements For Development

Install these before running the project locally:

- Node.js
- npm
- Rust
- Tauri system dependencies for Windows

Recommended editor setup:

- Visual Studio Code
- Tauri VS Code extension
- rust-analyzer extension

## Install Dependencies

```bash
npm install
```

## Run In Development

```bash
npm run tauri dev
```

This starts the Vite frontend and launches the Tauri desktop app.

## Build Frontend Only

```bash
npm run build
```

The frontend build output is generated in:

```text
dist/
```

## Build Desktop Installer

```bash
npm run tauri build
```

The Windows installer output is generated under:

```text
src-tauri/target/release/bundle/
```

Common release files include:

```text
src-tauri/target/release/bundle/msi/*.msi
src-tauri/target/release/bundle/nsis/*.exe
```

Upload the installer file to a GitHub Release.

## Creating A Release

1. Update the version in `package.json`.
2. Update the version in `src-tauri/tauri.conf.json`.
3. Build the app:

```bash
npm run tauri build
```

4. Commit and push the changes:

```bash
git add .
git commit -m "Release v0.1.0"
git push
```

5. Go to GitHub Releases.
6. Create a tag such as `v0.1.0`.
7. Attach the `.msi` or `.exe` installer from `src-tauri/target/release/bundle/`.
8. Publish the release.

## Scripts

```bash
npm run dev
```

Runs the Vite dev server only.

```bash
npm run build
```

Type-checks and builds the frontend.

```bash
npm run preview
```

Previews the built frontend.

```bash
npm run tauri dev
```

Runs the full desktop app in development.

```bash
npm run tauri build
```

Builds the production desktop app and installer.
