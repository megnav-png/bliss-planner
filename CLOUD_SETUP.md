# Cloud execution setup (outside local machine)

You can run the Phase 6 pilot on a cloud host with this project instead of your local Mac.

## Option A — GitHub Codespaces (recommended)

1. Open the repo in Codespaces.
2. Open the terminal and run:

```bash
cd "/workspaces/<repo-name>"
git pull
npm ci
npm run phase6:pilot:cloud
```

3. The script starts Next on `0.0.0.0:3002`, runs the pilot against `127.0.0.1:3002`, and prints a report path.

If Playwright browsers are not available yet:

```bash
npx playwright install chromium
npm run phase6:pilot:cloud
```

## Option B — Generic cloud VM (Ubuntu / Debian)

```bash
sudo apt-get update
sudo apt-get install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
git clone <your-repo-url> "/tmp/wovops"
cd "/tmp/wovops"
npm ci
npm run phase6:pilot:cloud
```

For headless browser reliability:

```bash
npx playwright install chromium
```

## Option C — Docker one-shot run

From repo root:

```bash
docker build -f Dockerfile.cloud -t wovops-phase6:latest .
docker run --rm -p 3002:3002 wovops-phase6:latest
```

Equivalent compose form:

```bash
APP_PORT=3002 docker-compose -f docker-compose.cloud.yml up --build --abort-on-container-exit
```

## Output locations

- Pilot report: temp file path printed as:
  - `Phase 6 pilot report: /tmp/wovops-phase6-pilot-<timestamp>.json`
- Dev log: `/tmp/wovops-dev.log`
- Pilot log: `/tmp/wovops-phase6-cloud-pilot.log` (cloud script)
- In docker-compose, mount `./tmp` to keep both logs under repository `tmp/` after run.

## Why this helps

- Avoids local sandbox/IPv6/port collisions.
- Keeps the same codebase and automation unchanged.
- Gives reproducible environments for repeated pilot runs and team reviews.

## Option D — GitHub Actions (truly external runner)

The repository includes a manual workflow at `.github/workflows/phase6-cloud-pilot.yml`.

Trigger it in GitHub → Actions → `phase6-cloud-pilot` → Run workflow.
Artifacts are uploaded with report and logs.

## Option E — External host with manual command block (skip local start)

Use this exact block when the local machine blocks loopback sockets or browser automation:

```bash
APP_HOST=0.0.0.0 \
APP_PORT=3002 \
WOVOPS_APP_URL=http://127.0.0.1:3002 \
WOVOPS_SKIP_LOCAL_START=true \
WOVOPS_PILOT_SKIP_IPV6=true \
WOVOPS_PILOT_SKIP_PRECHECK=true \
WOVOPS_PILOT_ALLOW_HOST_ALIASES=false \
WOVOPS_PILOT_FORCE_IPV4_LOOPBACK=true \
npm run phase6:pilot:cloud
```

Useful when:

- Next.js can’t bind sockets on your desktop.
- Browser automation in this sandbox returns `Permission denied (1100)` in Chromium logs.
- You want to run the same test from another machine (or CI) and keep your local machine as pure code-edit workspace.

Important: if you keep `WOVOPS_SKIP_LOCAL_START=true`, make sure the app is already running at `WOVOPS_APP_URL` before running the command.

For that external runner, a minimal pattern is:

```bash
cd "/path/to/wovops/repo"
npm ci
npm run dev -- --hostname 0.0.0.0 --port 3002
```

Then from a separate terminal on that same runner:

```bash
WOVOPS_APP_URL=http://127.0.0.1:3002 WOVOPS_SKIP_LOCAL_START=true npm run phase6:pilot:cloud
```
