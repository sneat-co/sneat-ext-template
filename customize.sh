#!/usr/bin/env bash
#
# customize.sh — turn this template into a concrete Sneat extension product/app repo.
#
# Usage:
#   ./customize.sh <extension-id>          # e.g. ./customize.sh gameboard
#
# Renames the placeholder `template` extension to <extension-id> across the
# whole Nx workspace: the app (template-app -> <id>-app), the implementation repo
# lib triad (libs/extensions/template -> libs/extensions/<id>, Nx project names,
# @sneat/extension-template-* -> @sneat/extension-<id>-*), symbols
# (provideTemplateInternal, TemplateHomePage, TEMPLATE_SERVICE, ...), the appId
# and titles. It does NOT touch pnpm-lock.yaml — run `pnpm install` afterwards
# so pnpm reconciles the renamed workspace packages.
#
# This script customizes the <id> product/app repo. If the extension needs a
# public definition repo, create ext-<id> separately with typespec/, backend/,
# and frontend/. The local contract lib is a starter surface that can graduate to
# ext-<id>/frontend.
#
# The replacement is intentionally TARGETED (not a blind s/template/<id>/g) so
# it never corrupts Angular keywords like `templateUrl`, inline `template:`, or
# `<ng-template>`.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: ./customize.sh <extension-id>   (lowercase letters/digits, e.g. gameboard)" >&2
  exit 2
fi

id="$1"
if [[ ! "$id" =~ ^[a-z][a-z0-9]*$ ]]; then
  echo "error: <extension-id> must be a single lowercase token [a-z][a-z0-9]* (got '$id')" >&2
  exit 2
fi
if [[ ! -d apps/template-app ]]; then
  echo "error: run this from the template repo root (apps/template-app not found)" >&2
  exit 1
fi

# Case variants.
Id="$(printf '%s' "$id" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"  # gameboard -> Gameboard
UP="$(printf '%s' "$id" | tr '[:lower:]' '[:upper:]')"                            # gameboard -> GAMEBOARD

echo "Customizing template -> '$id' (Id=$Id, UP=$UP)"

# Preserved-directory guards. When customize.sh is run for an in-place
# re-scaffold of an existing extension repo, that repo may carry preserved
# copies of prior work (e.g. `legacy-frontend/` from a `git mv`, a Go `backend/`
# module). Those are NOT the template and must never be renamed/rewritten.
# (Fable: added after the budgetus re-scaffold corrupted legacy-frontend files.)

# --- 1. Rename directories containing 'template' (deepest first) ---
find . -depth -type d -name '*template*' \
  -not -path './node_modules/*' -not -path './.git/*' \
  -not -path './dist/*' -not -path './.nx/*' -not -path './.angular/*' \
  -not -path './legacy-*/*' -not -path './backend/*' |
  while read -r d; do
    nd="$(dirname "$d")/$(basename "$d" | sed "s/template/$id/g")"
    mv "$d" "$nd"
  done

# --- 2. Rename files whose names contain 'template' ---
find . -type f -name '*template*' \
  -not -path './node_modules/*' -not -path './.git/*' \
  -not -path './dist/*' -not -path './.nx/*' -not -path './.angular/*' \
  -not -path './legacy-*/*' -not -path './backend/*' |
  while read -r f; do
    nf="$(dirname "$f")/$(basename "$f" | sed "s/template/$id/g")"
    mv "$f" "$nf"
  done

# --- 3. Targeted content replacement across text files (NOT the lockfile) ---
grep -rIl -E "template[-/]|templateApp|template[A-Z]|'template'|\"template\"|scope:template|Template|TEMPLATE" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  --exclude-dir=.nx --exclude-dir=.angular \
  --exclude-dir='legacy-*' --exclude-dir=backend --exclude=pnpm-lock.yaml |
  while read -r f; do
    # Protect the CSS Grid `grid-template[-columns|-rows|-areas]` keyword from
    # the `template-` rule below (used by the landings/ stylesheet), then
    # restore it. Without this, `grid-template-columns` -> `grid-<id>-columns`.
    # camelCase identifiers the template exports with a lowercase `template`
    # prefix (e.g. `templateRoutes`, `templateSpaceRoutes`, `templateDbo`).
    # These have no `-`/`/`/quote delimiter so the rules below miss them; list
    # them EXPLICITLY rather than a blind `template[A-Z]` rule, which would
    # corrupt Angular keywords (`templateUrl`, `templateRef`, ...).
    # (Fable: added after the budgetus scaffold left these symbols un-renamed.)
    sed -i '' \
      -e "s/grid-template/@@GRIDTPL@@/g" \
      -e "s/templateRoutes/${id}Routes/g" \
      -e "s/templateSpaceRoutes/${id}SpaceRoutes/g" \
      -e "s/templateDbo/${id}Dbo/g" \
      -e "s|template/|$id/|g" \
      -e "s/template-/$id-/g" \
      -e "s/templateApp/${id}App/g" \
      -e "s/'template'/'$id'/g" \
      -e "s/\"template\"/\"$id\"/g" \
      -e "s/scope:template/scope:$id/g" \
      -e "s/TEMPLATE/$UP/g" \
      -e "s/Template/$Id/g" \
      -e "s/@@GRIDTPL@@/grid-template/g" \
      "$f"
  done

# --- 4. Clean up ---
rm -f customize.sh

echo
echo "Done. Next:"
echo "  pnpm install            # reconcile renamed workspace packages"
echo "  pnpm exec nx build ${id}-app"
echo
echo "Repo convention:"
echo "  ${id}      # product/app/implementation repo customized here"
echo "  ext-${id}  # public extension-definition repo (typespec/, backend/, frontend/) if needed"
