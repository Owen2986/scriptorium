import { creerStockage } from './stockage/adaptateur.js';
import { route, demarrer } from './ui/routeur.js';
import { initialiserTheme } from './ui/themes.js';
import { vueAccueil } from './vues/accueil/accueil.js';
import { vueReglages } from './vues/reglages/reglages.js';
import { vuePresentation } from './vues/univers/presentation.js';
import { vueTypes, vueType } from './vues/univers/types.js';
import { vueFiches, vueFiche } from './vues/univers/fiches.js';
import { vueRecherche } from './vues/univers/recherche.js';
import { vueManuscrit, vueTome } from './vues/univers/manuscrit.js';
import { vueEcriture } from './vues/univers/ecriture.js';
import { vueStatistiques } from './vues/univers/statistiques.js';
import { vueCorbeille } from './vues/corbeille/corbeille.js';
import { creerExempleSiBesoin } from './modele/exemple.js';
import { viderCorbeille } from './modele/corbeille.js';
import { lireReglages } from './modele/reglages.js';

initialiserTheme();
const vue = document.getElementById('vue');

try {
  navigator.storage?.persist?.(); // demande au navigateur de ne jamais effacer les données de lui-même
  const stockage = await creerStockage();
  await creerExempleSiBesoin(stockage);
  await viderCorbeille(stockage, (await lireReglages(stockage)).corbeilleJours); // ce qui y est depuis trop longtemps
  route('/', vueAccueil);
  route('/univers/:id', vuePresentation);
  route('/univers/:id/fiches', vueFiches);
  route('/univers/:id/fiches/:ficheId', vueFiche);
  route('/univers/:id/manuscrit', vueManuscrit);
  route('/univers/:id/manuscrit/:tomeId', vueTome);
  route('/univers/:id/manuscrit/:tomeId/:noeudId', vueEcriture);
  route('/univers/:id/types', vueTypes);
  route('/univers/:id/types/:typeId', vueType);
  route('/univers/:id/recherche', vueRecherche);
  route('/univers/:id/recherche/:q', vueRecherche);
  route('/univers/:id/statistiques', vueStatistiques);
  route('/corbeille', vueCorbeille);
  route('/reglages', vueReglages);
  demarrer(vue, { stockage });
} catch (e) {
  vue.innerHTML = '<h1>Impossible d’ouvrir les données</h1><p></p>';
  vue.querySelector('p').textContent = e.message;
}
