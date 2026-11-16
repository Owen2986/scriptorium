# Scriptorium

Atelier d'écriture et de worldbuilding qui tourne dans le navigateur, sans serveur ni compte. Les données restent sur l'appareil (IndexedDB).

## Lancer en local

Les modules JavaScript ne marchent pas en ouvrant `index.html` directement (adresse `file://`), il faut passer par un petit serveur :

- **WebStorm** : clic droit sur `index.html` → *Open In* → *Browser* (WebStorm sert le fichier lui-même) ;
- **ou** dans un terminal, depuis ce dossier : `python -m http.server 8000`, puis ouvrir http://localhost:8000.

## Tests

Ouvrir `tests/tests.html` de la même façon. Le résumé en haut de la page indique si tout passe.

## Organisation

- `index.html` : la coquille de l'application.
- `css/` : variables communes, base, composants, et un fichier par thème dans `css/themes/`.
- `js/app.js` : démarrage. `js/ui/` : routeur (`#/...`) et thèmes. `js/vues/` : un dossier par écran.
- `js/stockage/` : tout l'accès aux données passe par `adaptateur.js`. Pour changer la structure de la base, **ajouter** une migration à la fin de `migrations.js` (une copie de secours est faite automatiquement avant).
