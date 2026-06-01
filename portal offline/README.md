# Ministry of Education — Fees Approval System (Offline Windows App)

This is a **fully offline** desktop application for the Zimbabwean Ministry of Primary and Secondary Education's accounts department.
All data — user accounts, fee approval requests, comments, and uploaded supporting documents — is stored locally in an embedded SQLite database on the user's PC. **No internet connection is required to run it.**

## Roles & workflow

1. **School** — submits new fee approval requests (with optional supporting documents).
2. **Chief Accountant (Revenue)** — first-level review.
3. **Director** — second-level review.
4. **Permanent Secretary** — final approval.

Any role can reject a request with a written reason.

## Tech stack

- **UI:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- **Database:** Embedded SQLite via `sql.js` (WebAssembly). The database file lives inside the app's local IndexedDB store (kept inside the Electron user-data folder on Windows).
- **Authentication:** Local accounts with bcrypt-hashed passwords stored in the same SQLite database.
- **Desktop shell:** Electron + `electron-packager`.

There is **no remote server, no cloud, no internet calls.** The whole system runs from a single `.exe`.

---

## Building the installable Windows .exe

You need a computer with **Node.js 18+** installed to do the one-time packaging.
After it's built, the resulting folder can be copied to any Windows PC — no Node.js needed there.

### 1. Get the code

Export this project to GitHub from Lovable, then on your build machine:

```bash
git clone <your-repo-url>
cd <your-repo-folder>
npm install
```

### 2. Install Electron tooling (one-time)

```bash
npm install --save-dev electron @electron/packager
```

### 3. Test it on your machine (optional)

```bash
npm run electron:dev
```

A desktop window should open with the app.

### 4. Build the Windows package

```bash
npm run electron:pack:win
```

This produces a folder:

```
electron-release/MoE-Fees-Approval-win32-x64/
```

Inside it there is **`MoE-Fees-Approval.exe`** — double-click it to launch the app.

### 5. Distribute

Zip the entire `MoE-Fees-Approval-win32-x64` folder and copy it to any Windows PC.
Users extract it and run the `.exe` — no installation, no internet, no setup.

> Note: cross-compiling Windows builds from Linux/macOS works, but `npm run electron:pack:win` is most reliable when run **on Windows**.

---

## First-time use

1. Launch the `.exe`.
2. Click **Sign Up** and create the **first administrator account** (e.g. the Permanent Secretary).
3. Create accounts for every other role the same way.
4. Schools log in and start submitting requests.

All data lives on the PC where the app is installed.
Because each installation is fully isolated, the multi-role workflow only makes sense if **all four roles use the same computer** (e.g. a shared office workstation). If different roles need to work from different PCs, you'd need the networked version instead.
