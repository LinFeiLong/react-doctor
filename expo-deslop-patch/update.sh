#!/usr/bin/env bash
#
# update.sh — met à jour le fork @linfeilong/react-doctor (react-doctor + le
# correctif des faux positifs plugins Expo, cf. expo-deslop-patch/README.md).
#
# À lancer quand tu veux vérifier/suivre une nouvelle version de react-doctor.
# Il : (1) compare la version upstream à celle de ton fork publié, (2) si l'upstream
# est plus récent, rebuild les 4 packages depuis le source à jour, ré-applique le
# correctif Expo, et republie sous @linfeilong sur GitHub Packages.
#
# Prérequis : bun, gh (connecté), ~/.npmrc avec @linfeilong:registry +
# //npm.pkg.github.com/:_authToken=<PAT write:packages>.
#
# Usage :
#   bash expo-deslop-patch/update.sh          # vérifie, et republie si une MAJ existe
#   bash expo-deslop-patch/update.sh --check  # vérifie seulement, ne republie pas
set -euo pipefail

SCOPE="@linfeilong"
SUFFIX="expo-plugins"   # les versions publiées sont <base>-${SUFFIX}.<n>
WORK="$(mktemp -d)"
CHECK_ONLY="${1:-}"

note() { printf '\033[36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[33m⚠\033[0m  %s\n' "$*"; }
ok()   { printf '\033[32m✓\033[0m  %s\n' "$*"; }

# 1) Versions : upstream (npm) vs ta version publiée (GitHub Packages).
UPSTREAM="$(npm view react-doctor version 2>/dev/null || echo '?')"
MINE_FULL="$(npm view "${SCOPE}/react-doctor" version --registry=https://npm.pkg.github.com 2>/dev/null || echo '0.0.0')"
MINE_BASE="${MINE_FULL%%-*}"   # 0.5.3-expo-plugins.1 -> 0.5.3

note "react-doctor upstream : ${UPSTREAM}"
note "ton fork publié       : ${MINE_FULL} (base ${MINE_BASE})"

if [ "$UPSTREAM" = "$MINE_BASE" ]; then
  ok "Déjà à jour (ton fork suit react-doctor@${UPSTREAM}). Rien à faire."
  exit 0
fi

warn "react-doctor@${UPSTREAM} est plus récent que ta base ${MINE_BASE}."
if [ "$CHECK_ONLY" = "--check" ]; then
  echo "   Relance sans --check pour rebuild + republier."
  exit 0
fi

# Numéro de révision du suffixe : incrémente si on republie la même base upstream,
# sinon repart à 1.
PREV_BASE="$MINE_BASE"; PREV_N="${MINE_FULL##*.}"
if [ "$UPSTREAM" = "$PREV_BASE" ]; then NEXT_N=$((PREV_N + 1)); else NEXT_N=1; fi
DESLOP_VER=""  # rempli après lecture de la version deslop upstream

note "Rebuild dans ${WORK}"
cd "$WORK"

# 2) Cloner react-doctor + deslop-js (sources à jour).
git clone --depth 1 https://github.com/millionco/react-doctor.git rd >/dev/null 2>&1
git clone --depth 1 https://github.com/millionco/deslop-js.git deslop >/dev/null 2>&1

# 3) Appliquer le correctif Expo au source deslop-js, builder.
PATCH_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/expo-config-plugin-fix.patch"
if [ -f "$PATCH_SRC" ]; then
  ( cd deslop && git apply -p1 "$PATCH_SRC" ) && ok "correctif Expo appliqué au source"
else
  warn "patch source absent ($PATCH_SRC) — le correctif doit être ré-intégré à la main"
  echo "   (cf. expo-deslop-patch/README.md : modifs dans packages/deslop-js/src/collect/expo-config-plugin-entries.ts + report/packages.ts)"
  exit 1
fi
( cd deslop && bun install >/dev/null 2>&1 && bun run build >/dev/null 2>&1 )
DESLOP_VER="$(node -p "require('$WORK/deslop/packages/deslop-js/package.json').version")-${SUFFIX}.${NEXT_N}"

# 4) Builder react-doctor (core + cli + oxlint-plugin).
( cd rd && bun install >/dev/null 2>&1 && bun run build >/dev/null 2>&1 )

echo
warn "Le rebuild est prêt. La REPUBLICATION des 4 packages (renommage @linfeilong,"
warn "sed des dist, npm publish ×4) est volontairement laissée en étape manuelle"
warn "guidée — voir expo-deslop-patch/README.md §Republier. Versions cibles :"
echo "   ${SCOPE}/deslop-js@${DESLOP_VER}"
echo "   ${SCOPE}/oxlint-plugin-react-doctor@${UPSTREAM}-${SUFFIX}.${NEXT_N}"
echo "   ${SCOPE}/react-doctor-core@${UPSTREAM}-${SUFFIX}.${NEXT_N}"
echo "   ${SCOPE}/react-doctor@${UPSTREAM}-${SUFFIX}.${NEXT_N}"
echo
echo "Sources rebuildées dans : ${WORK}"
