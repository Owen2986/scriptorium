import { nouvelId } from '../../modele/univers.js';
import { nouveauTome, tomesUnivers, TRIS_TOMES, motsTome, dupliquerTome } from '../../modele/tomes.js';
import { mettreALaCorbeille } from '../../modele/corbeille.js';
import { urlImage } from '../../ui/images.js';
import { dessin } from '../../ui/icones.js';
import { message } from '../../ui/message.js';
import { ouvrirUnivers } from './commun.js';

const lienTome = (u, t) => `#/univers/${encodeURIComponent(u.id)}/manuscrit/${encodeURIComponent(t.id)}`;
const nombre = n => n.toLocaleString('fr');
const mots = (n, objectif) => `${nombre(n)} mot${n > 1 ? 's' : ''}${objectif ? ` sur ${nombre(objectif)}` : ''}`;
const barre = (n, objectif) => objectif
  ? `<div class="progression"><i style="width:${Math.min(100, n / objectif * 100)}%"></i></div>` : '';
const initiale = t => (t.titre || 'S').trim().charAt(0).toUpperCase();

// Tri et affichage de la liste des tomes, propres à l'appareil.
const CLE = 'scriptorium.tomes';
function lirePref() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(CLE)) || {}; } catch { /* stockage indisponible */ }
  return { tri: Object.hasOwn(TRIS_TOMES, p.tri) ? p.tri : 'ordre', vue: p.vue === 'cartes' ? 'cartes' : 'liste' };
}
function garderPref(p) {
  try { localStorage.setItem(CLE, JSON.stringify(p)); } catch { /* le choix vaut pour cette visite */ }
}

// Liste des tomes d'un univers, en lignes ou en cartes.
export async function vueManuscrit(page, { id }, { stockage }) {
  const u = await ouvrirUnivers(page, id, stockage, '/manuscrit');
  if (!u) return;
  const tomes = await tomesUnivers(stockage, u.id);
  const infos = new Map(await Promise.all(tomes.map(async t =>
    [t.id, { mots: await motsTome(stockage, t.id), url: await urlImage(stockage, t.couvertureId) }])));
  const pref = lirePref();

  page.insertAdjacentHTML('beforeend', `<div class="titre-page">
      <h1>Manuscrit</h1>
      <button type="button" class="principal" data-action="nouveau">Nouveau tome</button>
    </div>
    <div class="reglage-liste reglage-tomes">
      <select aria-label="Trier les tomes">${Object.entries(TRIS_TOMES).map(([k, [libelle]]) =>
        `<option value="${k}"${k === pref.tri ? ' selected' : ''}>${libelle}</option>`).join('')}</select>
      <div class="bascule" role="group" aria-label="Affichage">
        <button type="button" data-vue="liste" aria-label="Liste" aria-pressed="${pref.vue === 'liste'}">${dessin('vue-liste')}</button>
        <button type="button" data-vue="cartes" aria-label="Cartes" aria-pressed="${pref.vue === 'cartes'}">${dessin('vue-cartes')}</button>
      </div>
    </div>
    <ul class="liste-tomes"></ul>`);
  const liste = page.querySelector('.liste-tomes');

  const afficher = () => {
    const cartes = pref.vue === 'cartes';
    const ranges = [...tomes].sort(TRIS_TOMES[pref.tri][1]);
    const fleches = !cartes && pref.tri === 'ordre';
    liste.className = `liste-tomes ${cartes ? 'cartes-tomes' : 'rangs-tomes'}`;
    liste.replaceChildren(...ranges.map((t, i) => {
      const { mots: n, url } = infos.get(t.id);
      const image = url ? `<img alt="" src="${url}">` : initiale(t);
      const li = document.createElement('li');
      li.dataset.id = t.id;
      li.innerHTML = cartes
        ? `<a class="carte carte-univers"><div class="garde" aria-hidden="true">${image}</div>
            <div class="corps"><small class="numero"></small><h2></h2><p></p>
            <div class="mots">${mots(n, t.objectif)}</div>${barre(n, t.objectif)}</div></a>`
        : `<div class="carte rang rang-tome"><a class="rang-lien"><span class="vignette-tome" aria-hidden="true">${image}</span>
            <span class="rang-nom"><strong></strong><small><span class="numero"></span> · ${mots(n, t.objectif)}</small>${barre(n, t.objectif)}</span></a>
            ${fleches ? `<span class="deplacer">
              <button type="button" data-action="monter" aria-label="Monter"${i ? '' : ' disabled'}>↑</button>
              <button type="button" data-action="descendre" aria-label="Descendre"${i < ranges.length - 1 ? '' : ' disabled'}>↓</button>
            </span>` : ''}</div>`;
      li.querySelector('a').href = lienTome(u, t);
      li.querySelector(cartes ? 'h2' : 'strong').textContent = t.titre || 'Sans titre';
      li.querySelector('.numero').textContent = `Tome ${tomes.indexOf(t) + 1}`;
      if (cartes) li.querySelector('p').textContent = t.resume;
      return li;
    }));
    if (!tomes.length) liste.innerHTML = '<li class="vide">Aucun tome pour l’instant</li>';
  };
  afficher();

  page.querySelector('.reglage-tomes select').addEventListener('change', e => {
    pref.tri = e.target.value;
    garderPref(pref);
    afficher();
  });
  page.addEventListener('click', async e => {
    const vue = e.target.closest('[data-vue]');
    if (vue) {
      pref.vue = vue.dataset.vue;
      page.querySelectorAll('[data-vue]').forEach(b => b.setAttribute('aria-pressed', b === vue));
      garderPref(pref);
      afficher();
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'nouveau') {
      const t = nouveauTome(u.id);
      await stockage.put('tomes', t);
      location.hash = lienTome(u, t);
    }
    if (action === 'monter' || action === 'descendre') {
      const i = tomes.findIndex(t => t.id === e.target.closest('li').dataset.id);
      const j = action === 'monter' ? i - 1 : i + 1;
      [tomes[i].ordre, tomes[j].ordre] = [tomes[j].ordre, tomes[i].ordre];
      if (tomes[i].ordre === tomes[j].ordre) tomes[j].ordre += action === 'monter' ? 1 : -1;
      const [a, b] = [tomes[i], tomes[j]];
      tomes.sort(TRIS_TOMES.ordre[1]);
      afficher();
      liste.children[j].querySelector(`[data-action="${action}"]:not(:disabled)`)?.focus();
      await stockage.lot([['put', 'tomes', a], ['put', 'tomes', b]]);
    }
  });
}

// Page d'un tome : titre, résumé, couverture, objectif ; tout s'enregistre tout seul.
export async function vueTome(page, { id, tomeId }, { stockage }) {
  const u = await ouvrirUnivers(page, id, stockage, '/manuscrit');
  if (!u) return;
  const tome = await stockage.get('tomes', tomeId);
  if (!tome || tome.universId !== u.id || tome.corbeille) {
    page.insertAdjacentHTML('beforeend', '<h1>Tome introuvable</h1>');
    return;
  }
  const n = await motsTome(stockage, tome.id);
  const retour = `#/univers/${encodeURIComponent(u.id)}/manuscrit`;

  page.insertAdjacentHTML('beforeend', `<p><a href="${retour}">← Manuscrit</a></p>
    <form class="carte presentation page-tome">
      <div class="cote">
        <input type="file" id="couverture-tome" name="couverture" accept="image/*" class="cache">
        <label class="garde" for="couverture-tome" title="Changer l’image"></label>
        <div class="actions actions-couverture">
          <label class="bouton" for="couverture-tome">Changer l’image</label>
          <button type="button" data-action="retirer">Retirer</button>
        </div>
      </div>
      <div>
        <label>Titre <input name="titre" autocomplete="off"></label>
        <label>Résumé <textarea name="resume" rows="4"></textarea></label>
        <div class="ligne-objectif">
          <label>Objectif de mots <input type="number" name="objectif" min="0" step="1000" placeholder="Facultatif"></label>
          <div class="avancee"><small class="vide"></small><span class="barre"></span></div>
        </div>
      </div>
    </form>
    <div class="actions">
      <button type="button" class="principal" data-action="ecrire">Écrire</button>
      <button type="button" data-action="dupliquer">Dupliquer le tome</button>
      <button type="button" class="danger" data-action="supprimer">Supprimer le tome</button>
    </div>
    <h2>Plan</h2>
    <p class="vide">Le plan arrivera bientôt</p>`);

  const form = page.querySelector('form');
  const champs = form.elements;
  champs.titre.value = tome.titre;
  champs.resume.value = tome.resume;
  champs.objectif.value = tome.objectif ?? '';

  const afficherAvancee = () => {
    form.querySelector('.avancee small').textContent =
      mots(n, tome.objectif) + (tome.objectif ? ` · ${Math.floor(n / tome.objectif * 100)} %` : '');
    form.querySelector('.avancee .barre').innerHTML = barre(n, tome.objectif);
  };
  afficherAvancee();

  const afficherCouverture = async () => {
    const url = await urlImage(stockage, tome.couvertureId);
    const garde = form.querySelector('.garde');
    garde.innerHTML = url ? `<img alt="Couverture du tome" src="${url}">` : '';
    if (!url) garde.textContent = initiale(tome);
    form.querySelector('.actions-couverture').hidden = !url; // sans image, le cadre lui-même sert à en choisir une
  };
  await afficherCouverture();

  form.addEventListener('input', e => {
    const { name, value } = e.target;
    if (name === 'objectif') {
      tome.objectif = value === '' ? null : Math.max(0, Math.round(Number(value))) || null;
      afficherAvancee();
    } else if (name === 'titre' || name === 'resume') tome[name] = value;
    else return;
    if (name === 'titre' && !tome.couvertureId) form.querySelector('.garde').textContent = initiale(tome);
    stockage.put('tomes', tome);
  });

  const changerCouverture = async fichier => {
    const ops = tome.couvertureId ? [['delete', 'images', tome.couvertureId]] : [];
    tome.couvertureId = null;
    if (fichier) {
      tome.couvertureId = nouvelId();
      ops.push(['put', 'images', { id: tome.couvertureId, universId: u.id, fichier }]);
    }
    await stockage.lot([...ops, ['put', 'tomes', tome]]);
    await afficherCouverture();
  };
  champs.couverture.addEventListener('change', e => e.target.files[0] && changerCouverture(e.target.files[0]));

  page.addEventListener('click', async e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'retirer') await changerCouverture(null);
    if (action === 'ecrire') message('L’écran d’écriture arrive bientôt');
    if (action === 'dupliquer') {
      const copie = await dupliquerTome(stockage, tome);
      location.hash = lienTome(u, copie);
      message(`Copie de « ${tome.titre || 'Sans titre'} » créée`);
    }
    if (action === 'supprimer') {
      await mettreALaCorbeille(stockage, 'tome', tome);
      location.hash = retour;
      message(`« ${tome.titre || 'Sans titre'} » mis à la corbeille`, async () => {
        await stockage.put('tomes', tome);
        location.hash = lienTome(u, tome);
      });
    }
  });

  // Nouveau tome : le titre est sélectionné pour être remplacé tout de suite.
  if (tome.titre === 'Nouveau tome') setTimeout(() => champs.titre.select());
}
