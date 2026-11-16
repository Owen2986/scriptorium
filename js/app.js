import { creerStockage } from './stockage/adaptateur.js';
import { route, demarrer } from './ui/routeur.js';
import { initialiserTheme } from './ui/themes.js';
import { vueAccueil } from './vues/accueil/accueil.js';
import { vueReglages } from './vues/reglages/reglages.js';
import { vuePresentation } from './vues/univers/presentation.js';
import { creerExempleSiBesoin } from './modele/exemple.js';

initialiserTheme();
const vue = document.getElementById('vue');

try {
  navigator.storage?.persist?.(); // demande au navigateur de ne jamais effacer les données de lui-même
  const stockage = await creerStockage();
  await creerExempleSiBesoin(stockage);
  route('/', vueAccueil);
  route('/univers/:id', vuePresentation);
  route('/reglages', vueReglages);
  demarrer(vue, { stockage });
} catch (e) {
  vue.innerHTML = '<h1>Impossible d’ouvrir les données</h1><p></p>';
  vue.querySelector('p').textContent = e.message;
}
