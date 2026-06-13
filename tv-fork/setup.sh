#!/usr/bin/env bash
#
# setup.sh — installe react-doctor en GLOBAL et applique le correctif des faux
# positifs plugins Expo (config-tv, forme { expo: { plugins } } d'app.config.js).
#
# Méthode : install officielle complète + `bun patch` sur le deslop-js qu'elle
# embarque. Robuste (rien n'est extrait de son contexte), contrairement à un
# fork publié. À lancer sur une machine neuve, ou après un `bun update -g`.
#
# Prérequis : bun.
# Usage : bash tv-fork/setup.sh
set -euo pipefail

PATCH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deslop-js-dist.patch"
GLOBAL_ROOT="$HOME/.bun/install/global"

note() { printf '\033[36m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m✓\033[0m  %s\n' "$*"; }

# 1) Installer react-doctor en global (tire deslop-js en transitive).
note "Installation de react-doctor en global…"
bun add -g react-doctor

DESLOP="$GLOBAL_ROOT/node_modules/deslop-js"
[ -d "$DESLOP" ] || { echo "✗ deslop-js introuvable dans le global après install."; exit 1; }

DESLOP_VER="$(node -p "require('$DESLOP/package.json').version")"
note "deslop-js global : $DESLOP_VER"

# 2) Déjà patché ? (idempotent)
if grep -q "__expoPluginPackages\|packageNames" "$DESLOP/dist/index.mjs" 2>/dev/null; then
  ok "deslop-js déjà patché — rien à faire."
  exit 0
fi

# 3) Le patch est calibré pour deslop-js 0.0.24/0.0.25 (même bundle). Avertir sinon.
case "$DESLOP_VER" in
  0.0.24|0.0.25) ;;
  *) echo "⚠  deslop-js $DESLOP_VER ≠ 0.0.24/0.0.25 : le patch peut ne pas s'appliquer."
     echo "   Si 'git apply' échoue, régénère le patch (cf. tv-fork/README.md)." ;;
esac

# 4) Préparer + appliquer le patch via bun patch (persiste dans le lockfile global).
note "Application du correctif…"
( cd "$GLOBAL_ROOT" && bun patch deslop-js >/dev/null 2>&1 || true )
( cd "$DESLOP" && git apply -p1 "$PATCH" )
( cd "$GLOBAL_ROOT" && bun patch --commit "node_modules/deslop-js" >/dev/null )

ok "Fait. Vérifie : react-doctor <projet> --no-telemetry  (config-tv ne doit plus être flaggé)."
