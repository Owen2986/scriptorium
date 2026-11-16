import { THEMES, MODES, preferenceTheme, choisirTheme } from '../../ui/themes.js';

export function vueReglages(page) {
  const pref = preferenceTheme();
  const radios = (groupe, options, valeur) => Object.entries(options).map(([v, libelle]) =>
    `<label class="choix"><input type="radio" name="${groupe}" value="${v}"${v === valeur ? ' checked' : ''}> ${libelle}</label>`).join('');

  page.innerHTML = `<h1>Réglages</h1>
    <form class="carte">
      <fieldset><legend>Thème</legend>${radios('nom', THEMES, pref.nom)}</fieldset>
      <fieldset><legend>Affichage</legend>${radios('mode', MODES, pref.mode)}</fieldset>
    </form>`;

  const champs = page.querySelector('form').elements;
  page.querySelector('form').addEventListener('change', () =>
    choisirTheme({ nom: champs.nom.value, mode: champs.mode.value }));
}
