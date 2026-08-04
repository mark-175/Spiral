# Deploying Spiral to marksa.nl

This guide deploys Spiral to your existing Ubuntu VPS as a new subdomain,
`spiral.marksa.nl`, alongside the existing `marksa.nl` (booktracker) site.
It follows the same pattern already used for `marksa.nl`: nginx serves the
static web build directly and reverse-proxies `/api/` to a local Node
process managed by systemd.

## Values used in this guide

Pick your own if you'd rather not use these — just be consistent everywhere
they appear.

| What | Value |
|---|---|
| Subdomain | `spiral.marksa.nl` |
| Deploy path | `/opt/spiral` |
| API local port | `4000` |
| Postgres host port | `5432` (bound to `127.0.0.1` only) |

Before starting, check these ports aren't already in use by booktracker or
anything else:

```bash
sudo ss -tlnp | grep -E ':(4000|5432)\b'
```

If either is taken, pick different numbers (`4001`, `5433`, whatever's
free) — but whichever Postgres port you land on, it has to match in
**two** places: `docker-compose.yml`'s port mapping and
`server/api/.env`'s `DATABASE_URL`. Step 6 builds `DATABASE_URL` from the
`docker-compose.yml` value directly for exactly this reason — don't hardcode
a different number by hand.

## 1. Two things this repo needed fixed before deploying

I already made these changes locally — you just need to pull them in on the
VPS (step 4). Mentioning them here so you know why:

- **`apps/mobile-web/app.json`**: `web.output` was `"static"`, which only
  pre-renders routes with no dynamic segments. This app is built almost
  entirely out of dynamic routes (`/area/[id]`, `/area/[id]/edit`, etc.), so
  none of them would have gotten a real HTML file — direct hits or page
  refreshes on those URLs would 404. Changed to `"single"` (SPA mode), which
  needs nginx's `try_files ... /index.html` fallback (already in the config
  below) so expo-router can handle routing client-side.
- **`docker-compose.yml`**: Postgres's port mapping was `5432:5432`, which
  binds to all interfaces — on a VPS that means Postgres would be reachable
  from the public internet, not just localhost. Changed to
  `127.0.0.1:5432:5432` (this doesn't affect local dev at all).

## 2. DNS

Add an A record (and AAAA if `marksa.nl` has one) for `spiral.marksa.nl`
pointing at the same IP as `marksa.nl`, in whatever DNS provider you used for
the root domain. Wait for it to resolve before continuing:

```bash
dig +short spiral.marksa.nl
```

## 3. Push your local commits

All the work so far is committed locally but not pushed. Push it to
whatever remote you'll clone from on the VPS:

```bash
git push origin main
```

## 4. Get the code onto the VPS

Create a dedicated system account to own the app's files and run the
service under — not `mark`, so a compromise of the app process doesn't get
full access to your account. It's a service account with no login shell and
no relation to the `spiral` Postgres role in `docker-compose.yml` (they just
happen to share a name):

```bash
ssh mark@your-vps
sudo useradd --system --no-create-home --shell /usr/sbin/nologin spiral
```

Clone as yourself for now — `mark` already has working git credentials, and
switching to `spiral` for every command would mean setting those up again
for a service account that doesn't need them. Ownership moves to `spiral`
in step 9, once everything's built:

```bash
sudo mkdir -p /opt/spiral
sudo chown mark:mark /opt/spiral
git clone <your-repo-url> /opt/spiral
cd /opt/spiral
```

(For future updates, this becomes `cd /opt/spiral && git pull` — see
section 13.)

## 5. Install prerequisites (skip anything already installed)

**Node.js 20+** — check with `node -v`. If missing or too old:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Docker + Compose plugin** — check with `docker compose version`. If
missing:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Log out and back in for the group change to take effect.

## 6. Configure environment variables

These `.env` files are gitignored, so they need to be created directly on
the VPS — they won't come from `git pull`.

If the port pre-check above told you `5432` is taken, edit
`docker-compose.yml` now and change `127.0.0.1:5432:5432` to
`127.0.0.1:5433:5432` (or whatever's free) before continuing — everything
below reads the port back out of this file, so you only need to change it
in one place.

**Database password** (root of the repo — docker-compose reads this).
`hex` instead of `base64` on purpose: base64 can produce `/`, `+`, or `=`,
which break a `postgresql://` connection URI if they land in the password:

```bash
cd /opt/spiral
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)" > .env
```

**API config** (`server/api/.env`) — built from the password and port you
just set, so there's nothing to manually copy or keep in sync:

```bash
DB_PASSWORD=$(grep POSTGRES_PASSWORD .env | cut -d= -f2)
DB_PORT=$(grep -oP "(?<=127.0.0.1:)\d+(?=:5432)" docker-compose.yml)
cat > server/api/.env <<EOF
DATABASE_URL="postgresql://spiral:${DB_PASSWORD}@localhost:${DB_PORT}/spiral"
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://spiral.marksa.nl
EOF
cat server/api/.env
```

Check the printed output looks right (real password, no `<placeholder>`
text, port matches `docker-compose.yml`) before moving on.

`CORS_ORIGIN` mostly doesn't matter in this specific setup — nginx proxies
`/api/` under the same domain as the page, so the browser sees same-origin
requests and never consults CORS headers at all. It only actually matters
if `EXPO_PUBLIC_API_URL` or the proxy setup ever points the client at a
different origin than the page itself — cheap to set correctly now.

**Web app config** (`apps/mobile-web/.env`):

```bash
cp apps/mobile-web/.env.example apps/mobile-web/.env
```

Edit it to:

```
EXPO_PUBLIC_API_URL=https://spiral.marksa.nl/api
```

This one matters at *build* time, not runtime — Expo bakes `EXPO_PUBLIC_*`
values into the JS bundle when you run `expo export`. If you ever change the
API URL later, you have to rebuild the web app (step 8), not just restart
something.

## 7. Start Postgres and run migrations

```bash
cd /opt/spiral
docker compose up -d
npm install
npm run --workspace server/api prisma:generate
cd server/api && npx prisma migrate deploy && cd /opt/spiral
```

`migrate deploy` (not `migrate dev`) applies existing migrations
non-interactively — the right command for production, since it never tries
to generate a new migration from scratch.

This includes the `Session` table and `User.passwordHash` from the auth
work — `migrate deploy` picks it up automatically like any other migration,
nothing extra to run. There's no pre-seeded dev user anymore either: the
first account you create through the `/signup` page on the live site is a
real, separate account, the same as anyone else who signs up.

If `migrate deploy` fails with a connection error, Postgres probably hasn't
finished starting up yet — wait a few seconds (`docker compose logs -f
postgres` to watch for "database system is ready to accept connections")
and retry.

## 8. Build both apps

```bash
cd /opt/spiral
npm run --workspace server/api build
cd apps/mobile-web
npx expo export -p web
cd /opt/spiral
```

This produces `server/api/dist/index.js` (the compiled API) and
`apps/mobile-web/dist/` (the static web bundle nginx will serve).

If the VPS is small on RAM, the Metro bundler step can be slow or get
OOM-killed. If that happens, build `apps/mobile-web` on your own machine
instead (same command) and `rsync -av apps/mobile-web/dist/
mark@your-vps:/opt/spiral/apps/mobile-web/dist/` afterward — just make sure
`EXPO_PUBLIC_API_URL` in your local `.env` is set to the production URL
before building, since it's baked in at build time either way.

## 9. Run the API as a systemd service

Hand the directory over to the `spiral` user now that everything's built:

```bash
sudo chown -R spiral:spiral /opt/spiral
```

Find your Node binary's full path — systemd doesn't use your shell's PATH:

```bash
which node
```

Create `/etc/systemd/system/spiral-api.service`:

```ini
[Unit]
Description=Spiral API
After=network.target docker.service

[Service]
Type=simple
User=spiral
WorkingDirectory=/opt/spiral/server/api
EnvironmentFile=/opt/spiral/server/api/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Replace `/usr/bin/node` with the output of `which node` if it's different
(common if Node was installed via nvm — systemd needs the absolute path).

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now spiral-api
sudo systemctl status spiral-api
```

Confirm it's actually up:

```bash
curl http://127.0.0.1:4000/health
# {"status":"ok"}
```

## 10. nginx and SSL

Create `/etc/nginx/sites-available/spiral.marksa.nl`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name spiral.marksa.nl;

    root /opt/spiral/apps/mobile-web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Note the trailing slash on `proxy_pass http://127.0.0.1:4000/;` — that's
what makes nginx strip the `/api/` prefix before forwarding (so
`/api/areas` reaches the API as `/areas`, which is what it actually listens
on). Your booktracker config omits the trailing slash because that API
apparently expects the `/api` prefix itself — Spiral's doesn't, so don't
copy that part verbatim.

Enable the site and let certbot handle HTTPS the same way it did for the
root domain:

```bash
sudo ln -s /etc/nginx/sites-available/spiral.marksa.nl /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d spiral.marksa.nl
```

Certbot will rewrite the file to add the `listen 443 ssl` block and the
`:80 → :443` redirect, the same way it did for `marksa.nl`.

## 11. Verify

```bash
curl https://spiral.marksa.nl/api/health
# {"status":"ok"}
curl -I https://spiral.marksa.nl/
# HTTP/2 200
```

Then open `https://spiral.marksa.nl` in a browser and click through:
dashboard loads (empty state, since the DB is fresh), create an Area, set a
goal, log a daily review, check history, submit a weekly reflection.

## 12. One known limitation, going into this eyes-open

Spiral has no authentication yet (v1 deliberately defers it — see
`CLAUDE.md`). The API always operates as a single seeded user with no login.
Once this is public at `spiral.marksa.nl`, **anyone who finds the URL can
read and write that data** — there's nothing stopping them. Fine for a
personal tool nobody else knows about; worth keeping in mind before sharing
the link, and worth revisiting before this becomes anything more than that.

## 13. Redeploying after future changes

```bash
cd /opt/spiral
git pull
npm install
npm run --workspace server/api prisma:generate
(cd server/api && npx prisma migrate deploy)
npm run --workspace server/api build
cd apps/mobile-web && npx expo export -p web && cd /opt/spiral
sudo chown -R spiral:spiral /opt/spiral
sudo systemctl restart spiral-api
```

nginx doesn't need a restart for content-only changes — it reads
`apps/mobile-web/dist/` fresh on every request. Only restart nginx if you
edited the server block itself.
