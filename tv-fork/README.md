# tv-fork — react-doctor avec le correctif plugins Expo

react-doctor (le moteur dead-code `deslop-js`) produit de faux positifs sur les
projets Expo :

- `unused-dependency` sur un plugin déclaré par nom de package
  (ex. `@react-native-tvos/config-tv`) ;
- `unused-file` / non-détection des plugins quand `app.config.js` a la forme
  `{ expo: { plugins: [...] } }`.

Ce dossier installe react-doctor **en global, patché**, sur n'importe quelle machine.

## Méthode retenue : `bun add -g` + `bun patch`

On installe le react-doctor **officiel complet** et on patche le `deslop-js`
qu'il embarque. C'est robuste : rien n'est sorti de son contexte.

> ⚠️ On a essayé de publier un fork autonome (`@linfeilong/react-doctor`) appelable
> via `bunx`. Abandonné : react-doctor est un monorepo, et un package extrait seul
> perd ses dépendances communes (hoistées) → `ERR_MODULE_NOT_FOUND` en cascade.
> Le `bun patch` ci-dessous ne souffre pas de ce problème.

## Installer (machine neuve, ou après `bun update -g`)

```bash
bash tv-fork/setup.sh
```

Le script : `bun add -g react-doctor`, puis applique `deslop-js-dist.patch` au
deslop-js global via `bun patch`. Idempotent (ne refait rien si déjà patché).

> ⚠️ **Dédup obligatoire** (bug du 2026-06-13). react-doctor embarque sa propre
> copie imbriquée `react-doctor/node_modules/deslop-js` et la charge **en priorité**
> sur la copie racine. Patcher la seule racine ne suffit donc pas : config-tv
> reste flaggé et le dead-code échoue (« dead-code checks failed »). `setup.sh`
> supprime la copie imbriquée après le patch pour forcer la résolution sur la
> racine patchée (et la recopie en dernier recours si bun la réinstalle).

Ensuite, partout :

```bash
react-doctor <projet> --no-telemetry
```

## Suivre une mise à jour de react-doctor

```bash
bash tv-fork/update.sh --check   # dit si react-doctor upstream a une version plus récente
```

Si oui et que tu fais `bun update -g react-doctor`, le patch saute → relance
`bash tv-fork/setup.sh` pour le réappliquer.

## Fichiers

- `setup.sh` — install globale + patch (la commande à lancer).
- `deslop-js-dist.patch` — correctif appliqué au **bundle** `dist/index.{mjs,cjs}`
  de deslop-js (cible 0.0.24 / 0.0.25).
- `expo-config-plugin-fix.patch` — le même correctif au niveau du **source** TS
  (référence ; utile pour régénérer le patch dist si la version de deslop-js change).
- `update.sh` — comparateur de version upstream.

## Le vrai fix

Proposé en amont (PR sur `millionco/deslop-js`). Une fois mergé et publié,
`react-doctor@latest` officiel suffira et ce dossier deviendra inutile.

## Régénérer le patch dist (si deslop-js change de version)

Le bundle change → le `.patch` ne s'applique plus. Réappliquer le fix au source
(`expo-config-plugin-fix.patch` sur `millionco/deslop-js`), `bun run build`, puis
`git diff` sur `dist/index.mjs` + `dist/index.cjs` → nouveau `deslop-js-dist.patch`.
