#!/usr/bin/env bash
#
# setup.sh — installe react-doctor en GLOBAL et applique le correctif des faux
# positifs plugins Expo (config-tv, forme { expo: { plugins } } d'app.config.js).
#
# Méthode : install officielle + bun patch sur le deslop-js embarqué.
# ⚠️ POINT CLÉ (bug vu le 2026-06-13) : react-doctor charge deslop-js depuis SA
# copie imbriquée (react-doctor/node_modules/deslop-js), pas la copie racine. Si
# seule la racine est patchée, react-doctor utilise une copie NON patchée →
# config-tv re-flaggé ET « dead-code checks failed ». Il faut donc DÉDUPLIQUER :
# supprimer la copie imbriquée pour que react-doctor remonte sur la racine patchée.
#
# Prérequis : bun.
# Usage : bash expo-deslop-patch/setup.sh
set -euo pipefail

PATCH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCH="$PATCH_DIR/deslop-js-dist.patch"
GLOBAL_ROOT="$HOME/.bun/install/global"

note() { printf '\033[36m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m✓\033[0m  %s\n' "$*"; }
warn() { printf '\033[33m⚠\033[0m  %s\n' "$*"; }

note "Installation de react-doctor en global…"
bun add -g react-doctor

DESLOP="$GLOBAL_ROOT/node_modules/deslop-js"
[ -d "$DESLOP" ] || { echo "✗ deslop-js introuvable après install."; exit 1; }
DESLOP_VER="$(node -p "require('$DESLOP/package.json').version")"
note "deslop-js global : $DESLOP_VER"

# Marqueur du patch : fonction ajoutée par le diff (présente dans index.mjs ET
# index.cjs une fois patché). Stable d'une version à l'autre, contrairement aux
# détails internes — c'est ce nom qu'on cherche pour savoir si c'est déjà patché.
MARKER="extractExpoConfigPluginPackageNames"

# 1) Patcher la copie RACINE (si pas déjà fait).
if grep -q "$MARKER" "$DESLOP/dist/index.mjs" 2>/dev/null; then
  ok "racine déjà patchée."
else
  case "$DESLOP_VER" in
    0.0.24|0.0.25|0.5.8) ;;
    *) warn "deslop-js $DESLOP_VER ≠ 0.0.24/0.0.25/0.5.8 : le patch peut ne pas s'appliquer. Régénère-le (cf. README)." ;;
  esac
  note "Patch de la copie racine…"
  # bun patch prépare une copie éditable, on applique le diff dessus, puis commit
  # (bun écrit alors patches/deslop-js@<ver>.patch et l'enregistre dans le manifest).
  ( cd "$GLOBAL_ROOT" && bun patch deslop-js >/dev/null 2>&1 || true )
  ( cd "$DESLOP" && git apply -p1 "$PATCH" )
  ( cd "$GLOBAL_ROOT" && bun patch --commit "node_modules/deslop-js" >/dev/null )
fi

# 2) DÉDUP : retirer la copie imbriquée de react-doctor (sinon il l'utilise, NON
#    patchée). Réinstall pour que la résolution remonte sur la racine patchée.
NESTED="$GLOBAL_ROOT/node_modules/react-doctor/node_modules/deslop-js"
if [ -d "$NESTED" ]; then
  note "Déduplication : suppression de la copie imbriquée non patchée…"
  rm -rf "$NESTED"
  ( cd "$GLOBAL_ROOT" && bun install >/dev/null 2>&1 )
  # Si bun la réinstalle quand même, copier le dist patché dessus en dernier recours.
  if [ -d "$NESTED" ] && ! grep -q "$MARKER" "$NESTED/dist/index.mjs" 2>/dev/null; then
    warn "copie imbriquée réapparue → application directe du dist patché dessus."
    cp "$DESLOP/dist/index.mjs" "$NESTED/dist/index.mjs"
    cp "$DESLOP/dist/index.cjs" "$NESTED/dist/index.cjs"
  fi
fi

ok "Fait. Vérifie : react-doctor <projet> --no-telemetry (config-tv masqué + pas de 'dead-code failed')."
