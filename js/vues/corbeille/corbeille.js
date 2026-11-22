import { contenuCorbeille, restaurer, supprimerDefinitivement, viderCorbeille } from '../../modele/corbeille.js';
import { iconeSvg, typesUnivers } from '../../modele/types.js';
import { lireReglages } from '../../modele/reglages.js';
import { message } from '../../ui/message.js';
import { choisirType } from '../univers/fiches.js';

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const depuis = date => {
  const jours = Math.floor((Date.now() - date) / 864e5);
  return jours < 1 ? 'aujourd’hui' : jours < 2 ? 'hier' : `il y a ${jours} jours`;
};

// Une seule corbeille pour tout : fiches et types groupés par univers, puis les univers supprimés.
export async function vueCorbeille(page, params, contexte) {
  const { stockage } = contexte;
  const [elements, univers, types, fiches, { corbeilleJours }] = await Promise.all([contenuCorbeille(stockage),
    stockage.tous('univers'), stockage.tous('typesFiches'), stockage.tous('fiches'), lireReglages(stockage)]);
  const universParId = new Map(univers.map(u => [u.id, u]));
  const typeParId = new Map(types.map(t => [t.id, t]));
  const afficherDeNouveau = () => vueCorbeille(page, params, contexte);

  page.innerHTML = `<h1>Corbeille</h1>
    <p class="sous-titre">Vidée automatiquement après ${pluriel(corbeilleJours, 'jour')}</p>
    ${elements.length ? '<div class="groupes-corbeille"></div><div class="actions bas-corbeille"><button type="button" class="danger" data-action="vider">Vider la corbeille</button></div>'
      : '<p class="vide">La corbeille est vide</p>'}`;
  if (!elements.length) return;
  page.querySelector('[data-action="vider"]').addEventListener('click', async () => {
    if (!confirm('Vider la corbeille ? Tout ce qu’elle contient sera effacé définitivement.')) return;
    await viderCorbeille(stockage);
    afficherDeNouveau();
  });

  // Groupes : un par univers encore là, puis « Univers supprimés ».
  const groupes = new Map();
  for (const e of elements) {
    const cle = e.sorte === 'univers' ? 'supprimes' : e.objet.universId;
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(e);
  }
  const ordre = [...groupes.keys()].sort((a, b) => a === 'supprimes' ? 1 : b === 'supprimes' ? -1
    : (universParId.get(a)?.nom ?? '').localeCompare(universParId.get(b)?.nom ?? '', 'fr'));

  for (const cle of ordre) {
    const s = document.createElement('section');
    s.className = 'groupe-corbeille';
    const u = universParId.get(cle);
    s.innerHTML = `<h2>${u ? '<i aria-hidden="true"></i>' : ''}<span></span></h2><ul class="rangs-corbeille"></ul>`;
    s.querySelector('h2 span').textContent = u ? (u.nom || 'Sans nom') : 'Univers supprimés';
    if (u) s.style.setProperty('--couleur-univers', u.couleur);
    for (const e of groupes.get(cle)) s.querySelector('ul').append(rang(e));
    page.querySelector('.groupes-corbeille').append(s);
  }

  function rang({ sorte, objet }) {
    const li = document.createElement('li');
    let icone, couleur, info;
    if (sorte === 'fiche') {
      const t = typeParId.get(objet.typeId);
      [icone, couleur, info] = [t?.icone, t?.couleur, `Fiche · ${t?.nom ?? 'type supprimé'} · supprimée`];
    } else if (sorte === 'type') {
      const n = fiches.filter(f => f.typeId === objet.id).length;
      [icone, couleur, info] = [objet.icone, objet.couleur, `Type de fiche${n ? ` · ${pluriel(n, 'fiche')}` : ''} · supprimé`];
    } else if (sorte === 'tome') {
      [icone, couleur, info] = ['book-cover', universParId.get(objet.universId)?.couleur, 'Tome · supprimé'];
    } else {
      const n = fiches.filter(f => f.universId === objet.id).length;
      [icone, couleur, info] = ['book-cover', objet.couleur, `Univers · ${pluriel(n, 'fiche')} · supprimé`];
    }
    li.style.setProperty('--couleur-type', couleur ?? 'var(--texte-doux)');
    li.innerHTML = `${iconeSvg(icone)}<span class="nom"><span></span><small></small></span>
      <span class="boutons"><button type="button" data-action="restaurer">Restaurer</button>
      <button type="button" class="danger" data-action="supprimer">Supprimer</button></span>`;
    const nom = objet.nom || objet.titre || 'Sans nom';
    li.querySelector('.nom span').textContent = nom;
    li.querySelector('small').textContent = `${info} ${depuis(objet.corbeille)}`;
    li.querySelector('[data-action="supprimer"]').setAttribute('aria-label', `Supprimer définitivement ${nom}`);
    li.querySelector('[data-action="restaurer"]').setAttribute('aria-label', `Restaurer ${nom}`);

    li.addEventListener('click', async ev => {
      const action = ev.target.closest('[data-action]')?.dataset.action;
      if (action === 'supprimer' && confirm(`Supprimer définitivement « ${nom} » ? Cette action ne peut pas être annulée.`)) {
        await supprimerDefinitivement(stockage, sorte, objet);
        afficherDeNouveau();
      }
      if (action !== 'restaurer') return;
      const fini = async changements => {
        await restaurer(stockage, sorte, objet, changements);
        message(`« ${nom} » restauré${sorte === 'fiche' ? 'e' : ''}`);
        afficherDeNouveau();
      };
      // Une fiche dont le type n'existe plus (ou est à la corbeille) doit en recevoir un autre.
      const t = typeParId.get(objet.typeId);
      if (sorte !== 'fiche' || (t && !t.corbeille)) return fini();
      const possibles = await typesUnivers(stockage, objet.universId);
      if (!possibles.length) return alert('Cet univers n’a plus aucun type de fiche : restaurez d’abord un type.');
      choisirType(page, possibles, choisi => fini({ typeId: choisi.id }),
        { titre: `Restaurer « ${nom} »`, question: 'Son type a été supprimé. Dans quel type la ranger ?' });
    });
    return li;
  }
}
