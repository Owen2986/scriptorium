const routes = [];

// motif du type '/univers/:id'
export function route(motif, vue) {
  routes.push([new RegExp('^' + motif.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), vue]);
}

export function demarrer(conteneur, contexte) {
  let tour = 0;
  const afficher = async (e) => {
    const n = ++tour;
    const chemin = location.hash.slice(1) || '/';
    const page = document.createElement('div');
    const trouve = routes.map(([re, vue]) => [chemin.match(re), vue]).find(([m]) => m);
    if (trouve) {
      const [m, vue] = trouve;
      const params = Object.fromEntries(Object.entries(m.groups || {}).map(([k, v]) => [k, decodeURIComponent(v)]));
      await vue(page, params, contexte);
    } else {
      page.innerHTML = `<h1>Page introuvable</h1><p><a href="#/">Retour à l'accueil</a></p>`;
    }
    if (n !== tour) return; // une navigation plus récente a eu lieu pendant le chargement
    conteneur.replaceChildren(page);
    document.querySelectorAll('nav a').forEach(a =>
      a.getAttribute('href') === '#' + chemin ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    if (e) conteneur.focus(); // lecteurs d'écran : annoncer la nouvelle page
  };
  addEventListener('hashchange', afficher);
  afficher();
}
