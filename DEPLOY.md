# Deploying the portal to GitHub Pages

The portal is static HTML/CSS/JS — **no build step**, no server-side anything. Pages is the right tool.

Heads-up: the szmgr repo you cloned (`holubond/szmgr`) isn't yours, so you can't push to it directly. Pick one of the paths below.

---

## Path A — New repo, portal at root (recommended, ~2 minutes)

The simplest setup. Files served straight from the default branch root.

### 1. Create an empty GitHub repo

On github.com → **New repository** → name it e.g. `szmgr-portal` → **Public** (Pages needs public for free accounts) → don't add a README. Note the URL: `https://github.com/<you>/szmgr-portal.git`.

### 2. Push the portal directory as a new repo

From PowerShell, in `C:\Users\Andrej\Desktop\statnice\szmgr\portal`:

```powershell
cd C:\Users\Andrej\Desktop\statnice\szmgr\portal
git init -b main
git add .
git commit -m "Initial portal"
git remote add origin https://github.com/<you>/szmgr-portal.git
git push -u origin main
```

### 3. Enable Pages

GitHub repo → **Settings** → **Pages** → **Source: Deploy from a branch** → **Branch: main, folder: / (root)** → **Save**.

After ~30 seconds your portal is live at:

```
https://<you>.github.io/szmgr-portal/
```

Every `git push` to `main` redeploys.

---

## Path B — Fork the original szmgr repo, keep portal as a subdirectory

If you want to keep the connection to the original szmgr notes (and contribute back later), fork it and serve the `portal/` subfolder via GitHub Actions.

### 1. Fork on GitHub

On `https://github.com/holubond/szmgr` → click **Fork** → fork to your account.

### 2. Re-point your local remote

```powershell
cd C:\Users\Andrej\Desktop\statnice\szmgr
git remote set-url origin https://github.com/<you>/szmgr.git
```

### 3. Add the workflow

The file `.github/workflows/pages.yml` in this repo (committed alongside this README — see the project root) already deploys `portal/` on every push. Stage and commit:

```powershell
git add portal/ .github/workflows/pages.yml
git commit -m "Add learning portal + Pages workflow"
git push origin main
```

### 4. Enable Pages

GitHub repo → **Settings** → **Pages** → **Source: GitHub Actions** (not "Deploy from branch"). Save.

The Actions tab will show the first deploy running. Once green, your portal is at:

```
https://<you>.github.io/szmgr/
```

---

## What about `.claude/`?

The `.claude/launch.json` is for the local dev server and contains an absolute Windows path. **Don't commit it.** Add a `.gitignore` if you went with Path B:

```
# .gitignore
.claude/
```

(Path A doesn't have this problem since `.claude/` isn't inside `portal/`.)

---

## Hardening checklist (optional but quick)

Before sharing the URL:

- [ ] **Skim each page once** for anything personal — names, emails, internal URLs. The portal is now public to the entire internet.
- [ ] **Check the footnotes** — each page links back to source `.md` files with `../` paths. On a published Pages site those links will 404. That's fine (the source repo lives elsewhere); just don't be surprised.
- [ ] **Add a robots.txt** if you don't want Google indexing it. Drop `User-agent: *` / `Disallow: /` into `portal/robots.txt`.
- [ ] **Don't put PDFs from `materialy/` into the portal directory** — the lecture slides may be copyrighted by the lecturer / faculty. The portal's *quotations* are within fair-use territory; whole-PDF redistribution is not.

---

## Custom domain (skip unless you care)

GitHub Pages → Settings → Pages → Custom domain → add `portal.your-domain.com`. Add a CNAME at your DNS provider pointing to `<you>.github.io`. Enable "Enforce HTTPS" once the cert provisions.
