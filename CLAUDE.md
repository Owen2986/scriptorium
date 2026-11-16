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
- **Objectif : l'application la plus complète possible.** À chaque étape, proposer aussi les fonctions supplémentaires utiles (l'utilisateur choisit). Ponytail s'applique à la façon d'écrire le code (pas de code inutile), pas au nombre de fonctions.
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

- Dépôt local : `C:\Users\owen2\Desktop\Projet\scriptorium` (Windows) ; `/home/depinfo/Documents/Scriptorium` (PC Linux, envoi par clé SSH, remote `git@github.com:Owen2986/scriptorium.git`).
- Dépôt GitHub (**public**, choix de l'utilisateur) : https://github.com/Owen2986/scriptorium, branche `master`. Compte GitHub : Owen2986.
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

- Git, Node, Python, gh CLI (connecté au compte Owen2986 sur l'ordinateur), Chrome DevTools MCP, plugin frontend-design.
- **Graphify** : graphe du projet dans `graphify-out/` (ignoré par git, à reconstruire sur chaque appareil). Il ne se met pas à jour tout seul : lancer `/graphify . --update` au début d'une étape importante.
- PC Linux : mêmes outils (Python = `python3`, gh dans `~/.local/bin`, non connecté : l'envoi passe par SSH), WebStorm dans `/opt/WebStorm`, Chrome de test dans `~/.local/share/chrome-test` (Ubuntu bloque son bac à sable sans droits admin : lancé avec `--no-sandbox`, choix de l'utilisateur, uniquement pour tester le site en local).

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
- Projet sur GitHub (public) : on peut travailler depuis le téléphone via claude.ai/code sur ce dépôt.
- **Reporté** : sprite d'icônes, polices copiées localement (polices système pour l'instant), sauvegarde `.scriptorium` en zip (avec JSZip).
- **Étape 2, choix validés (2026-11-16)** : univers + fiches + liens `[[Nom de fiche]]` ; types de fiches de base modifiables (Personnage, Lieu, Objet, Groupe/Faction, Créature, Notion) ; une fiche = titre + champs propres au type + texte mis en forme + image facultative ; univers d'exemple fantasy ajouté dès cette étape.
- **Étape 2, fonctions en plus (toutes retenues)** : étiquettes, favoris, fiches imbriquées, recherche dans tout le texte ; galerie d'images, surnoms reconnus par les liens, cases de plusieurs sortes (texte, nombre, liste, lien vers fiche), zone secrets/notes d'auteur ; corbeille, historique des versions, dupliquer, annuler/rétablir ; présentation de l'univers (description, couverture, couleur), statistiques, export Markdown/PDF, fiches orphelines et liens vers fiches inexistantes.
- **Plan de l'étape 2 validé (2026-11-16)**, 8 morceaux : 1 univers (liste, créer/renommer/supprimer/dupliquer, présentation, univers d'exemple) ; 2 types de fiches et cases ; 3 fiches (texte riche, secrets, images, étiquettes, favoris, parente, enregistrement automatique) ; 4 liens `[[ ]]` + surnoms ; 5 corbeille, versions, dupliquer, annuler/rétablir ; 6 recherche, statistiques, orphelines/liens cassés ; 7 export Markdown + PDF (impression) ; 8 tests + vérif Chrome + volume.
- Réglages retenus (valeurs proposées, modifiables) : corbeille 30 jours, 20 versions par fiche, export Markdown en un seul fichier.
- **À reproposer à la fin de l'étape 2** (mis de côté par l'utilisateur) : a. suggestions en tapant `[[` ; b. « Citée dans » ; c. affichage liste/cartes ; d. tri des fiches ; e. fiche modèle.
- **Prochaine action** : morceau 1 (univers).

## Journal

Une ligne par chose faite : date, appareil, quoi.

- 2026-11-16, ordinateur : étape 0, cadrage validé.
- 2026-11-16, ordinateur : étape 1, fondations (stockage IndexedDB + migrations + copie de secours, routeur, 4 thèmes clair/sombre, page Réglages, tests).
- 2026-11-16, ordinateur : création de ce fichier CLAUDE.md ; accord pour commit/push sans demander.
- 2026-11-16, ordinateur : dépôt GitHub public créé (Owen2986/scriptorium) et premier envoi.
- 2026-11-16, PC Linux : dépôt récupéré, connexion GitHub par clé SSH, installation de gh, Chrome de test, Chrome DevTools MCP et plugin frontend-design.
- 2026-11-16, PC Linux : `graphify-out/` ajouté au `.gitignore`, graphe du projet construit.
- 2026-11-16, PC Linux : questions de l'étape 2 posées, choix enregistrés ci-dessus.
- 2026-11-16, PC Linux : nouvelle consigne, viser l'application la plus complète possible.
- 2026-11-16, PC Linux : fonctions en plus de l'étape 2 choisies (toutes).
- 2026-11-16, PC Linux : plan de l'étape 2 validé (8 morceaux), fonctions en plus a–e reportées à la fin de l'étape.
