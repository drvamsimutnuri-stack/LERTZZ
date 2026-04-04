# PULMOVOX

Research utilities for sleep-related tooling. This repository is **not** affiliated with any other project.

## Hypoxic burden calculator

Static HTML: open [`hypoxic_burden_calculator.html`](hypoxic_burden_calculator.html) in a browser, or host it (e.g. GitHub Pages) for a shareable URL.

### Publish on a new GitHub repository

1. On GitHub, create a **new empty** repository (any name you like, e.g. `PULMOVOX`). Do **not** add a README/license if you already have commits locally.
2. In this folder, point `origin` at the new repo and push:

```bash
git remote add origin https://github.com/YOUR_USER/YOUR_NEW_REPO.git
git branch -M main
git push -u origin main
```

If this folder still had an old `origin` from another repo, remove it first:

```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USER/YOUR_NEW_REPO.git
git push -u origin main
```

### GitHub Pages link

After the first push, enable Pages: **Repository → Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, Folder: `/ (root)`**.

Your calculator will be at:

`https://YOUR_USER.github.io/YOUR_NEW_REPO/hypoxic_burden_calculator.html`

Replace `YOUR_USER` and `YOUR_NEW_REPO` with your GitHub username and repository name.
