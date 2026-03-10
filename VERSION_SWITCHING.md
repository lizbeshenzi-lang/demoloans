# Demo Credit Limited - Version Switching Guide

This repository contains multiple branded versions of the loan management application. Use the commands below to switch between versions even when changing IDEs or environments.

## Available Versions

### 1. Demo Credit Limited (Current/Final)
- **Purpose**: Demo/Presentation version
- **Branding**: "Demo Credit Limited"
- **Features**: Impact stats in hero, generic branding
- **Command**: `git checkout demo-rebrand`

### 2. Mular Credit
- **Purpose**: Mular Credit company branding
- **Branding**: "Mular Credit" with green/blue theme
- **Features**: Company-specific messaging
- **Command**: `git checkout rebrand && git reset --hard 1104179`

### 3. Kechita Capital (Original)
- **Purpose**: Original Kechita Capital branding
- **Branding**: "Kechita Capital" with blue/navy theme
- **Features**: Original company messaging
- **Command**: `git checkout rebrand && git reset --hard HEAD~3`

## Quick Switch Commands

```bash
# Switch to Demo Credit Limited (recommended for demos)
git checkout demo-rebrand

# Switch to Mular Credit
git checkout rebrand
git reset --hard 1104179

# Switch to Original Kechita
git checkout rebrand
git reset --hard HEAD~3

# After switching, install dependencies and run
npm install
npm run dev
```

## Branch Structure

- `demo-rebrand`: Final demo version with "Demo Credit Limited" branding
- `rebrand`: Contains both Mular and Kechita versions
  - Commit `1104179`: Mular Credit branding
  - Commit `HEAD~3`: Original Kechita branding

## Running the App

After switching versions:
1. `npm install` (if dependencies changed)
2. `npm run dev`
3. Open http://localhost:8080/

## Login Credentials (for all versions)

- **CEO**: `ceo@kechita.test` / `Kechita2026!`
- **GM**: `gm@kechita.test` / `Kechita2026!`
- **Regional Managers**: `rm.[region]@kechita.test` / `Kechita2026!`
- **Branch Managers**: `bm.[branch]@kechita.test` / `Kechita2026!`
- **Loan Officers**: `lo.[branch]1@kechita.test` / `Kechita2026!`

## Notes

- The seed data remains the same across all versions
- Logo file is `kechita-logo.jpg` (shared across versions)
- Database is remote Supabase (pverddjqxfuighwdmmzr)
- All versions are fully functional</content>
<parameter name="filePath">d:\kechita-growth-hub-main\VERSION_SWITCHING.md