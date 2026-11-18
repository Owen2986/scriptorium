import { typesUnivers } from '../../modele/types.js';
import { fichesUnivers } from '../../modele/fiches.js';
import { echapper } from '../../modele/liens.js';
import { parType, proprietes, ficheMarkdown, universMarkdown } from '../../modele/export.js';
import { nettoyer, depuisTexteBrut } from '../../ui/texte-riche.js';
import { urlImage } from '../../ui/images.js';

// Fenêtre « Exporter » : tout l'univers `u`, ou seulement `fiche` (telle qu'elle est affichée).
export function exporter(page, stockage, u, fiche = null) {
  const dialogue = document.createElement('dialog');
  dialogue.className = 'carte fenetre-export';
  dialogue.innerHTML = `<form method="dialog">
      <h2></h2>
      <fieldset>
        <legend>Format</legend>
        <label class="format"><input type="radio" name="format" value="pdf" checked>
          <span>PDF<small>Mis en page pour lire ou imprimer, avec les images</small></span></label>
        <label class="format"><input type="radio" name="format" value="md">
          <span>Fichier texte (Markdown)<small>Pour Obsidian ou un autre logiciel de notes, sans images</small></span></label>
      </fieldset>
      <label class="choix"><input type="checkbox" name="secrets"> Inclure les secrets</label>
      <div class="actions">
        <button type="button" data-action="annuler">Annuler</button>
        <button class="principal">Exporter</button>
      </div>
    </form>`;
  dialogue.querySelector('h2').textContent = `Exporter « ${(fiche ?? u).nom || 'Sans nom'} »`; // espaces insécables
  const form = dialogue.querySelector('form');
  dialogue.querySelector('[data-action="annuler"]').addEventListener('click', () => dialogue.close());
  form.addEventListener('submit', async () => {
    const { format, secrets } = form.elements;
    const [types, toutes] = await Promise.all([typesUnivers(stockage, u.id), fichesUnivers(stockage, u.id)]);
    const fiches = toutes.map(f => ({ ...(f.id === fiche?.id ? fiche : f), secrets: depuisTexteBrut((f.id === fiche?.id ? fiche : f).secrets) }));
    const choix = { types, fiches, secrets: secrets.checked, seule: fiche && fiches.find(f => f.id === fiche.id) };
    if (format.value === 'md') telecharger(u, choix);
    else await imprimer(stockage, u, choix);
  });
  dialogue.addEventListener('close', () => dialogue.remove());
  page.append(dialogue);
  dialogue.showModal();
}

const nomFichier = nom => (nom || 'Sans nom').replace(/[\\/:*?"<>|]/g, '-');

function telecharger(u, { types, fiches, secrets, seule }) {
  const nomDe = new Map(fiches.map(f => [f.id, f.nom || 'Sans nom']));
  const texte = seule
    ? `${ficheMarkdown(seule, { type: types.find(t => t.id === seule.typeId), nomDe, secrets })}\n`
    : universMarkdown(u, types, fiches, secrets);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texte], { type: 'text/markdown' }));
  a.download = `${nomFichier((seule ?? u).nom)}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Texte d'une fiche pour le PDF : HTML nettoyé, liens [[Nom]] affichés comme dans l'appli (sans crochets).
const texteImprime = html => nettoyer(html).replace(/\[\[([^[\]<>]+)\]\]/g, '<span class="lien-imp">$1</span>');

// PDF : une zone cachée à l'écran est la seule chose imprimée ; le navigateur propose « Enregistrer en PDF ».
async function imprimer(stockage, u, { types, fiches, secrets, seule }) {
  const nomDe = new Map(fiches.map(f => [f.id, f.nom || 'Sans nom']));
  const groupes = parType(types, seule ? [seule] : fiches);
  const typeDe = new Map(types.map(t => [t.id, t]));
  const html = [];
  if (!seule) {
    const couv = await urlImage(stockage, u.couvertureId);
    html.push(`<section class="imp-garde">
        ${couv ? `<img class="imp-couverture" alt="" src="${couv}">` : `<div class="imp-initiale">${echapper((u.nom || '?').trim()[0] ?? '?')}</div>`}
        <h1>${echapper(u.nom || 'Sans nom')}</h1>
        ${u.description?.trim() ? `<p>${echapper(u.description)}</p>` : ''}
      </section>
      <section class="imp-sommaire"><h1>Sommaire</h1>
        ${groupes.map(([t, liste]) => `<h2>${echapper(t?.nom || 'Sans type')}</h2>
          <ul>${liste.map(f => `<li><a href="#imp-${f.id}">${echapper(nomDe.get(f.id))}</a></li>`).join('')}</ul>`).join('')}
      </section>`);
  }
  for (const [, liste] of groupes) for (const f of liste) {
    const type = typeDe.get(f.typeId);
    const [portrait, galerie] = await Promise.all([urlImage(stockage, f.imageId), Promise.all((f.galerie ?? []).map(id => urlImage(stockage, id)))]);
    const props = proprietes(f, type, nomDe).filter(([l]) => !['Autres noms', 'Dans', 'Étiquettes'].includes(l));
    const sous = [type?.nom || 'Sans type', f.autresNoms?.length && `aussi appelé ${f.autresNoms.join(', ')}`,
      f.parentId && nomDe.has(f.parentId) && `dans ${nomDe.get(f.parentId)}`].filter(Boolean).join(' · ');
    const s = secrets && texteImprime(f.secrets);
    html.push(`<article class="imp-fiche" id="imp-${f.id}">
        <h1>${echapper(f.nom || 'Sans nom')}</h1>
        <p class="imp-sous">${echapper(sous)}</p>
        <div class="imp-corps">
          <div>${texteImprime(f.texte)}${s ? `<h2>Secrets</h2><div class="imp-secrets">${s}</div>` : ''}</div>
          ${portrait || props.length ? `<aside>${portrait ? `<img alt="" src="${portrait}">` : ''}
            <dl>${props.map(([l, v]) => `<dt>${echapper(l)}</dt><dd>${echapper(String(v).replace(/\[\[|\]\]/g, ''))}</dd>`).join('')}</dl></aside>` : ''}
        </div>
        ${f.etiquettes?.length ? `<p class="imp-sous">Étiquettes : ${echapper(f.etiquettes.join(', '))}</p>` : ''}
        ${galerie.some(Boolean) ? `<div class="imp-galerie">${galerie.filter(Boolean).map(g => `<img alt="" src="${g}">`).join('')}</div>` : ''}
      </article>`);
  }
  const zone = document.createElement('div');
  zone.className = 'impression';
  zone.style.setProperty('--couleur-univers', u.couleur);
  zone.innerHTML = html.join('');
  document.body.append(zone);
  await Promise.all([...zone.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
  const titre = document.title;
  document.title = nomFichier((seule ?? u).nom); // nom proposé pour le fichier PDF
  addEventListener('afterprint', () => { zone.remove(); document.title = titre; }, { once: true });
  print();
}
