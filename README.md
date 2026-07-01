# sneat-ext-template

A template for starting a new **Sneat frontend extension** — an Nx workspace
with an Angular + Ionic app that mounts a Sneat extension (the
`contract` / `internal` / `shared` library triad) on the standard Sneat app
shell (auth, spaces, UI).

It is the frontend counterpart to [`sneat-mod-template`](https://github.com/sneat-co/sneat-mod-template)
(which scaffolds the Go module/backend).

## Stack

- **Nx** workspace (`@nx/angular` 22)
- **Angular 21** + **Ionic 8**
- **Firebase** auth via the shared Sneat platform packages (`@sneat/app`,
  `@sneat/auth-ui`, …)
- **Vitest** unit tests, **Playwright** e2e

## Layout

```
apps/
  template-app/        # the Ionic app (composition root)
  template-app-e2e/    # Playwright e2e
libs/extensions/template/
  contract/            # @sneat/extension-template-contract  — tokens & DTOs
  internal/            # @sneat/extension-template-internal   — service impls + provideTemplateInternal()
  shared/              # @sneat/extension-template-shared     — pages/components
landings/              # static Astro marketing site (the public apex) — see docs/HOSTING.md
```

## Wiring extension services (DI)

Consumers depend only on **`contract`** tokens; the **`internal`** lib binds those
tokens to implementations. There are two places to bind, and the choice matters
for startup cost. Full rationale in the
[frontend-apps standard](https://github.com/sneat-co/sneat-libs/blob/main/docs/extension-standards/frontend-apps.md).

**1. Root register function — `provideTemplateInternal()` (default).** One function
binds **every** always-on contract token; the app calls it once at bootstrap
(`apps/template-app/src/main.ts`). Single wiring call, single audit site, no
unbound-token crashes.

```ts
// libs/extensions/template/internal/src/lib/provide-template-internal.ts
export function provideTemplateInternal(): Provider[] {
  return [ListService, { provide: TEMPLATE_SERVICE, useExisting: ListService }];
}
```

**2. Lazy, route-scoped providers (for heavy, route-only capabilities).** When a
capability is reached on **one route** and drags in a **heavy or cross-extension
dependency** (e.g. a sibling extension's service that is *not* `providedIn:'root'`),
do **not** bind it at root — a user who never opens that route would pay for it.
Ship a route bundle whose `providers` create a child injector, so those services
load **only when the route activates**. `internal` may import `shared`, so the
route can lazy-load the shared page while the page still injects only the token:

```ts
// libs/extensions/template/internal/src/lib/provide-template-<feature>.ts
export function provideTemplate<Feature>(): Provider[] {
  return [
    HeavyDep,                                       // not providedIn:'root'
    <Feature>Service,
    { provide: <FEATURE>_SERVICE, useExisting: <Feature>Service },
  ];
}

export const template<Feature>Routes: Route[] = [
  {
    path: '<feature>/:id',
    providers: [...provideTemplate<Feature>()],     // route-scoped, lazy
    loadComponent: () =>
      import('@sneat/extension-template-shared').then((m) => m.<Feature>PageComponent),
  },
];
```

The host mounts `...template<Feature>Routes` under its space shell; the same export
serves both `template-app` and the main Sneat app. Rule of thumb: **bind in
`provideTemplateInternal()` by default; move a binding to a route-scoped bundle
when it is used on one route only *and* pulls in a heavy/cross-extension dep.**

## Create a new extension

Clone this template into your target repo, then run the rename script with your
extension id (a single lowercase token):

```sh
./customize.sh gameboard
pnpm install                       # reconcile the renamed workspace packages
pnpm exec nx build gameboard-app   # verify
```

`customize.sh` renames `template → <id>` across the workspace (app, libs,
package names, symbols, selectors, `appId`/title) **without** corrupting Angular
keywords like `templateUrl`, inline `template:`, or `<ng-template>`. It removes
itself when done.

## Develop

```sh
pnpm install
pnpm exec nx serve template-app          # dev server
pnpm exec nx build template-app          # production build -> dist/apps/template-app/browser
pnpm exec nx run-many -t lint test build
```

## Landing site (`landings/`)

A static **Astro** marketing site that owns the public apex domain, deployed to
Cloudflare separately from the app (the **site-hosting-pattern**: landing at `/`,
app under `/app/`). The scaffold is apex-only by default with `example.com`
placeholders.

```sh
cd landings && pnpm install && pnpm dev
```

**Read [`docs/HOSTING.md`](docs/HOSTING.md) before deploying** — it covers custom
domains, the apex-only recommendation, how to add a `www → apex` redirect (a zone
Redirect Rule, *not* a worker), and the exact Cloudflare token scopes each step
needs. Reference implementations: `surpriseless` and `requoter`.

## Notes

- The app's `appId` is cast `as SneatApp` because the placeholder id isn't in
  `@sneat/core`'s `SneatApp` union. Once your id is registered (or `SneatApp`
  accepts any string), the cast can be dropped.
- Dependency updates are managed by Renovate via `.github/renovate.json`
  (`extends: github>sneat-co/sneat-renovate-nx`).

## Standards

This is a **Sneat extension** — build it against the shared platform standards:

- **[Sneat extension standards](https://github.com/sneat-co/sneat-libs/blob/main/docs/extension-standards/README.md)** — backend wiring, frontend apps, and UX conventions.
- **[Frontend UX standards](https://github.com/sneat-co/sneat-specs/blob/main/standards/frontend-ux/README.md)** — cards, buttons, lists, page layout, forms, modals, and loading/empty/error states.
- **[Screen flows & the UI component checklist](https://github.com/sneat-co/sneat-specs/blob/main/standards/frontend-ux/flows.md)** — read **before** building any form, page, or wizard: it covers how screens connect (entry → action → exit) so they don't end up orphaned.
