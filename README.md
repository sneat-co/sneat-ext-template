# sneat-ext-template

Starter implementation repository for a Sneat extension. It contains an Nx
workspace, Angular/Ionic app, and one host-facing runtime package.

## Repository model

- `<id>` owns the implementation app and `@sneat/extension-<id>` runtime.
- `ext-<id>` owns the public `@sneat/extension-<id>-contract` package.

The implementation never copies contract source. It consumes the published
contract package just as another extension would.

## Layout

```text
apps/
  template-app/        # Ionic composition root
  template-app-e2e/    # Playwright harness
libs/extensions/template/
  runtime/             # @sneat/extension-template
landings/               # Astro marketing site (see landings/README.md)
backend/                # Go domain module (see backend/README.md)
```

The corresponding [`sneat-ext-contract-template`](../sneat-ext-contract-template)
repository owns
`@sneat/extension-template-contract`.

## Backend

`backend/` is a Go domain module (`github.com/sneat-co/template/backend`) built
to the org's
[ports-and-adapters standard](https://github.com/sneat-co/sneat-specs/blob/main/standards/extension-backend-architecture.md):
it depends on `dal-go/dalgo` only — never `sneat-go-core`, `sneat-core-modules`,
or another extension's backend — and expresses platform/cross-extension needs
as ports, satisfied by adapters in the host composition root (`sneat-go`). See
[`backend/README.md`](backend/README.md).

CI (`.github/workflows/backend-ci.yml`) runs lint/test/build on every push and
PR touching `backend/**`, and auto-tags the next `backend/vX.Y.Z` release on
push to `main`.

This is distinct from `ext-<id>`'s own `backend/` (the **contract** module —
`dto4<id>` types, briefs, facade interfaces). This one is the
**implementation** — DBOs, storage, facade bodies.

## Runtime API

The runtime package is deliberately an application-integration surface. Its
root entry point exports provider functions and route arrays only. It does not
export concrete services, pages, or components for other extension libraries to
consume.

```ts
import { provideTemplate, templateSpaceRoutes } from '@sneat/extension-template';

bootstrapApplication(App, {
  providers: [...provideTemplate(), provideRouter(templateSpaceRoutes)],
});
```

Extension libraries use contract tokens; only the app composition root imports a
different extension's runtime package. Reusable components deserve a separate
`@sneat/extension-<id>-ui` package only when another extension needs them.

## Create a new extension

Clone this repository as `<id>`, rename `template` with `./customize.sh <id>`,
and create a paired `ext-<id>` repository from `sneat-ext-contract-template`. Publish the
contract first, update the implementation's dependency range, then build:

```sh
pnpm install
pnpm exec nx run-many -t lint test build
(cd backend && go build ./... && go test ./...)
```

See the [extension standards](https://github.com/sneat-co/sneat-libs/tree/main/docs/extension-standards)
for dependency rules and release sequencing.
