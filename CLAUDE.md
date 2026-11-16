# Scriptorium : fichier de suivi du projet

> **Ce fichier est la source de vérité du projet.** Le lire suffit pour savoir ce qu'on fait, où on en est et comment travailler.
> Claude Code le lit automatiquement au début de chaque session, sur n'importe quel appareil.

## ⚠️ Consignes pour Claude (à respecter à chaque session)

1. **En début de session**, avant toute autre chose :
   - se placer sur la branche **`develop`** (`git fetch origin develop && git checkout develop && git pull`) pour récupérer ce qui a été fait sur un autre appareil ;
   - relire ce fichier en entier ;
   - `git log --oneline -15` et comparer avec le **Journal** plus bas : si des commits n'y figurent pas, regarder ce qu'ils ont changé (`git show`) et mettre ce fichier à jour.
2. **Après chaque chose faite** (une étape, une correction, une décision, une nouvelle consigne de l'utilisateur) :
   - mettre à jour ce fichier : section « Où on en est », « Consignes de l'utilisateur » si nouvelle consigne, et une ligne dans le **Journal** ;
   - puis `git add` + `git commit` + `git push origin develop`. **Tout le travail se fait et s'envoie sur la branche `develop`**, jamais directement sur `master` (consigne du 2026-11-16). Même sur claude.ai/code, où une branche `claude/...` est proposée : travailler et pousser sur `develop`. **Pas besoin de demander l'autorisation pour commit/push** (accord donné le 2026-11-16).
3. Toute nouvelle consigne ou information donnée par l'utilisateur est **ajoutée dans ce fichier**, même si elle paraît petite.
4. Cette consigne de mise à jour fait elle-même partie du fichier : ne jamais la supprimer.

## Consignes de l'utilisateur (façon de travailler)

- **Tout en français.** Explications simples, sans jargon (il n'a pas compris une question technique sur l'export des images : reformuler simplement).
- **Demander avant chaque action importante** (nouvelle étape, choix de conception) et poser toutes les questions utiles. Proposer → attendre validation → faire.
  - Exception : commit et push se font sans demander.
- Avant de faire une demande complexe, **reformuler ce qu'on a compris** pour vérification quand l'utilisateur le demande.
- **Objectif : l'application la plus complète possible.** À chaque étape, proposer aussi les fonctions supplémentaires utiles (l'utilisateur choisit). Ponytail s'applique à la façon d'écrire le code (pas de code inutile), pas au nombre de fonctions.
- **Fonctions en plus de l'étape 2** : ne plus en proposer au fil des morceaux ; les garder et les proposer toutes ensemble **à la fin de l'étape 2** (consigne du 2026-11-16).
- **Le site doit s'adapter à tous les formats d'écran** (petit téléphone, grand téléphone, tablette, ordinateur, grand écran) : vérifier chaque écran à plusieurs largeurs, pas seulement ordinateur + 375 px (consigne du 2026-11-16).
- Les zones de texte se redimensionnent **en hauteur seulement**, jamais en largeur.
- **Jamais d’émojis, nulle part dans l’appli** (icônes, boutons, textes). Toujours des icônes simplifiées et épurées en silhouette pleine (game-icons.net). Version actuelle des icônes validée par l’utilisateur (2026-11-16).
- **Unslop sur chaque interface** (consigne du 2026-11-16) : à chaque écran créé ou modifié, passer le skill `/unslop` dessus, puis **présenter ses propositions à l’utilisateur** (avec captures) et attendre son choix avant de les appliquer.
- **Rien de visuel sans accord précis** (consigne du 2026-11-16) : avant de créer un nouvel élément d’interface (ex. les aperçus des thèmes), montrer d’abord à quoi il ressemblera (maquette ou capture) et attendre un « oui ». Une idée cochée dans une liste ne suffit pas pour décider de sa forme.
- Aimer voir des **captures d'écran** avant de valider un choix visuel : les copier dans `~/Images/apercu-polices/` (ou un dossier d'aperçu) et les ouvrir avec `xdg-open` ; les chemins affichés dans le terminal ne sont pas cliquables pour lui.
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
- Dépôt GitHub (**public**, choix de l'utilisateur) : https://github.com/Owen2986/scriptorium. Branche de travail : **`develop`** (tous les envois s'y font) ; `master` = version stable, mise à jour seulement quand l'utilisateur le demande. Compte GitHub : Owen2986.
- Identité **locale** du dépôt : `user.name "Owen"` sur Windows, `user.email ethan30augros@gmail.com`.
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
- Lancer en local : WebStorm (clic droit `index.html` → Open In → Browser) ou `python -m http.server 8000` (sur le PC Linux le port 8000 est déjà pris par autre chose : utiliser `python3 -m http.server 8765`).

### Outils installés

- Git, Node, Python, gh CLI (connecté au compte Owen2986 sur l'ordinateur), Chrome DevTools MCP, plugin frontend-design.
- Skill **unslop** (heydamir/unslop, plugin Claude Code, installé sur l’ordinateur Windows le 2026-11-16) : enlève l’aspect « fait par une IA » d’une interface (`/unslop`). Sur un autre appareil : `claude plugin marketplace add heydamir/unslop` puis `claude plugin install unslop@heydamir`.
- **Graphify** : graphe du projet dans `graphify-out/` (ignoré par git, à reconstruire sur chaque appareil). Il ne se met pas à jour tout seul : lancer `/graphify . --update` au début d'une étape importante.
- PC Linux : mêmes outils (Python = `python3`, gh dans `~/.local/bin`, non connecté : l'envoi passe par SSH), WebStorm dans `/opt/WebStorm`, Chrome de test dans `~/.local/share/chrome-test` (Ubuntu bloque son bac à sable sans droits admin : lancé avec `--no-sandbox`, choix de l'utilisateur, uniquement pour tester le site en local).

## Plan des étapes

| # | Étape | État |
|---|-------|------|
| 0 | Cadrage | ✅ fait |
| 1 | Fondations (stockage, migrations, routeur, thèmes, tests) | ✅ fait |
| 2 | Univers | ⏳ en cours (morceaux 1-3 faits) |
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
- **Icônes (2026-11-16)** : plus d'émojis. 48 dessins de game-icons.net (CC BY 3.0, crédit dans Réglages) dans `icones/types.svg`, noms + libellés français dans `ICONES` (`js/modele/types.js`), affichage par `iconeSvg(nom)` (couleur du type). Migration 2 : convertit les anciens émojis. `rename.png` (image Shutterstock, modèle de style) n'est pas envoyé sur GitHub.
- **Unslop des pages existantes (2026-11-16)** : direction « bureau d'écrivain » (posé, lettré, artisanal). Appliqué : titres en 500, arrondis 8 px (boutons/champs) et 12 px (cartes, `--rayon-carte`), plus de point final sur les petites phrases, réalignement Couleur/Image de couverture ; carte d'univers en « page de garde » (couverture ou initiale sur fond teinté) ; **signet** à la couleur de l'univers (signature, remplace les bordures colorées) ; aperçus des thèmes en vignettes dans Réglages.
- **Reporté** : sauvegarde `.scriptorium` en zip (avec JSZip), réduction automatique de la taille des images.
- **Polices** (validées le 2026-11-16) : copiées dans `polices/` (woff2, latin, licences libres), déclarées dans `css/polices.css`. Grimoire = Cinzel + EB Garamond ; Station = Orbitron + Exo 2 ; Archive = Special Elite + Libre Baskerville ; Épure = Inter. Raison : les anciennes polices Windows n'existaient pas sur Linux/téléphone, plusieurs thèmes se ressemblaient.
- Archive : fond clair légèrement jaunâtre (#f2efe3) et fond sombre gris anthracite chaud (#2a2925) au lieu du noir, à la demande de l'utilisateur.
- **Étape 2, choix validés (2026-11-16)** : univers + fiches + liens `[[Nom de fiche]]` ; types de fiches de base modifiables (Personnage, Lieu, Objet, Groupe/Faction, Créature, Notion) ; une fiche = titre + champs propres au type + texte mis en forme + image facultative ; univers d'exemple fantasy ajouté dès cette étape.
- **Étape 2, fonctions en plus (toutes retenues)** : étiquettes, favoris, fiches imbriquées, recherche dans tout le texte ; galerie d'images, surnoms reconnus par les liens, cases de plusieurs sortes (texte, nombre, liste, lien vers fiche), zone secrets/notes d'auteur ; corbeille, historique des versions, dupliquer, annuler/rétablir ; présentation de l'univers (description, couverture, couleur), statistiques, export Markdown/PDF, fiches orphelines et liens vers fiches inexistantes.
- **Plan de l'étape 2 validé (2026-11-16)**, 8 morceaux : 1 univers (liste, créer/renommer/supprimer/dupliquer, présentation, univers d'exemple) ; 2 types de fiches et cases ; 3 fiches (texte riche, secrets, images, étiquettes, favoris, parente, enregistrement automatique) ; 4 liens `[[ ]]` + surnoms ; 5 corbeille, versions, dupliquer, annuler/rétablir ; 6 recherche, statistiques, orphelines/liens cassés ; 7 export Markdown + PDF (impression) ; 8 tests + vérif Chrome + volume.
- Réglages retenus (valeurs proposées, modifiables) : corbeille 30 jours, 20 versions par fiche, export Markdown en un seul fichier.
- **À reproposer à la fin de l'étape 2** (mis de côté par l'utilisateur) : a. suggestions en tapant `[[` ; b. « Citée dans » ; c. affichage liste/cartes ; d. tri des fiches ; e. fiche modèle.
- **Morceau 1 fait** : accueil en cartes, page de présentation (nom, description, couleur, couverture, enregistrement automatique), dupliquer/supprimer un univers avec tout son contenu (`js/modele/univers.js`, écriture « tout ou rien » via `stockage.lot`), univers d'exemple créé une seule fois (clé meta `exempleCree`). 6 tests OK, vérifié dans Chrome (dont largeur téléphone). Les fiches d'exemple viendront au morceau 3.
- Branche `develop` créée (2026-11-16) : c'est là que tout s'envoie désormais.
- **Morceau 2 fait (2026-11-16)** : onglets dans l'univers (Présentation, Types de fiches) ; page « Types de fiches » (liste, nouveau type, monter/descendre) ; page d'un type (nom, icône parmi 48 dessins, couleur, cases : texte / nombre / liste de choix / lien vers une fiche avec type visé, monter/descendre/retirer, enregistrement automatique). Choix de l'utilisateur : a. types propres à chaque univers ; b. icône + couleur, avec icône déjà choisie pour les 6 types de base (personne, château, clé, bouclier, dragon, ampoule) ; c. suppression d'un type utilisé : avertissement, puis chaque fiche est déplacée vers un type existant ou un type créé sur le moment (qui reprend les mêmes cases), sinon elle va à la corbeille. Les types de base (avec des cases déjà prêtes) sont créés à la première ouverture de l'univers (`assurerTypes`, drapeau `typesCrees` sur l'univers). Code : `js/modele/types.js`, `js/vues/univers/types.js`, `js/vues/univers/commun.js`. 8 tests OK, vérifié dans le navigateur (ordinateur et largeur téléphone).
- Notes pour la suite : une fiche a un champ `nom`, ses cases sont dans `valeurs` (clé = id de la case) ; une fiche à la corbeille porte `corbeille: <date>`. Au morceau 5, restaurer une fiche dont le type n'existe plus devra demander un type.
- **Fonctions en plus mises de côté (à proposer à la fin de l'étape 2)** : cases obligatoires, valeur par défaut d'une case, dupliquer un type, copier un type vers un autre univers, autres sortes de cases (date du calendrier, case à cocher, plusieurs fiches liées).
- **Morceau 3, choix de l'utilisateur (2026-11-16)** : liste des fiches groupée par type + filtre par type ; barre de mise en forme : gras, italique, souligné, titres/sous-titres, citation, séparateur (pas de listes) ; une quinzaine de fiches d'exemple reliées entre elles ; image principale **en portrait à droite** avec les cases dessous (choisie sur maquettes).
- **Morceau 3 fait (2026-11-16)**, selon les maquettes validées : onglet Fiches (liste groupée par type, filtres Tous / par type / Favoris, étoile favori, petite info = 1re liste de choix + « dans <parente> ») ; « Nouvelle fiche » ouvre une petite fenêtre « Quel type ? » (sautée si un filtre de type est actif) ; page d'une fiche : nom modifiable, favori, texte mis en forme (`js/ui/texte-riche.js`, `nettoyer()` garde seulement p/b/i/u/h2/h3/blockquote/hr, sans attributs), secrets (zone repliable), portrait à droite (au-dessus sur téléphone), galerie (clic = image en grand dans un nouvel onglet, × pour retirer), cases du type, fiche parente (sans boucle), étiquettes ; tout s'enregistre à chaque modification (« Enregistré »). 16 fiches d'exemple reliées (`js/modele/exemple.js`, clé meta `fichesExemple`). Code : `js/modele/fiches.js`, `js/vues/univers/fiches.js`. Correction : l'onglet actif restait éteint sur les sous-pages (routeur). 12 tests OK, vérifié dans le navigateur (ordinateur + 375 px).
- Pas fait volontairement : le bouton « Plus… » de la maquette (dupliquer, corbeille) viendra au morceau 5.
- **Unslop des fiches (2026-11-16, validé)** : titres de section en couleur de texte (la couleur du type reste dans les vignettes) ; cases courtes (nombre, liste) par deux, colonne de droite 21rem ; cadre d'image vide discret « Ajouter une image » (cliquable) ; « Enregistré » affiché 2 s après chaque modification. Le choix d'image se fait aussi au clavier.
- **Morceau 4, choix de l'utilisateur (2026-11-16)** : clic sur un lien `[[ ]]` = curseur placé + petite bulle « Ouvrir » (pareil sur téléphone) ; lien vers une fiche absente = affiché autrement + la bulle propose de la créer (choix du type) ; surnoms dans un champ « Autres noms » sous le nom de la fiche (comme des étiquettes) ; renommer une fiche met à jour tous les `[[Ancien nom]]` de l'univers. Par défaut : majuscules et accents ignorés pour reconnaître un nom, liens actifs aussi dans les secrets.
- **Morceau 4, style des liens choisi (2026-11-16)** : B « pointillé discret » (texte normal ; fiche existante = tirets gris dessous ; fiche absente = points couleur d'accent + italique, inversé à la demande de l'utilisateur). Maquette : `apercu/maquette-liens.html?v=b` (ouvrable sans serveur).
- Maquettes téléphone du morceau 4 validées par l'utilisateur (2026-11-17, « au pire on y reviendra »).
- **Morceau 4 écrit mais PAS ENCORE TESTÉ (2026-11-17)** : `js/modele/liens.js` (`cle` = nom sans majuscules/accents, `indexNoms` = nom ou surnom → fiche, le nom passe avant un surnom, `renommerLiens`) ; `js/ui/liens.js` (`decorerLiens` : `[[Nom]]` → `span.lien` d'un seul bloc, `contenteditable=false`, crochets cachés mais gardés dans le texte, donc enregistré tel quel ; `bulleLiens` : bulle « Ouvrir » / « Créer la fiche », aussi au clavier avec les flèches) ; `editeur()` a des options `barre`, `nom`, `decorer` ; secrets = éditeur sans barre (anciens secrets en texte brut convertis par `depuisTexteBrut`) ; champ « Autres noms » (`fiche.autresNoms`) ; renommer met à jour les liens de l'univers quand on quitte le champ du nom, sauf si une autre fiche porte l'ancien nom. Exemple : quelques `[[ ]]` + surnom « Le Borgne » (seulement pour un nouvel univers d'exemple). 3 tests ajoutés. Seule la syntaxe a été vérifiée (node --check).
- Choix à faire valider : un lien est un bloc (on ne corrige pas une lettre dedans, on l'efface d'un coup et on le retape).
- **Prochaine action** : lancer le serveur, passer les tests (`tests/tests.html`), vérifier dans Chrome à plusieurs largeurs, unslop + captures, puis demander l'avis de l'utilisateur.
- **Tester sur le téléphone (Wi-Fi de la maison)** : sur l'ordinateur `python -m http.server 8080 --bind 0.0.0.0` dans `scriptorium`, puis sur le téléphone (connecté au même Wi-Fi, pas en 4G) `http://192.168.1.235:8080`. Le lancement du serveur par Claude a été bloqué par la sécurité de Claude Code : l'utilisateur doit le lancer lui-même ou l'autoriser. Serveur intégré de WebStorm sur le port 63342 (adresse exacte du projet pas trouvée). Autre option proposée : GitHub Pages dès maintenant (pas encore décidé).

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
- 2026-11-16, PC Linux : étape 2, morceau 1 (univers) fait et vérifié.
- 2026-11-16, PC Linux : zones de texte redimensionnables en hauteur seulement (demande de l'utilisateur).
- 2026-11-16, PC Linux : polices des thèmes copiées dans le projet, couleurs d'Archive adoucies, bouton « Retirer l'image » caché quand il n'y a pas d'image.
- 2026-11-16, téléphone (claude.ai/code) : branche `develop` créée ; consigne : toujours travailler et envoyer sur `develop`.
- 2026-11-16, téléphone (claude.ai/code) : étape 2, morceau 2 (types de fiches et cases) fait et vérifié ; consigne : fonctions en plus proposées seulement à la fin de l'étape 2.
- 2026-11-16, ordinateur : dépôt Windows remis à jour (passage sur `develop`), nom git local « Owen » noté.
- 2026-11-16, ordinateur : émojis des types remplacés par des icônes game-icons.net en silhouette (consigne : pas d'émojis) ; 9 tests OK, vérifié dans Chrome.
- 2026-11-16, ordinateur : icônes validées ; consigne : ne jamais utiliser d'émojis.
- 2026-11-16, ordinateur : skill unslop (heydamir) installé.
- 2026-11-16, ordinateur : consigne, passer unslop sur chaque interface et proposer ses solutions avant de les appliquer.
- 2026-11-16, ordinateur : unslop passé sur les pages existantes, les 4 propositions retenues et appliquées ; 9 tests OK.
- 2026-11-16, ordinateur : noms des thèmes sans parenthèses, vignettes qui suivent le mode de l'appareil, plus de faux gras (logo Archive).
- 2026-11-16, ordinateur : consigne, toujours montrer et demander avant de créer un élément visuel.
- 2026-11-16, ordinateur : questions du morceau 3 posées, choix notés ; maquettes de l'image demandées.
- 2026-11-16, ordinateur : image principale d'une fiche en portrait à droite (choix sur 3 maquettes).
- 2026-11-16, ordinateur : étape 2, morceau 3 (fiches) fait et vérifié.
- 2026-11-16, ordinateur : unslop des pages de fiches, 4 retouches validées et appliquées.
- 2026-11-16, ordinateur : questions du morceau 4 (liens et surnoms) posées, choix notés.
- 2026-11-16, ordinateur : maquettes des liens (3 styles), style B choisi ; maquettes téléphone envoyées.
- 2026-11-16, ordinateur : consigne, le site doit s'adapter à tous les formats d'écran.
- 2026-11-16, ordinateur : marques des liens inversées (tirets gris = fiche existante, points rouges = fiche absente).
- 2026-11-17, ordinateur : maquettes du morceau 4 validées ; morceau 4 (liens `[[ ]]`, bulle, autres noms, renommage) écrit, pas encore testé ; accès depuis le téléphone expliqué (Wi-Fi local).
