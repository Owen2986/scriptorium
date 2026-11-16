import { iconeSvg, typesUnivers } from '../../modele/types.js';
import { nouvelleFiche, fichesUnivers, parentesPossibles } from '../../modele/fiches.js';
import { nouvelId } from '../../modele/univers.js';
import { urlImage } from '../../ui/images.js';
import { editeur } from '../../ui/texte-riche.js';
import { ouvrirUnivers } from './commun.js';

const ETOILE = '<svg class="icone" aria-hidden="true"><use href="icones/types.svg#round-star"></use></svg>';
const lienFiche = (u, f) => `#/univers/${encodeURIComponent(u.id)}/fiches/${encodeURIComponent(f.id)}`;

// Petite info sous le nom : la première liste de choix du type, et la fiche parente.
function infoFiche(f, type, parId) {
  const liste = type?.cases.find(c => c.sorte === 'liste' && f.valeurs?.[c.id]);
  const parent = parId.get(f.parentId);
  return [liste && f.valeurs[liste.id], parent && `dans ${parent.nom || 'Sans nom'}`].filter(Boolean).join(' · ');
}

async function creer(stockage, u, type) {
  const f = nouvelleFiche(u.id, type.id);
  await stockage.put('fiches', f);
  location.hash = lienFiche(u, f);
}

// Liste des fiches d'un univers, groupées par type, avec un filtre.
export async function vueFiches(page, { id }, { stockage }) {
  const u = await ouvrirUnivers(page, id, stockage, '/fiches');
  if (!u) return;
  const types = await typesUnivers(stockage, u.id);
  const fiches = await fichesUnivers(stockage, u.id);
  const parId = new Map(fiches.map(f => [f.id, f]));
  const vignettes = new Map(await Promise.all(fiches.map(async f => [f.id, await urlImage(stockage, f.imageId)])));
  let filtre = 'tous';

  page.insertAdjacentHTML('beforeend', `<div class="titre-page">
      <h1>Fiches</h1>
      <button type="button" class="principal" data-action="nouvelle">Nouvelle fiche</button>
    </div>
    <div class="filtre" role="group" aria-label="Filtrer les fiches">
      <button type="button" data-filtre="tous" aria-pressed="true">Tous</button>
      ${types.map(t => `<button type="button" data-filtre="${t.id}" aria-pressed="false"></button>`).join('')}
      <button type="button" data-filtre="favoris" aria-pressed="false">${ETOILE} Favoris</button>
    </div>
    <div class="sections-fiches"></div>`);
  types.forEach(t => { page.querySelector(`[data-filtre="${t.id}"]`).textContent = t.nom || 'Sans nom'; });
  const sections = page.querySelector('.sections-fiches');

  const afficher = () => {
    const visibles = fiches.filter(f => filtre === 'tous' || (filtre === 'favoris' ? f.favori : f.typeId === filtre));
    sections.replaceChildren(...types.map(t => {
      const siennes = visibles.filter(f => f.typeId === t.id);
      if (!siennes.length) return '';
      const s = document.createElement('section');
      s.className = 'section-type';
      s.style.setProperty('--couleur-type', t.couleur);
      s.innerHTML = `<h2>${iconeSvg(t.icone)} <span></span> <small>${siennes.length}</small></h2><ul class="rangs"></ul>`;
      s.querySelector('h2 span').textContent = t.nom || 'Sans nom';
      s.querySelector('ul').append(...siennes.map(f => {
        const li = document.createElement('li');
        li.className = 'carte rang';
        const url = vignettes.get(f.id);
        li.innerHTML = `<a class="rang-lien"><span class="vignette-fiche">${url ? `<img alt="" src="${url}">` : iconeSvg(t.icone)}</span>
            <span class="rang-nom"><strong></strong><small></small></span></a>
          <button type="button" class="etoile" data-favori="${f.id}" aria-pressed="${!!f.favori}" aria-label="Favori">${ETOILE}</button>`;
        li.querySelector('a').href = lienFiche(u, f);
        li.querySelector('strong').textContent = f.nom || 'Sans nom';
        li.querySelector('small').textContent = infoFiche(f, t, parId);
        return li;
      }));
      return s;
    }));
    if (!sections.children.length) {
      sections.innerHTML = `<p class="vide">${fiches.length ? 'Aucune fiche pour ce filtre' : 'Aucune fiche pour l’instant'}</p>`;
    }
  };
  afficher();

  page.addEventListener('click', async e => {
    const filtreBouton = e.target.closest('[data-filtre]');
    if (filtreBouton) {
      filtre = filtreBouton.dataset.filtre;
      page.querySelectorAll('[data-filtre]').forEach(b => b.setAttribute('aria-pressed', b === filtreBouton));
      afficher();
    }
    const favori = e.target.closest('[data-favori]');
    if (favori) {
      const f = parId.get(favori.dataset.favori);
      f.favori = !f.favori;
      favori.setAttribute('aria-pressed', f.favori);
      await stockage.put('fiches', f);
      if (filtre === 'favoris') afficher();
    }
    if (e.target.closest('[data-action="nouvelle"]')) {
      const type = types.find(t => t.id === filtre);
      if (type) return creer(stockage, u, type);
      if (types.length === 1) return creer(stockage, u, types[0]);
      if (!types.length) return alert('Créez d’abord un type de fiche (onglet « Types de fiches »).');
      choisirType(page, types, t => creer(stockage, u, t));
    }
  });
}

// Petite fenêtre « Quel type ? » avec un bouton par type.
function choisirType(page, types, choisi) {
  const dialogue = document.createElement('dialog');
  dialogue.className = 'carte';
  dialogue.innerHTML = `<h2>Nouvelle fiche</h2><p>Quel type ?</p>
    <div class="choix-types">${types.map((t, i) =>
      `<button type="button" data-i="${i}" style="--couleur-type:${t.couleur}">${iconeSvg(t.icone)} <span></span></button>`).join('')}</div>
    <div class="actions"><button type="button" data-action="annuler">Annuler</button></div>`;
  types.forEach((t, i) => { dialogue.querySelector(`[data-i="${i}"] span`).textContent = t.nom || 'Sans nom'; });
  dialogue.addEventListener('click', e => {
    const b = e.target.closest('[data-i]');
    if (b) choisi(types[b.dataset.i]);
    if (b || e.target.closest('[data-action="annuler"]')) dialogue.close();
  });
  dialogue.addEventListener('close', () => dialogue.remove());
  page.append(dialogue);
  dialogue.showModal();
}

// Page d'une fiche : tout s'enregistre automatiquement.
export async function vueFiche(page, { id, ficheId }, { stockage }) {
  const u = await ouvrirUnivers(page, id, stockage, '/fiches');
  if (!u) return;
  const fiche = await stockage.get('fiches', ficheId);
  if (!fiche || fiche.universId !== u.id || fiche.corbeille) {
    page.insertAdjacentHTML('beforeend', '<h1>Fiche introuvable</h1>');
    return;
  }
  const types = await typesUnivers(stockage, u.id);
  const type = types.find(t => t.id === fiche.typeId);
  const fiches = await fichesUnivers(stockage, u.id);
  fiche.valeurs ??= {};
  fiche.galerie ??= [];
  fiche.etiquettes ??= [];

  const article = document.createElement('article');
  article.className = 'fiche';
  article.style.setProperty('--couleur-type', type?.couleur ?? 'var(--texte-doux)');
  article.innerHTML = `<div class="tete-fiche">
      <div class="titre-fiche">
        <input class="nom-fiche" name="nom" autocomplete="off" aria-label="Nom de la fiche">
        <span class="type-fiche">${iconeSvg(type?.icone)} <span class="nom-type"></span> <span class="etat" aria-live="polite"></span></span>
      </div>
      <button type="button" class="etoile" data-action="favori" aria-pressed="${!!fiche.favori}" aria-label="Favori">${ETOILE}</button>
    </div>
    <div class="corps-fiche">
      <div class="colonne-texte">
        <div class="zone-texte"></div>
        <details class="carte secrets"${fiche.secrets ? ' open' : ''}>
          <summary><svg class="icone" aria-hidden="true"><use href="icones/types.svg#key"></use></svg> Secrets et notes d’auteur</summary>
          <textarea name="secrets" rows="4" aria-label="Secrets et notes d’auteur"></textarea>
        </details>
      </div>
      <aside class="carte cote-fiche">
        <input type="file" id="image-fiche" name="image" accept="image/*" class="cache">
        <label class="portrait" for="image-fiche"></label>
        <div class="actions actions-image">
          <label class="bouton" for="image-fiche">Changer l’image</label>
          <button type="button" data-action="retirer-image">Retirer</button>
        </div>
        <h3>Galerie</h3>
        <ul class="galerie"></ul>
        <h3 class="titre-cases"></h3>
        <div class="cases-fiche"></div>
        <h3>Rangement</h3>
        <label>Fiche parente <select name="parentId"><option value="">Aucune</option></select></label>
        <ul class="etiquettes" aria-label="Étiquettes"></ul>
        <form class="ajout-etiquette"><input name="etiquette" placeholder="Étiquette" aria-label="Nouvelle étiquette" autocomplete="off">
          <button type="submit">Ajouter</button></form>
      </aside>
    </div>`;
  page.append(article);
  const $ = s => article.querySelector(s);
  $('.nom-fiche').value = fiche.nom;
  $('.nom-type').textContent = type?.nom || 'Type supprimé';
  $('.titre-cases').textContent = type?.nom || 'Cases';
  $('[name="secrets"]').value = fiche.secrets || '';

  // « Enregistré » s'affiche 2 secondes après chaque modification.
  const etat = $('.etat');
  let minuterie;
  const enregistrer = async () => {
    clearTimeout(minuterie);
    etat.textContent = '· Enregistrement…';
    fiche.modifieLe = Date.now();
    await stockage.put('fiches', fiche);
    etat.textContent = '· Enregistré';
    minuterie = setTimeout(() => { etat.textContent = ''; }, 2000);
  };

  editeur($('.zone-texte'), fiche.texte, html => { fiche.texte = html; enregistrer(); });

  // Cases du type.
  const cases = $('.cases-fiche');
  for (const c of type?.cases ?? []) {
    const label = document.createElement('label');
    if (c.sorte === 'texte' || c.sorte === 'fiche') label.className = 'large'; // les cases courtes vont par deux
    label.textContent = c.nom || 'Sans nom';
    const v = fiche.valeurs[c.id];
    let champ;
    if (c.sorte === 'liste' || c.sorte === 'fiche') {
      champ = document.createElement('select');
      champ.add(new Option('—', ''));
      const options = c.sorte === 'liste' ? (c.choix || []).map(x => [x, x])
        : fiches.filter(f => f.id !== fiche.id && (!c.typeCibleId || f.typeId === c.typeCibleId)).map(f => [f.nom || 'Sans nom', f.id]);
      options.forEach(([texte, valeur]) => champ.add(new Option(texte, valeur)));
      if (v !== undefined && ![...champ.options].some(o => o.value === String(v))) champ.add(new Option(String(v), v));
    } else {
      champ = document.createElement('input');
      champ.type = c.sorte === 'nombre' ? 'number' : 'text';
      champ.autocomplete = 'off';
    }
    champ.value = v ?? '';
    champ.dataset.case = c.id;
    label.append(champ);
    cases.append(label);
  }
  if (!type?.cases.length) cases.innerHTML = '<p class="vide">Aucune case pour ce type</p>';

  // Fiche parente.
  const parent = $('[name="parentId"]');
  parentesPossibles(fiche, fiches).forEach(f => parent.add(new Option(f.nom || 'Sans nom', f.id)));
  parent.value = fiche.parentId ?? '';

  article.addEventListener('input', e => {
    const t = e.target;
    if (t.name === 'nom' || t.name === 'secrets') fiche[t.name] = t.value;
    else if (t.name === 'parentId') fiche.parentId = t.value || null;
    else if (t.dataset.case) {
      const c = type.cases.find(x => x.id === t.dataset.case);
      if (t.value === '') delete fiche.valeurs[c.id];
      else fiche.valeurs[c.id] = c.sorte === 'nombre' ? Number(t.value) : t.value;
    } else return;
    enregistrer();
  });

  // Images : principale et galerie.
  const ajouterImage = async fichier => {
    const img = { id: nouvelId(), universId: u.id, fichier };
    await stockage.put('images', img);
    return img.id;
  };
  const afficherPortrait = async () => {
    const url = await urlImage(stockage, fiche.imageId);
    const cadre = $('.portrait');
    cadre.classList.toggle('vide', !url);
    cadre.innerHTML = url ? `<img src="${url}">` : `${iconeSvg(type?.icone)}<span>Ajouter une image</span>`;
    $('.portrait img')?.setAttribute('alt', `Image de ${fiche.nom || 'la fiche'}`);
    $('.actions-image').hidden = !url; // sans image, c'est le cadre lui-même qui sert à en ajouter une
  };
  const afficherGalerie = async () => {
    const ul = $('.galerie');
    ul.replaceChildren(...await Promise.all(fiche.galerie.map(async (imgId, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<a target="_blank" rel="noopener" href="${await urlImage(stockage, imgId) ?? '#'}"><img alt="Image ${i + 1} de la galerie"></a>
        <button type="button" data-retirer="${i}" aria-label="Retirer l’image ${i + 1}">×</button>`;
      li.querySelector('img').src = li.querySelector('a').href;
      return li;
    })));
    const ajout = document.createElement('li');
    ajout.innerHTML = '<label class="ajout-galerie" title="Ajouter des images"><span aria-hidden="true">+</span>'
      + '<input type="file" name="galerie" accept="image/*" multiple aria-label="Ajouter des images à la galerie"></label>';
    ul.append(ajout);
  };
  await afficherPortrait();
  await afficherGalerie();

  article.addEventListener('change', async e => {
    if (e.target.name === 'image' && e.target.files[0]) {
      const ancien = fiche.imageId;
      fiche.imageId = await ajouterImage(e.target.files[0]);
      await enregistrer();
      if (ancien) await stockage.delete('images', ancien);
      await afficherPortrait();
    }
    if (e.target.name === 'galerie' && e.target.files.length) {
      for (const f of e.target.files) fiche.galerie.push(await ajouterImage(f));
      await enregistrer();
      await afficherGalerie();
    }
  });

  // Étiquettes.
  const afficherEtiquettes = () => $('.etiquettes').replaceChildren(...fiche.etiquettes.map((et, i) => {
    const li = document.createElement('li');
    li.className = 'etiquette';
    li.innerHTML = `<span></span><button type="button" data-etiquette="${i}" aria-label="Retirer l’étiquette">×</button>`;
    li.querySelector('span').textContent = et;
    li.querySelector('button').setAttribute('aria-label', `Retirer l’étiquette ${et}`);
    return li;
  }));
  afficherEtiquettes();
  $('.ajout-etiquette').addEventListener('submit', e => {
    e.preventDefault();
    const champ = e.target.elements.etiquette;
    const et = champ.value.trim();
    if (et && !fiche.etiquettes.includes(et)) {
      fiche.etiquettes.push(et);
      afficherEtiquettes();
      enregistrer();
    }
    champ.value = '';
  });

  article.addEventListener('click', async e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'favori') {
      fiche.favori = !fiche.favori;
      e.target.closest('button').setAttribute('aria-pressed', fiche.favori);
      await enregistrer();
    }
    if (action === 'retirer-image') {
      const ancien = fiche.imageId;
      fiche.imageId = null;
      await enregistrer();
      await stockage.delete('images', ancien);
      await afficherPortrait();
    }
    const g = e.target.closest('[data-retirer]');
    if (g && confirm('Retirer cette image de la galerie ?')) {
      const [retiree] = fiche.galerie.splice(+g.dataset.retirer, 1);
      await enregistrer();
      await stockage.delete('images', retiree);
      await afficherGalerie();
    }
    const et = e.target.closest('[data-etiquette]');
    if (et) {
      fiche.etiquettes.splice(+et.dataset.etiquette, 1);
      afficherEtiquettes();
      await enregistrer();
    }
  });

  // Nouvelle fiche : le nom est sélectionné pour être remplacé tout de suite.
  if (fiche.nom === 'Nouvelle fiche') setTimeout(() => $('.nom-fiche').select());
}
