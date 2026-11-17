import { THEMES, MODES, preferenceTheme, choisirTheme } from '../../ui/themes.js';
import { lireReglages, ecrireReglages } from '../../modele/reglages.js';

export async function vueReglages(page, params, { stockage }) {
  const reglages = await lireReglages(stockage);
  const pref = preferenceTheme();
  const radios = (groupe, options, valeur) => Object.entries(options).map(([v, libelle]) =>
    `<label class="choix"><input type="radio" name="${groupe}" value="${v}"${v === valeur ? ' checked' : ''}> ${libelle}</label>`).join('');

  page.innerHTML = `<h1>Réglages</h1>
    <form class="carte">
      <fieldset><legend>Thème</legend><div class="apercus-themes">
        ${Object.entries(THEMES).map(([v, libelle]) => `<label class="apercu-theme">
          <input type="radio" name="nom" value="${v}"${v === pref.nom ? ' checked' : ''}>
          <span class="vignette" data-theme="${v}" aria-hidden="true">
            <span class="vignette-titre">Chapitre I</span>
            <span>Il était une fois, au bord du monde…</span>
            <span class="vignette-accent"></span>
          </span>
          <span class="apercu-nom">${libelle}</span>
        </label>`).join('')}
      </div></fieldset>
      <fieldset><legend>Affichage</legend>${radios('mode', MODES, pref.mode)}</fieldset>
    </form>
    <form class="carte reglages-donnees">
      <label>Vider la corbeille après (jours)
        <input type="number" name="corbeilleJours" min="1" max="3650" required value="${reglages.corbeilleJours}"></label>
      <label>Versions gardées par fiche
        <input type="number" name="versionsMax" min="1" max="500" required value="${reglages.versionsMax}"></label>
    </form>
    <p class="vide">Icônes : <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a>
      (Lorc, Delapouite et autres), licence <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a></p>`;

  page.querySelectorAll('.vignette').forEach(v => { v.dataset.mode = document.documentElement.dataset.mode; });

  const donnees = page.querySelector('.reglages-donnees');
  donnees.addEventListener('change', () => {
    if (!donnees.checkValidity()) return donnees.reportValidity();
    ecrireReglages(stockage, Object.fromEntries([...donnees.elements].map(c => [c.name, Math.round(c.valueAsNumber)])));
  });

  const champs = page.querySelector('form').elements;
  page.querySelector('form').addEventListener('change', () =>
    choisirTheme({ nom: champs.nom.value, mode: champs.mode.value }));
}
