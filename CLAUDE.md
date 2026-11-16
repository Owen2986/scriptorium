# Scriptorium : fichier de suivi du projet

> **Ce fichier est la source de vérité du projet.** Le lire suffit pour savoir ce qu'on fait, où on en est et comment travailler.
> Claude Code le lit automatiquement au début de chaque session, sur n'importe quel appareil.

## ⚠️ Consignes pour Claude (à respecter à chaque session)

1. **En début de session**, avant toute autre chose :
   - `git pull` pour récupérer ce qui a été fait sur un autre appareil ;
   - relire ce fichier en entier ;
   - `git log --oneline -15` et comparer avec le **Journal** plus bas : si des commits n'y figurent pas, regarder ce qu'ils ont changé (`git show`) et mettre ce fichier à jour.
2. **Après chaque chose faite** (une étape, une correction, une décision, une nouvelle consigne de l'utilisateur) :
   - mettre à jour ce fichier : section « Où on en est », « Consignes de l'utilisateur » si nouvelle consigne, et une ligne dans le **Journal** ;
   - puis `git add` + `git commit` + `git push`. **Pas besoin de demander l'autorisation pour commit/push** (accord donné le 2026-11-16).
3. Toute nouvelle consigne ou information donnée par l'utilisateur est **ajoutée dans ce fichier**, même si elle paraît petite.
4. Cette consigne de mise à jour fait elle-même partie du fichier : ne jamais la supprimer.

## Consignes de l'utilisateur (façon de travailler)

- **Tout en français.** Explications simples, sans jargon (il n'a pas compris une question technique sur l'export des images : reformuler simplement).
- **Demander avant chaque action importante** (nouvelle étape, choix de conception) et poser toutes les questions utiles. Proposer → attendre validation → faire.
  - Exception : commit et push se font sans demander.
- Avant de faire une demande complexe, **reformuler ce qu'on a compris** pour vérification quand l'utilisateur le demande.
- Garder le **mode ponytail** actif (solution la plus simple qui marche entièrement, pas de code inutile).
- Installer les outils utiles quand il l'autorise.
- IDE : **WebStorm** (JetBrains). Pas besoin de VS Code.
- Travaille sur ordinateur (Windows) et veut aussi avancer depuis son **téléphone** ou d'autres appareils :
  - soit via GitHub (Claude Code sur le web, claude.ai/code, sur ce dépôt) ;
  - soit via le contrôle à distance de la session Claude Code de l'ordinateur (l'ordinateur doit être allumé et Claude lancé dessus).

## Le projet

**Scriptorium** : atelier d'écriture et de worldbuilding, site web statique qui marche aussi hors ligne (PWA). Données stockées sur l'appareil (IndexedDB), sans serveur ni compte.

### Décisions de cadrage (étape 0, validées)

- **Plusieurs univers** ; un univers peut contenir **plusieurs tomes**.
- Manuscrit : **chapitres ET scènes** possibles, l'utilisateur choisit (arbre libre partie/chapitre/scène).
- **Calendrier inventé** vraiment configurable (mois, durée de l'année, ères…).
- Éditeur de manuscrit en **texte riche (WYSIWYG)**, pas en Markdown.
- **Pas d'outil de build.** Quelques petites bibliothèques copiées dans le projet (JSZip, Markdown).
- **Plusieurs thèmes** au choix, chacun en clair + sombre : Grimoire (fantasy), Station (SF), Archive (polar/historique), Épure (neutre).
- **Téléphone : mêmes fonctions que sur ordinateur** (parité complète).
- Hébergement : **GitHub Pages**.
- Données d'exemple : un univers fantasy générique. Le livre de l'utilisateur viendra après.

### Git

- Dépôt local : `C:\Users\owen2\Desktop\Projet\scriptorium`.
- Identité **locale** du dépôt : `user.name "Ethan"`, `user.email ethan30augros@gmail.com`.
- **Ne pas modifier la config git globale** (c'est un email universitaire).
- Messages de commit en français.

### Architecture technique

- Modules ES sans build, routeur par hash (`#/...`), bibliothèques et polices copiées localement.
- Dossiers : `index.html`, `css/` (design-tokens, base, composants, `themes/`, `vues/`), `js/` (`app.js`, `stockage/`, `modele/`, `ui/`, `vues/<module>/`, `lib/`), `polices/`, `icones/` (sprite SVG), `tests/tests.html`, `docs/`, `README.md`.
- **IndexedDB** (stores) : univers, typesFiches, fiches, relations, calendriers (avec les ères), evenements, cartes, epingles, images (Blob), tomes, noeudsManuscrit, textes (store séparé, clé `noeudId`), meta (clé `cle`), statsJour (clé `jour`).
- **Tout l'accès aux données passe par `js/stockage/adaptateur.js`** (get, tous, query, put, delete, exporter, importer).
- **Migrations** numérotées dans `js/stockage/migrations.js` : ne jamais modifier une migration existante, en ajouter une à la fin. Une copie de secours de toute la base est faite automatiquement avant chaque migration (base `scriptorium-secours`, 3 dernières copies).
- Import : tout ou rien, un fichier invalide n'efface rien.
- **Sauvegarde** = un fichier `.scriptorium` (zip : data.json + images) ; rappel si dernière sauvegarde > 7 jours (réglable).
- Éditeur de manuscrit : contentEditable maison + petite barre d'outils ; un chapitre/scène chargé à la fois.
- Préférence de thème : dans `localStorage` (propre à chaque appareil, pas dans les sauvegardes).
- **Tests** : `tests/tests.html` (stockage, migrations, export/import, liens `[[ ]]`, calendrier) + vérifs dans Chrome via Chrome DevTools MCP + test de volume (500 fiches / 150 000 mots).
- Lancer en local : WebStorm (clic droit `index.html` → Open In → Browser) ou `python -m http.server 8000`.

### Outils installés

- Git, Node, Python, gh CLI (connexion `gh auth login` à faire par l'utilisateur), Chrome DevTools MCP, plugin frontend-design.

## Plan des étapes

| # | Étape | État |
|---|-------|------|
| 0 | Cadrage | ✅ fait |
| 1 | Fondations (stockage, migrations, routeur, thèmes, tests) | ✅ fait |
| 2 | Univers | ⏳ prochaine |
| 3 | Manuscrit | |
| 4 | Chronologie (calendrier inventé) | |
| 5 | Cartes | |
| 6 | Graphe des relations | |
| 7 | Outils | |
| 8 | Finitions | |
| 9 | PWA (hors ligne, installable) | |
| 10 | Déploiement (GitHub Pages) | |
| 11 | Suite | |

## Où on en est

- Étape 1 terminée : 5 tests OK, appli vérifiée dans Chrome (navigation, thèmes, affichage 375 px).
- Mise sur GitHub en cours (attend la connexion `gh auth login` de l'utilisateur).
- **Reporté** : sprite d'icônes, polices copiées localement (polices système pour l'instant), sauvegarde `.scriptorium` en zip (avec JSZip).
- **Prochaine action** : proposer le contenu de l'étape 2 (Univers) et attendre validation.

## Journal

Une ligne par chose faite : date, appareil, quoi.

- 2026-11-16, ordinateur : étape 0, cadrage validé.
- 2026-11-16, ordinateur : étape 1, fondations (stockage IndexedDB + migrations + copie de secours, routeur, 4 thèmes clair/sombre, page Réglages, tests).
- 2026-11-16, ordinateur : création de ce fichier CLAUDE.md ; accord pour commit/push sans demander.
