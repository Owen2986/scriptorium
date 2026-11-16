import { THEMES, MODES, preferenceTheme, choisirTheme } from '../../ui/themes.js';

export function vueReglages(page) {
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
    <p class="vide">Icônes : <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a>
      (Lorc, Delapouite et autres), licence <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a></p>`;

  // Les vignettes suivent le mode clair/sombre affiché.
  const vignettesAuMode = () => page.querySelectorAll('.vignette').forEach(v => {
    v.dataset.mode = document.documentElement.dataset.mode;
  });
  vignettesAuMode();

  const champs = page.querySelector('form').elements;
  page.querySelector('form').addEventListener('change', () => {
    choisirTheme({ nom: champs.nom.value, mode: champs.mode.value });
    vignettesAuMode();
  });
}
