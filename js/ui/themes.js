export const THEMES = {
  grimoire: 'Grimoire (fantasy)',
  station: 'Station (science-fiction)',
  archive: 'Archive (polar, historique)',
  epure: 'Épure (neutre)',
};
export const MODES = { auto: "Comme l'appareil", clair: 'Clair', sombre: 'Sombre' };

// Même clé et même logique que le petit script en tête d'index.html (qui évite un flash au chargement).
const CLE = 'scriptorium.theme';
const sombreSysteme = matchMedia('(prefers-color-scheme: dark)');
let actuel = lire();

function lire() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(CLE)) || {}; } catch { /* stockage indisponible */ }
  return {
    nom: Object.hasOwn(THEMES, p.nom) ? p.nom : 'epure',
    mode: Object.hasOwn(MODES, p.mode) ? p.mode : 'auto',
  };
}

function appliquer() {
  const racine = document.documentElement;
  racine.dataset.theme = actuel.nom;
  racine.dataset.mode = actuel.mode === 'auto' ? (sombreSysteme.matches ? 'sombre' : 'clair') : actuel.mode;
}

export const preferenceTheme = () => ({ ...actuel });

export function choisirTheme(pref) {
  actuel = pref;
  try { localStorage.setItem(CLE, JSON.stringify(pref)); } catch { /* le choix vaut pour cette visite */ }
  appliquer();
}

export function initialiserTheme() {
  appliquer();
  sombreSysteme.addEventListener('change', appliquer);
}
