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
```

The corresponding [`sneat-ext-contract-template`](../sneat-ext-contract-template)
repository owns
`@sneat/extension-template-contract`.

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
```

See the [extension standards](https://github.com/sneat-co/sneat-libs/tree/main/docs/extension-standards)
for dependency rules and release sequencing.
