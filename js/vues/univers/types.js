import { message } from '../../ui/message.js';
import { SORTES, ICONES, iconeSvg, nouveauType, nouvelleCase, typesUnivers, supprimerType, copierType } from '../../modele/types.js';
import { htmlMenu, brancherMenu } from '../../ui/menu.js';
import { ouvrirUnivers } from './commun.js';

const lienType = (u, t) => `#/univers/${encodeURIComponent(u.id)}/types/${encodeURIComponent(t.id)}`;
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// Liste des types de fiches d'un univers.
export async function vueTypes(page, { id }, { stockage }) {
  const u = await ouvrirUnivers(page, id, stockage, '/types');
  if (!u) return;
  page.insertAdjacentHTML('beforeend', `<div class="titre-page">
      <h1>Types de fiches</h1>
      <button type="button" class="principal" data-action="nouveau">Nouveau type</button>
    </div>
    <ol class="liste-types"></ol>`);

  const fiches = (await stockage.query('fiches', 'universId', u.id)).filter(f => !f.corbeille);
  let types = await typesUnivers(stockage, u.id);
  const liste = page.querySelector('ol');

  const afficher = () => {
    liste.replaceChildren(...types.map((t, i) => {
      const li = document.createElement('li');
      li.className = 'carte type';
      li.style.setProperty('--couleur-type', t.couleur);
      li.innerHTML = `<a class="type-lien"><span class="icone-type">${iconeSvg(t.icone)}</span>
          <span><strong></strong><small></small></span></a>
        <span class="deplacer">
          <button type="button" data-action="monter" aria-label="Monter"${i ? '' : ' disabled'}>↑</button>
          <button type="button" data-action="descendre" aria-label="Descendre"${i < types.length - 1 ? '' : ' disabled'}>↓</button>
        </span>`;
      li.dataset.index = i;
      li.querySelector('a').href = lienType(u, t);
      li.querySelector('strong').textContent = t.nom || 'Sans nom';
      li.querySelector('small').textContent =
        `${pluriel(t.cases.length, 'case')} · ${pluriel(fiches.filter(f => f.typeId === t.id).length, 'fiche')}`;
      return li;
    }));
    if (!types.length) liste.innerHTML = '<li class="vide">Aucun type de fiche</li>';
  };
  afficher();

  page.addEventListener('click', async e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'nouveau') {
      const t = nouveauType(u.id);
      await stockage.put('typesFiches', t);
      location.hash = lienType(u, t);
    }
    if (action === 'monter' || action === 'descendre') {
      const i = +e.target.closest('li').dataset.index;
      const j = action === 'monter' ? i - 1 : i + 1;
      [types[i].ordre, types[j].ordre] = [types[j].ordre, types[i].ordre];
      if (types[i].ordre === types[j].ordre) types[j].ordre += action === 'monter' ? 1 : -1;
      types.sort((a, b) => a.ordre - b.ordre);
      afficher();
      liste.querySelector(`[data-index="${j}"] [data-action="${action}"]:not(:disabled)`)?.focus();
      await stockage.lot([['put', 'typesFiches', types[i]], ['put', 'typesFiches', types[j]]]);
    }
  });
}

// Modification d'un type : nom, icône, couleur et cases. Enregistrement automatique.
export async function vueType(page, { id, typeId }, { stockage }) {
  const u = await ouvrirUnivers(page, id, stockage, '/types');
  if (!u) return;
  const type = await stockage.get('typesFiches', typeId);
  if (!type || type.universId !== u.id) {
    page.insertAdjacentHTML('beforeend', '<h1>Type introuvable</h1>');
    return;
  }
  const autres = (await typesUnivers(stockage, u.id)).filter(t => t.id !== type.id);

  page.insertAdjacentHTML('beforeend', `<div class="haut-type"><a href="#/univers/${encodeURIComponent(u.id)}/types">← Types de fiches</a>
      ${htmlMenu([['dupliquer', 'copier', 'Dupliquer'], ['copier', 'exporter', 'Copier vers un autre univers']])}</div>
    <form class="carte type-edition">
      <label>Nom du type <input name="nom" autocomplete="off"></label>
      <fieldset><legend>Icône</legend><div class="grille-icones">
        ${Object.entries(ICONES).map(([i, nom]) =>
          `<label title="${nom}"><input type="radio" name="icone" value="${i}" aria-label="${nom}"><span>${iconeSvg(i)}</span></label>`).join('')}
      </div></fieldset>
      <label class="choix">Couleur <input type="color" name="couleur"></label>
    </form>
    <h2>Cases à remplir</h2>
    <p class="vide">Les cases apparaissent sur chaque fiche de ce type</p>
    <ol class="cases"></ol>
    <div class="actions">
      <button type="button" data-action="ajouter">Ajouter une case</button>
      <button type="button" data-action="supprimer" class="danger">Supprimer le type</button>
    </div>`);

  brancherMenu(page.querySelector('.ancre-menu'), async action => {
    if (action === 'dupliquer') {
      const copie = await copierType(stockage, type, u);
      location.hash = lienType(u, copie);
      message(`Copie de « ${type.nom || 'Sans nom'} » créée`);
    }
    if (action === 'copier') choisirUnivers(page, stockage, u, type);
  });

  const form = page.querySelector('form');
  form.elements.nom.value = type.nom;
  form.elements.couleur.value = type.couleur;
  form.querySelector(`[value="${type.icone}"]`)?.setAttribute('checked', '');
  const enregistrer = () => stockage.put('typesFiches', type);

  form.addEventListener('input', e => {
    type[e.target.name] = e.target.value;
    enregistrer();
  });

  const liste = page.querySelector('.cases');
  const afficherCases = () => liste.replaceChildren(...type.cases.map((c, i) => {
    const li = document.createElement('li');
    li.className = 'carte case';
    li.dataset.index = i;
    li.innerHTML = `<div class="case-ligne">
        <label>Nom de la case <input name="nom" autocomplete="off"></label>
        <label>Sorte <select name="sorte">
          ${Object.entries(SORTES).map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}
        </select></label>
      </div>
      <label data-pour="liste">Choix possibles (un par ligne) <textarea name="choix" rows="4"></textarea></label>
      <label data-pour="fiche fiches">Fiches proposées <select name="typeCibleId"><option value="">Tous les types</option></select></label>
      <div class="actions">
        <button type="button" data-action="monter" aria-label="Monter la case"${i ? '' : ' disabled'}>↑</button>
        <button type="button" data-action="descendre" aria-label="Descendre la case"${i < type.cases.length - 1 ? '' : ' disabled'}>↓</button>
        <button type="button" data-action="retirer" class="danger">Retirer la case</button>
      </div>`;
    const champ = n => li.querySelector(`[name="${n}"]`);
    [type, ...autres].forEach(t => champ('typeCibleId').add(new Option(`${t.nom || 'Sans nom'}`, t.id)));
    champ('nom').value = c.nom;
    champ('sorte').value = c.sorte;
    champ('choix').value = (c.choix || []).join('\n');
    champ('typeCibleId').value = c.typeCibleId || '';
    li.querySelectorAll('[data-pour]').forEach(l => { l.hidden = !l.dataset.pour.split(' ').includes(c.sorte); });
    return li;
  }));
  afficherCases();

  liste.addEventListener('input', e => {
    const li = e.target.closest('li');
    const c = type.cases[li.dataset.index];
    const { name, value } = e.target;
    if (name === 'choix') c.choix = value.split('\n').map(x => x.trim()).filter(Boolean);
    else if (name === 'typeCibleId') c.typeCibleId = value || null;
    else c[name] = value;
    if (name === 'sorte') li.querySelectorAll('[data-pour]').forEach(l => { l.hidden = !l.dataset.pour.split(' ').includes(value); });
    enregistrer();
  });

  page.addEventListener('click', async e => {
    const bouton = e.target.closest('[data-action]');
    const action = bouton?.dataset.action;
    const i = +bouton?.closest('li')?.dataset.index;
    if (action === 'ajouter') {
      type.cases.push(nouvelleCase());
      afficherCases();
      liste.lastChild.querySelector('input').select();
      await enregistrer();
    }
    if (action === 'monter' || action === 'descendre') {
      const j = action === 'monter' ? i - 1 : i + 1;
      [type.cases[i], type.cases[j]] = [type.cases[j], type.cases[i]];
      afficherCases();
      liste.children[j].querySelector(`[data-action="${action}"]:not(:disabled)`)?.focus();
      await enregistrer();
    }
    if (action === 'retirer'
      && confirm(`Retirer la case « ${type.cases[i].nom} » ? Ce qui y est écrit dans les fiches ne sera plus affiché.`)) {
      type.cases.splice(i, 1);
      afficherCases();
      await enregistrer();
    }
    if (action === 'supprimer') await demanderSuppression(page, stockage, u, type, autres);
  });
}

// Petite fenêtre « Vers quel univers ? » : un bouton par autre univers.
async function choisirUnivers(page, stockage, u, type) {
  const univers = (await stockage.tous('univers')).filter(x => !x.corbeille && x.id !== u.id)
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const dialogue = document.createElement('dialog');
  dialogue.className = 'carte';
  dialogue.innerHTML = `<h2></h2>
    <p>${univers.length ? 'Vers quel univers ? Seuls le type et ses cases sont copiés, pas les fiches' : 'Il n’y a pas d’autre univers'}</p>
    <div class="choix-types choix-univers">${univers.map((x, i) =>
      `<button type="button" data-i="${i}" style="--couleur-univers:${x.couleur}"><i></i><span></span></button>`).join('')}</div>
    <div class="actions"><button type="button" data-action="annuler">Annuler</button></div>`;
  dialogue.querySelector('h2').textContent = `Copier « ${type.nom || 'Sans nom'} »`;
  univers.forEach((x, i) => { dialogue.querySelector(`[data-i="${i}"] span`).textContent = x.nom || 'Sans nom'; });
  dialogue.addEventListener('click', async e => {
    const b = e.target.closest('[data-i]');
    if (b) {
      const cible = univers[b.dataset.i];
      const copie = await copierType(stockage, type, cible);
      message(`« ${copie.nom} » copié dans ${cible.nom || 'Sans nom'}`);
    }
    if (b || e.target.closest('[data-action="annuler"]')) dialogue.close();
  });
  dialogue.addEventListener('close', () => dialogue.remove());
  page.append(dialogue);
  dialogue.showModal();
}

// Avertit, puis propose de déplacer les fiches vers un autre type ; les autres vont à la corbeille.
async function demanderSuppression(page, stockage, u, type, autres) {
  const nom = type.nom || 'Sans nom';
  const fiches = (await stockage.query('fiches', 'typeId', type.id)).filter(f => !f.corbeille);
  const retour = async (destinations, nouveaux) => {
    const avant = await supprimerType(stockage, type, destinations, nouveaux);
    location.hash = `#/univers/${encodeURIComponent(u.id)}/types`;
    message(`Type « ${nom} » mis à la corbeille`, async () => {
      await stockage.lot(avant);
      location.hash = `#/univers/${encodeURIComponent(u.id)}/types/${encodeURIComponent(type.id)}`;
    });
  };
  if (!fiches.length) {
    await retour(); // rien à décider : il va à la corbeille, et « Annuler » reste possible
    return;
  }
  if (!confirm(`Attention : ${pluriel(fiches.length, 'fiche')} utilise${fiches.length > 1 ? 'nt' : ''} le type « ${nom} ».\n`
    + 'Si vous continuez, vous pourrez les déplacer vers un autre type ; les autres iront à la corbeille.')) return;

  const dialogue = document.createElement('dialog');
  dialogue.className = 'carte';
  dialogue.innerHTML = `<h2></h2>
    <p>Choisissez le type d’arrivée de chaque fiche. Celles laissées sur « Corbeille » y seront placées.
      Ce qui est écrit dans une case passe dans la case du même nom du nouveau type.</p>
    <label>Toutes les fiches vers <select name="toutes"></select></label>
    <button type="button" data-action="creer">Créer un nouveau type</button>
    <ul class="fiches-a-deplacer"></ul>
    <div class="actions">
      <button type="button" data-action="annuler">Annuler</button>
      <button type="button" data-action="confirmer" class="danger">Supprimer le type</button>
    </div>`;
  dialogue.querySelector('h2').textContent = `Supprimer « ${nom} »`;
  const ul = dialogue.querySelector('ul');
  for (const f of fiches) {
    const li = document.createElement('li');
    li.innerHTML = '<label><span></span> <select></select></label>';
    li.querySelector('span').textContent = f.nom || 'Sans nom';
    li.querySelector('select').dataset.fiche = f.id;
    ul.append(li);
  }
  const selects = () => dialogue.querySelectorAll('select');
  const ajouterOption = t => selects().forEach(s => s.add(new Option(`${t.nom || 'Sans nom'}`, t.id)));
  selects().forEach(s => s.add(new Option('Corbeille', '')));
  autres.forEach(ajouterOption);

  const nouveaux = [];
  const toutes = dialogue.querySelector('[name="toutes"]');
  const toutDeplacer = () => selects().forEach(s => { s.value = toutes.value; });
  toutes.addEventListener('change', toutDeplacer);

  dialogue.addEventListener('click', async e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'creer') {
      const n = prompt('Nom du nouveau type :', type.nom)?.trim();
      if (!n) return;
      // Mêmes cases que le type supprimé, pour que rien de ce qui est écrit ne se perde.
      const t = nouveauType(u.id, { nom: n, icone: type.icone, couleur: type.couleur, ordre: type.ordre,
        cases: type.cases.map(c => nouvelleCase({ ...c, id: undefined })) });
      nouveaux.push(t);
      ajouterOption(t);
      toutes.value = t.id;
      toutDeplacer();
    }
    if (action === 'annuler') dialogue.close();
    if (action === 'confirmer') {
      const destinations = new Map([...dialogue.querySelectorAll('[data-fiche]')].map(s => [s.dataset.fiche, s.value || null]));
      dialogue.close();
      await retour(destinations, nouveaux);
    }
  });
  dialogue.addEventListener('close', () => dialogue.remove());
  page.append(dialogue);
  dialogue.showModal();
}
