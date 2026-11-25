import { ETATS, nouveauNoeud, noeudsTome, lignesPlan, titreNoeud, motsPlan, ciblesPossibles, echanger } from '../../modele/plan.js';
import { mettreALaCorbeille } from '../../modele/corbeille.js';
import { brancherMenu } from '../../ui/menu.js';
import { dessin } from '../../ui/icones.js';
import { message } from '../../ui/message.js';
import { lienEcriture } from './ecriture.js';

const nombre = n => n.toLocaleString('fr');

// Menu d'une ligne : renommer, état, ajouter dedans, ranger, corbeille.
const menuLigne = n => `<div class="ancre-menu">
    <button type="button" class="bouton-plus" aria-expanded="false" aria-haspopup="true" aria-label="Actions">${dessin('points')}</button>
    <ul class="menu" hidden>
      <li><button type="button" data-action="renommer">Renommer</button></li>
      ${n.sorte === 'partie' ? '' : `<li class="sous">État</li>
      <li class="etats">${Object.entries(ETATS).map(([k, libelle]) =>
        `<button type="button" data-action="etat:${k}" aria-pressed="${n.etat === k}">${libelle}</button>`).join('')}</li>`}
      <li><hr></li>
      ${n.sorte === 'scene' ? '' : '<li><button type="button" data-action="ajouter-scene">+ Ajouter une scène dedans</button></li>'}
      <li><button type="button" data-action="monter">↑ Monter</button></li>
      <li><button type="button" data-action="descendre">↓ Descendre</button></li>
      <li><button type="button" data-action="deplacer">Déplacer dans…</button></li>
      <li><hr></li>
      <li><button type="button" class="danger" data-action="corbeille">${dessin('poubelle')}Mettre à la corbeille</button></li>
    </ul>
  </div>`;

// Plan d'un tome dans `section` : lignes décalées selon le niveau, état, mots, menu par ligne, boutons d'ajout.
export async function afficherPlan(section, stockage, tome) {
  const noeuds = await noeudsTome(stockage, tome.id);
  let lignes = lignesPlan(noeuds);
  const mots = await motsPlan(stockage, lignes);
  section.innerHTML = `<h2>Plan</h2><ul class="plan"></ul>
    <div class="actions ajouts">
      <button type="button" data-ajout="partie">+ Partie</button>
      <button type="button" data-ajout="chapitre">+ Chapitre</button>
      <button type="button" data-ajout="scene">+ Scène</button>
    </div>`;
  const ul = section.querySelector('.plan');
  const enregistrer = (...liste) => stockage.lot(liste.map(n => ['put', 'noeudsManuscrit', n]));

  const afficher = (focus, renommer) => {
    lignes = lignesPlan(noeuds);
    ul.replaceChildren(...lignes.map(l => {
      const n = l.noeud;
      const li = document.createElement('li');
      li.className = n.sorte;
      li.dataset.id = n.id;
      li.style.setProperty('--niveau', l.niveau);
      const m = mots.get(n.id); // pas de nombre tant qu'il n'y a pas de texte
      const meta = (n.sorte === 'partie' ? '' : `<span class="etat ${n.etat}">${ETATS[n.etat]}</span>`)
        + (m ? `<span class="mots">${nombre(m)} mot${m > 1 ? 's' : ''}</span>` : '');
      li.innerHTML = `<span class="titre"><a href="#"></a></span>${meta ? `<span class="meta">${meta}</span>` : ''}
        ${menuLigne(n)}`;
      li.querySelector('.titre a').textContent = titreNoeud(l);
      li.querySelector('.titre a').href = lienEcriture({ id: tome.universId }, tome, n);
      li.querySelector('.bouton-plus').setAttribute('aria-label', `Actions pour ${titreNoeud(l)}`);
      brancherMenu(li.querySelector('.ancre-menu'), action => agir(action, n));
      return li;
    }));
    if (!lignes.length) ul.innerHTML = '<li class="vide">Le plan est vide : ajoutez une partie, un chapitre ou une scène</li>';
    if (focus) ul.querySelector(`[data-id="${focus}"] .bouton-plus`)?.focus();
    if (renommer) champRenommer(renommer);
  };

  // Le titre devient un champ dans la ligne ; Entrée ou sortir du champ enregistre, Échap annule.
  const champRenommer = n => {
    const span = ul.querySelector(`[data-id="${n.id}"] .titre`);
    const champ = document.createElement('input');
    champ.value = n.titre;
    champ.placeholder = n.sorte === 'chapitre' ? 'Titre (facultatif)' : 'Titre';
    champ.setAttribute('aria-label', 'Titre');
    span.replaceChildren(champ);
    champ.select();
    let fini = false;
    const finir = garder => {
      if (fini) return;
      fini = true;
      if (garder) { n.titre = champ.value.trim(); enregistrer(n); }
      afficher(n.id);
    };
    champ.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); finir(true); }
      if (e.key === 'Escape') finir(false);
    });
    champ.addEventListener('blur', () => finir(true));
  };

  const ajouter = async (sorte, parentId = null) => {
    const n = nouveauNoeud(tome, sorte, parentId);
    noeuds.push(n);
    afficher(null, n); // tout de suite : ce qu'on tape va dans le champ du titre
    await enregistrer(n);
  };

  async function agir(action, n) {
    if (action === 'renommer') champRenommer(n);
    if (action.startsWith('etat:')) { n.etat = action.slice(5); afficher(n.id); await enregistrer(n); }
    if (action === 'ajouter-scene') await ajouter('scene', n.id);
    if (action === 'monter' || action === 'descendre') {
      const modifies = echanger(n, lignes, action === 'monter' ? -1 : 1);
      afficher(n.id);
      if (modifies.length) await enregistrer(...modifies);
    }
    if (action === 'deplacer') deplacerDans(section, n, lignes, async parentId => {
      n.parentId = parentId;
      n.ordre = Date.now(); // à la fin de l'endroit choisi
      afficher(n.id);
      await enregistrer(n);
    });
    if (action === 'corbeille') {
      const titre = titreNoeud(lignes.find(l => l.noeud === n));
      await mettreALaCorbeille(stockage, 'noeud', n);
      n.corbeille = Date.now();
      afficher();
      message(`« ${titre} » mis${n.sorte === 'chapitre' ? '' : 'e'} à la corbeille`, async () => {
        delete n.corbeille;
        await enregistrer(n);
        afficher(n.id);
      });
    }
  }

  section.querySelector('.ajouts').addEventListener('click', e => {
    const sorte = e.target.closest('[data-ajout]')?.dataset.ajout;
    if (sorte) ajouter(sorte);
  });
  afficher();
}

// Fenêtre « Déplacer dans… » : parties et chapitres (sauf l'élément lui-même et ce qu'il contient), ou la racine.
function deplacerDans(section, n, lignes, choisi) {
  const cibles = ciblesPossibles(n, lignes);
  const ligne = lignes.find(l => l.noeud === n);
  const dialogue = document.createElement('dialog');
  dialogue.className = 'carte';
  dialogue.innerHTML = `<h2></h2><ul class="choix-deplacer">
      <li><button type="button" data-cible="">Hors de toute partie ou chapitre${n.parentId ? '' : ' (ici)'}</button></li>
      ${cibles.map(l => `<li><button type="button" data-cible="${l.noeud.id}" style="--niveau:${l.niveau}"></button></li>`).join('')}
    </ul>
    <div class="actions"><button type="button" data-action="annuler">Annuler</button></div>`;
  dialogue.querySelector('h2').textContent = `Déplacer « ${titreNoeud(ligne)} »`;
  cibles.forEach(l => {
    dialogue.querySelector(`[data-cible="${l.noeud.id}"]`).textContent = titreNoeud(l) + (l.noeud.id === n.parentId ? ' (ici)' : '');
  });
  dialogue.addEventListener('click', e => {
    const b = e.target.closest('[data-cible]');
    if (b) choisi(b.dataset.cible || null);
    if (b || e.target.closest('[data-action="annuler"]')) dialogue.close();
  });
  dialogue.addEventListener('close', () => dialogue.remove());
  section.append(dialogue);
  dialogue.showModal();
}
