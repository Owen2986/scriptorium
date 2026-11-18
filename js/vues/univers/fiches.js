import { iconeSvg, typesUnivers } from '../../modele/types.js';
import { nouvelleFiche, fichesUnivers, parentesPossibles, dupliquerFiche } from '../../modele/fiches.js';
import { nouvelId } from '../../modele/univers.js';
import { mettreALaCorbeille } from '../../modele/corbeille.js';
import { lireReglages } from '../../modele/reglages.js';
import { etatFiche, memeEtat, differences, versionsFiche, garderVersion } from '../../modele/versions.js';
import { urlImage } from '../../ui/images.js';
import { dessin } from '../../ui/icones.js';
import { message } from '../../ui/message.js';
import { editeur, depuisTexteBrut, nettoyer } from '../../ui/texte-riche.js';
import { cle, indexNoms, renommerLiens } from '../../modele/liens.js';
import { decorerLiens, bulleLiens } from '../../ui/liens.js';
import { ouvrirUnivers } from './commun.js';
import { exporter } from './export.js';

const ETOILE = '<svg class="icone" aria-hidden="true"><use href="icones/types.svg#round-star"></use></svg>';
export const lienFiche = (u, f) => `#/univers/${encodeURIComponent(u.id)}/fiches/${encodeURIComponent(f.id)}`;

// Petite info sous le nom : la première liste de choix du type, et la fiche parente.
function infoFiche(f, type, parId) {
  const liste = type?.cases.find(c => c.sorte === 'liste' && f.valeurs?.[c.id]);
  const parent = parId.get(f.parentId);
  return [liste && f.valeurs[liste.id], parent && `dans ${parent.nom || 'Sans nom'}`].filter(Boolean).join(' · ');
}

export async function creer(stockage, u, type, nom) {
  const f = nouvelleFiche(u.id, type.id, nom ? { nom } : {});
  await stockage.put('fiches', f);
  location.hash = lienFiche(u, f);
}

// Demande le type (sauf s'il n'y en a qu'un) puis appelle `faire(type)`.
export function avecType(page, types, faire) {
  if (types.length === 1) return faire(types[0]);
  if (!types.length) return alert('Créez d’abord un type de fiche (onglet « Types de fiches »).');
  choisirType(page, types, faire);
}

// Petites pastilles retirables (étiquettes, autres noms) ; `attr` repère le bouton ×.
function pastilles(ul, liste, attr, quoi) {
  ul.replaceChildren(...liste.map((texte, i) => {
    const li = document.createElement('li');
    li.className = 'etiquette';
    li.innerHTML = `<span></span><button type="button" ${attr}="${i}">×</button>`;
    li.querySelector('span').textContent = texte;
    li.querySelector('button').setAttribute('aria-label', `Retirer ${quoi} ${texte}`);
    return li;
  }));
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
      avecType(page, type ? [type] : types, t => creer(stockage, u, t));
    }
  });
}

// Petite fenêtre « Quel type ? » avec un bouton par type.
export function choisirType(page, types, choisi, { titre = 'Nouvelle fiche', question = 'Quel type ?' } = {}) {
  const dialogue = document.createElement('dialog');
  dialogue.className = 'carte';
  dialogue.innerHTML = `<h2></h2><p></p>
    <div class="choix-types">${types.map((t, i) =>
      `<button type="button" data-i="${i}" style="--couleur-type:${t.couleur}">${iconeSvg(t.icone)} <span></span></button>`).join('')}</div>
    <div class="actions"><button type="button" data-action="annuler">Annuler</button></div>`;
  dialogue.querySelector('h2').textContent = titre;
  dialogue.querySelector('p').textContent = question;
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
  fiche.autresNoms ??= [];
  fiche.secrets = depuisTexteBrut(fiche.secrets);
  const liste = fiches.map(f => (f.id === fiche.id ? fiche : f)); // la fiche ouverte, telle qu'on la modifie
  let index = indexNoms(liste);
  const trouver = nom => index.get(cle(nom));

  const article = document.createElement('article');
  article.className = 'fiche';
  article.style.setProperty('--couleur-type', type?.couleur ?? 'var(--texte-doux)');
  article.innerHTML = `<div class="tete-fiche">
      <div class="titre-fiche">
        <input class="nom-fiche" name="nom" autocomplete="off" aria-label="Nom de la fiche">
        <div class="autres-noms"><span>Autres noms :</span><ul class="etiquettes" aria-label="Autres noms"></ul>
          <input name="autreNom" placeholder="+ ajouter" aria-label="Ajouter un autre nom" autocomplete="off" enterkeyhint="done"></div>
        <span class="type-fiche">${iconeSvg(type?.icone)} <span class="nom-type"></span> <span class="etat" aria-live="polite"></span></span>
      </div>
      <button type="button" class="etoile" data-action="favori" aria-pressed="${!!fiche.favori}" aria-label="Favori">${ETOILE}</button>
      <div class="ancre-menu">
        <button type="button" class="bouton-plus" data-action="menu" aria-expanded="false" aria-haspopup="true" aria-label="Plus d’actions">${dessin('points')}</button>
        <ul class="menu" hidden>
          <li><button type="button" data-action="dupliquer">${dessin('copier')}Dupliquer</button></li>
          <li><button type="button" data-action="versions">${dessin('horloge')}Versions</button></li>
          <li><button type="button" data-action="exporter">${dessin('exporter')}Exporter</button></li>
          <li><hr></li>
          <li><button type="button" class="danger" data-action="corbeille">${dessin('poubelle')}Mettre à la corbeille</button></li>
        </ul>
      </div>
    </div>
    <div class="corps-fiche">
      <div class="colonne-texte">
        <div class="zone-texte"></div>
        <details class="carte secrets"${fiche.secrets ? ' open' : ''}>
          <summary><svg class="icone" aria-hidden="true"><use href="icones/types.svg#key"></use></svg> Secrets et notes d’auteur</summary>
          <div class="zone-secrets"></div>
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

  // Texte et secrets, avec les liens [[Nom]] : un clic ouvre une bulle « Ouvrir » ou « Créer la fiche ».
  const decorer = racine => decorerLiens(racine, trouver);
  const afficherTextes = () => {
    editeur($('.zone-texte'), fiche.texte, html => { fiche.texte = html; enregistrer(); }, { decorer });
    editeur($('.zone-secrets'), fiche.secrets, html => { fiche.secrets = html; enregistrer(); },
      { barre: false, nom: 'Secrets et notes d’auteur', decorer });
  };
  afficherTextes();
  const decrire = nom => {
    const f = trouver(nom);
    if (!f) return { info: 'Aucune fiche à ce nom', bouton: 'Créer la fiche', action: () => avecType(page, types, t => creer(stockage, u, t, nom)) };
    const t = types.find(t => t.id === f.typeId);
    return { info: t?.nom ?? '', titre: f.nom, bouton: 'Ouvrir', action: () => { location.hash = lienFiche(u, f); } };
  };
  bulleLiens($('.zone-texte'), decrire);
  bulleLiens($('.zone-secrets'), decrire);
  const redecorer = () => {
    index = indexNoms(liste);
    article.querySelectorAll('.lien').forEach(l => l.classList.toggle('absent', !trouver(l.dataset.nom)));
  };

  // Renommer la fiche met à jour tous les [[Ancien nom]] de l'univers (une fois le nom validé, pas à chaque lettre).
  let nomEnregistre = fiche.nom;
  $('.nom-fiche').addEventListener('change', async () => {
    const ancien = nomEnregistre;
    nomEnregistre = fiche.nom;
    // Si une autre fiche porte aussi l'ancien nom, les liens étaient à elle : on n'y touche pas.
    if (ancien && fiche.nom.trim() && !liste.some(f => f !== fiche && cle(f.nom) === cle(ancien))) {
      const modifiees = await renommerLiens(stockage, liste, ancien, fiche.nom);
      if (modifiees.includes(fiche)) afficherTextes();
      const autres = modifiees.filter(f => f !== fiche).length;
      if (autres) etat.textContent = `· Liens mis à jour dans ${autres} fiche${autres > 1 ? 's' : ''}`;
    }
    redecorer();
  });

  // Autres noms (surnoms), reconnus par les liens comme le nom.
  const afficherAutresNoms = () => pastilles($('.autres-noms ul'), fiche.autresNoms, 'data-autre-nom', 'l’autre nom');
  afficherAutresNoms();
  const champAutreNom = $('[name="autreNom"]');
  const ajouterAutreNom = () => {
    const n = champAutreNom.value.trim();
    champAutreNom.value = '';
    if (!n || [fiche.nom, ...fiche.autresNoms].some(x => cle(x) === cle(n))) return;
    fiche.autresNoms.push(n);
    afficherAutresNoms();
    redecorer();
    enregistrer();
  };
  champAutreNom.addEventListener('change', ajouterAutreNom);
  champAutreNom.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ajouterAutreNom(); } });

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
    if (t.name === 'nom') fiche.nom = t.value;
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
  const afficherEtiquettes = () => pastilles($('.cote-fiche .etiquettes'), fiche.etiquettes, 'data-etiquette', 'l’étiquette');
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
    const autre = e.target.closest('[data-autre-nom]');
    if (autre) {
      fiche.autresNoms.splice(+autre.dataset.autreNom, 1);
      afficherAutresNoms();
      redecorer();
      await enregistrer();
    }
  });

  // Versions : en quittant la fiche (ou l'appli), l'état qu'elle avait à l'ouverture est gardé si elle a changé.
  const { versionsMax } = await lireReglages(stockage);
  let depart = etatFiche(fiche);
  let dateDepart = fiche.modifieLe ?? fiche.creeLe ?? Date.now();
  const garderSiChange = async () => {
    if (memeEtat(depart, etatFiche(fiche))) return;
    const [etatGarde, dateGardee] = [depart, dateDepart];
    [depart, dateDepart] = [etatFiche(fiche), fiche.modifieLe];
    await garderVersion(stockage, fiche, etatGarde, dateGardee, versionsMax);
  };
  const siCachee = () => { if (document.visibilityState === 'hidden') garderSiChange(); };
  const quitter = () => {
    garderSiChange();
    removeEventListener('hashchange', quitter);
    document.removeEventListener('visibilitychange', siCachee);
  };
  addEventListener('hashchange', quitter);
  document.addEventListener('visibilitychange', siCachee);
  const reafficher = () => dispatchEvent(new HashChangeEvent('hashchange'));

  // Menu « Plus ».
  const boutonMenu = $('[data-action="menu"]');
  const menu = $('.menu');
  const ouvrirMenu = ouvert => {
    menu.hidden = !ouvert;
    boutonMenu.setAttribute('aria-expanded', ouvert);
    if (ouvert) menu.querySelector('button').focus();
  };
  boutonMenu.addEventListener('click', () => ouvrirMenu(menu.hidden));
  $('.ancre-menu').addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { ouvrirMenu(false); boutonMenu.focus(); } });
  $('.ancre-menu').addEventListener('focusout', e => { if (!$('.ancre-menu').contains(e.relatedTarget)) ouvrirMenu(false); });
  menu.addEventListener('click', async e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    ouvrirMenu(false);
    const nom = fiche.nom || 'Sans nom';
    if (action === 'dupliquer') {
      const copie = await dupliquerFiche(stockage, fiche);
      location.hash = lienFiche(u, copie);
      message(`Copie de « ${nom} » créée`);
    }
    if (action === 'versions') ouvrirVersions(page, stockage, fiche, async (etat, date) => {
      // Revenir à une version : l'état actuel est d'abord gardé, rien n'est perdu.
      const actuel = etatFiche(fiche);
      await garderVersion(stockage, fiche, actuel, fiche.modifieLe ?? Date.now(), versionsMax);
      Object.assign(fiche, structuredClone(etat), { modifieLe: Date.now() });
      await stockage.put('fiches', fiche);
      [depart, dateDepart] = [etatFiche(fiche), fiche.modifieLe];
      reafficher();
      message(`Version rétablie : ${dateVersion(date).toLowerCase()}`, async () => {
        const f = await stockage.get('fiches', fiche.id);
        await stockage.put('fiches', { ...f, ...actuel, modifieLe: Date.now() });
        reafficher();
      });
    });
    if (action === 'exporter') exporter(page, stockage, u, fiche);
    if (action === 'corbeille') {
      await mettreALaCorbeille(stockage, 'fiche', fiche);
      location.hash = `#/univers/${encodeURIComponent(u.id)}/fiches`;
      message(`« ${nom} » mise à la corbeille`, async () => {
        await stockage.put('fiches', fiche);
        location.hash = lienFiche(u, fiche);
      });
    }
  });

  // Nouvelle fiche : le nom est sélectionné pour être remplacé tout de suite.
  if (fiche.nom === 'Nouvelle fiche') setTimeout(() => $('.nom-fiche').select());
}

// « Aujourd'hui, 21 h 40 », « Hier, 21 h 40 » ou « 15 nov., 18 h 05 ».
function dateVersion(date) {
  const d = new Date(date);
  const heure = `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
  const jours = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 864e5);
  const jour = jours === 0 ? 'Aujourd’hui' : jours === 1 ? 'Hier'
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() && { year: 'numeric' }) });
  return `${jour}, ${heure}`;
}

// Fenêtre « Versions » : dates à gauche, aperçu à droite ; `revenir(etat, date)` rétablit la version choisie.
async function ouvrirVersions(page, stockage, fiche, revenir) {
  const versions = await versionsFiche(stockage, fiche.id);
  const actuel = etatFiche(fiche);
  // Chaque entrée dit ce qui a changé par rapport à la version précédente (plus ancienne).
  const entrees = [{ etat: actuel, date: null }, ...versions].map((v, i, tout) => ({
    ...v, changes: tout[i + 1] ? differences(tout[i + 1].etat, v.etat) || 'rien' : 'première version',
  }));
  const dialogue = document.createElement('dialog');
  dialogue.className = 'carte versions';
  dialogue.innerHTML = `<header><h2></h2><button type="button" data-action="fermer">Fermer</button></header>
    <div class="corps-versions">
      <ul class="liste-versions"></ul>
      <div class="apercu-version"><p class="vide"></p><p class="note-version"></p><h3 class="nom-version"></h3><div class="texte-version"></div></div>
    </div>
    <footer class="actions"><button type="button" class="principal" data-action="revenir">Revenir à cette version</button></footer>`;
  dialogue.querySelector('h2').textContent = `Versions de « ${fiche.nom || 'Sans nom'} »`; // espaces insécables
  const ul = dialogue.querySelector('ul');
  entrees.forEach((v, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" data-i="${i}"><span></span><small></small></button>`;
    li.querySelector('span').textContent = v.date ? dateVersion(v.date) : 'Version actuelle';
    li.querySelector('small').textContent = v.date ? v.changes : 'en cours';
    ul.append(li);
  });
  dialogue.querySelector('footer').hidden = !versions.length;
  if (!versions.length) dialogue.querySelector('.apercu-version .vide').textContent
    = 'Aucune ancienne version pour l’instant : une version est gardée chaque fois que vous quittez la fiche après l’avoir modifiée.';

  let choisie;
  const montrer = i => {
    choisie = entrees[i];
    ul.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', b.dataset.i === String(i)));
    dialogue.querySelector('.note-version').textContent = choisie.date
      ? `Aperçu en lecture seule · ${dateVersion(choisie.date)}` : 'Version actuelle, telle qu’elle est en ce moment';
    dialogue.querySelector('.nom-version').textContent = choisie.etat.nom || 'Sans nom';
    // Aperçu en lecture seule : les liens [[Nom]] sont montrés comme du texte.
    dialogue.querySelector('.texte-version').innerHTML = nettoyer(choisie.etat.texte).replace(/\[\[(.*?)\]\]/g, '$1');
    dialogue.querySelector('[data-action="revenir"]').disabled = !choisie.date;
  };
  montrer(versions.length ? 1 : 0);

  dialogue.addEventListener('click', e => {
    const b = e.target.closest('[data-i]');
    if (b) montrer(+b.dataset.i);
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'fermer') dialogue.close();
    if (action === 'revenir' && choisie.date) { dialogue.close(); revenir(choisie.etat, choisie.date); }
  });
  dialogue.addEventListener('close', () => dialogue.remove());
  page.append(dialogue);
  dialogue.showModal();
}
