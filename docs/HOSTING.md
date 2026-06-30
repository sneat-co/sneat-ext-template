# Hosting the landing site (`landings/`)

The `landings/` directory is a static **Astro** marketing site, deployed to
**Cloudflare** (Workers static assets) at your product's apex domain. It is the
public, crawlable front door; the signed-in Angular app deploys separately and
mounts under a path prefix (`/app/`, or `/pwa/` on `.app` domains).

This follows the Sneat **site-hosting-pattern** — the canonical spec lives in
[`backstage/spec/features/site-hosting-pattern`](https://github.com/sneat-co/backstage/blob/main/spec/features/site-hosting-pattern/README.md).
Reference implementations built from this exact scaffold:
[`surpriseless`](https://github.com/sneat-co/surpriseless/tree/main/landings) and
[`requoter`](https://github.com/sneat-co/requoter/tree/main/landings).

---

## Local development

```sh
cd landings
pnpm install
pnpm dev       # local dev server
pnpm build     # static build -> landings/dist
```

---

## First-time Cloudflare setup

### 1. Prerequisite: the domain must be a zone in the Cloudflare account

The apex domain (e.g. `myproduct.com`) has to already exist as an **active
zone** in the Sneat Cloudflare account (domain registered + nameservers pointing
at Cloudflare). If it isn't, add it in the dashboard first.

### 2. Set your domain in three places

The scaffold ships with `example.com` placeholders. Replace them with your apex:

| File | Field |
|------|-------|
| `landings/astro.config.mjs` | `site: "https://myproduct.com"` |
| `landings/wrangler.jsonc` | the `routes[].pattern` custom-domain entry |
| `landings/public/robots.txt` | the `Sitemap:` line |

The worker `name` in `wrangler.jsonc` is `template` and is renamed to your
extension id by `customize.sh`.

### 3. Attach the apex as a Cloudflare Custom Domain

The worker serves the apex via a Cloudflare **Custom Domain** (Cloudflare
manages a proxied DNS record + TLS cert for it). There are two ways to create
it — **the permission matters** (see [Token scopes](#token-scopes--permissions)):

- **Dashboard (simplest):** Workers & Pages → your worker → **Settings → Domains
  & Routes → Add → Custom Domain** → add your apex. Cloudflare creates the DNS
  record + cert.
- **CLI / API:** `wrangler deploy` will attempt to attach the `custom_domain`
  routes from `wrangler.jsonc` — **but only if the deploy token has
  `Zone:DNS:Edit`.** A plain OAuth / `workers`-only token **cannot** create a
  custom domain (it fails at the `.../domains/records` step). Either run the
  one-time attach in the dashboard, or use a DNS-scoped token.

### 4. Deploy

Locally (once the custom domain exists):

```sh
cd landings
pnpm build
npx wrangler deploy --config wrangler.jsonc
```

Or via CI: the **Deploy landings (Cloudflare)** GitHub Action
(`.github/workflows/deploy-landings.yml`, `workflow_dispatch`). It needs two
repository secrets:

- `CLOUDFLARE_API_TOKEN` — Workers Scripts:Edit (+ Zone:DNS:Edit if you want CI
  to (re)attach custom domains)
- `CLOUDFLARE_ACCOUNT_ID`

Once the secrets exist you can switch the trigger to `push` on `landings/**`.

---

## `www` vs apex — **recommendation: apex-only**

**Default to apex-only (`myproduct.com`, no `www`).** `www` is a legacy
convention; a modern product does not need it, and apex-only is the simplest
correct setup. The scaffold is apex-only out of the box (one custom-domain route,
no `www`).

**Do NOT** make `www` work by adding it as a *second custom domain* — that
serves the same content on two hosts (duplicate content). And **do not** add a
redirect *worker* (`run_worker_first`) — that turns every request, apex included,
into a billed Worker invocation just to handle a few `www` visitors.

### If you do want `www` → use a zone Redirect Rule (301 to apex)

A **Redirect Rule** runs at Cloudflare's edge, before Workers, costs nothing,
and keeps static serving free. Two requirements:

**a) A proxied `www` DNS record must exist.** A Redirect Rule only fires if the
request reaches Cloudflare for that hostname, which needs a **proxied
(orange-cloud)** `www` record. The content is irrelevant — a dummy
`AAAA www 100::` (proxied) is ideal, because the redirect happens at the edge and
no origin is ever contacted. (Add it in the dashboard; creating it needs
`Zone:DNS:Edit`.)

**b) The rule itself.** Dashboard → your zone → **Rules → Redirect Rules →
Create rule**:

- **When incoming requests match:** Hostname `equals` `www.myproduct.com`
- **Then (URL Redirect):**
  - Type = **Dynamic**
  - Expression = `concat("https://myproduct.com", http.request.uri.path)`
  - Status code = **301**
  - **Preserve query string** = **On**

Verify:

```sh
curl -sI https://www.myproduct.com/some/path?x=1 | grep -i location
# -> location: https://myproduct.com/some/path?x=1
```

> Creating Redirect Rules via API needs a token with **Zone → Dynamic Redirect:
> Edit** (the `workers`-only and read-only tokens can't). The dashboard is
> usually the quickest path for a single rule.

Every page also emits `<link rel="canonical">` pointing at the apex (from
`astro.config.mjs`'s `site`), so search engines are told the canonical host
regardless.

---

## Token scopes & permissions

What each action requires — useful when a deploy "partially fails":

| Action | Needs |
|--------|-------|
| Deploy the worker + upload assets | `Workers Scripts:Edit` |
| Attach / create a **Custom Domain** | `Zone:DNS:Edit` (creates the proxied DNS record + cert) |
| Create a `www` placeholder DNS record | `Zone:DNS:Edit` |
| Create a **Redirect Rule** | `Zone → Dynamic Redirect:Edit` |
| Read zones / workers / domains | `Zone:Read`, `Account:Read` |

A plain `wrangler login` OAuth token typically has Workers write + `Zone:Read`
only — enough to **deploy the worker**, but **not** to create custom domains,
DNS records, or redirect rules. Do those one-time, zone-level steps in the
dashboard (or with a purpose-scoped API token).

---

## Topology recap

- **Landing (this `landings/`)** = Astro static build, served as Cloudflare
  Workers static assets, owns the apex `/`.
- **App** = the Angular SPA in `apps/<id>-app`, deployed separately, mounted
  under `/app/` (or `/pwa/` on `.app` domains).
- **One zone, two deployments**, most-specific-route-wins. The landing and app
  are intentionally independent — see the
  [site-hosting-pattern spec](https://github.com/sneat-co/backstage/blob/main/spec/features/site-hosting-pattern/README.md).
