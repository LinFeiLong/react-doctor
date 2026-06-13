# tv-fork — react-doctor patché pour Expo

Ce dossier sert à maintenir **`@linfeilong/react-doctor`** : react-doctor + un
correctif des faux positifs `unused-dependency` / `unused-file` sur les plugins
Expo (forme `{ expo: { plugins } }` d'`app.config.js`, et plugins déclarés par
nom de package comme `@react-native-tvos/config-tv`).

## Utilisation quotidienne

```bash
bunx @linfeilong/react-doctor <projet> --no-telemetry
```

Prérequis une fois par machine — `~/.npmrc` :

```
@linfeilong:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<PAT GitHub avec read:packages>
```

## Vérifier / suivre une mise à jour de react-doctor

```bash
bash tv-fork/update.sh --check   # dit juste si react-doctor upstream a une version plus récente
bash tv-fork/update.sh           # vérifie ET rebuild si une MAJ existe
```

`update.sh` compare la version de `react-doctor` (npm officiel) à celle de ton
fork publié. S'ils sont égaux → « déjà à jour », rien à faire. Sinon il reclone
react-doctor + deslop-js, applique `expo-config-plugin-fix.patch` au source de
deslop-js, et rebuild les 4 packages. Pour publier un `write:packages` est requis
dans `~/.npmrc`.

## Les 4 packages publiés (GitHub Packages, scope @linfeilong)

| Package | Rôle |
| --- | --- |
| `@linfeilong/deslop-js` | moteur dead-code — **porte le correctif** |
| `@linfeilong/oxlint-plugin-react-doctor` | plugin oxlint (dép. de core) |
| `@linfeilong/react-doctor-core` | moteur de diagnostics |
| `@linfeilong/react-doctor` | le binaire `react-doctor` |

Versions : `<base upstream>-expo-plugins.<n>`.

## Republier (étape manuelle guidée)

Après un `update.sh` qui a rebuildé, republier consiste à, pour chaque package :
renommer en `@linfeilong/*` dans son `package.json`, réécrire les dépendances
internes (`deslop-js` → `@linfeilong/deslop-js`, `@react-doctor/core` →
`@linfeilong/react-doctor-core`, `oxlint-plugin-react-doctor` →
`@linfeilong/oxlint-plugin-react-doctor`), faire le même remplacement dans les
fichiers `dist/`, puis `npm publish --registry=https://npm.pkg.github.com`.
Ordre : deslop-js → oxlint-plugin → core → react-doctor.

## Le vrai fix

Le correctif est proposé en amont (PR sur `millionco/deslop-js`). S'il est mergé
et publié, ce fork devient inutile : `bunx react-doctor@latest` officiel suffira.
`expo-config-plugin-fix.patch` est le diff source de référence.
