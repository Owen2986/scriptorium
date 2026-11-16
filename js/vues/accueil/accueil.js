export async function vueAccueil(page, params, { stockage }) {
  const univers = await stockage.tous('univers');
  page.innerHTML = `<h1>Mes univers</h1>
    <p class="vide">${univers.length ? `${univers.length} univers.` : 'Aucun univers pour l’instant.'}</p>`;
}
