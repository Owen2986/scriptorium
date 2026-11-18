// Export d'un univers ou d'une fiche : fichier texte Markdown (les liens restent en [[Nom]]).

const BLOCS = new Set(['P', 'DIV', 'H2', 'H3', 'BLOCKQUOTE', 'HR']);

// Gras/italique : les espaces restent hors des marques, sinon « ** mot** » n'est pas reconnu.
function enLigne(n) {
  if (n.nodeType === Node.TEXT_NODE) return n.data.replace(/\s+/g, ' ');
  if (n.nodeType !== Node.ELEMENT_NODE) return '';
  if (n.tagName === 'BR') return '  \n';
  const t = [...n.childNodes].map(enLigne).join('');
  const m = { B: '**', STRONG: '**', I: '*', EM: '*' }[n.tagName]; // souligné : pas d'équivalent en Markdown
  if (!m || !t.trim()) return t;
  const [, avant, coeur, apres] = t.match(/^(\s*)([^]*?)(\s*)$/);
  return avant + m + coeur + m + apres;
}

// Paragraphes d'un élément ; les titres du texte passent sous le titre de la fiche (`niveau`).
function blocs(racine, niveau) {
  const sortie = [];
  let enCours = '';
  const pousser = t => { if ((t = t.trim())) sortie.push(t); };
  for (const n of racine.childNodes) {
    if (!BLOCS.has(n.tagName)) { enCours += enLigne(n); continue; }
    pousser(enCours);
    enCours = '';
    if (n.tagName === 'HR') sortie.push('---');
    else if (n.tagName === 'BLOCKQUOTE') pousser(blocs(n, niveau).join('\n\n').replace(/^/gm, '> '));
    else {
      const titre = { H2: niveau + 1, H3: niveau + 2 }[n.tagName];
      const t = enLigne(n).trim();
      if (t) sortie.push(titre ? `${'#'.repeat(Math.min(titre, 6))} ${t}` : t);
    }
  }
  pousser(enCours);
  return sortie;
}

// shortcut: les caractères spéciaux du Markdown (*, _, #) tapés dans le texte ne sont pas échappés ; à faire si ça gêne.
export const versMarkdown = (html, niveau = 1) =>
  blocs(new DOMParser().parseFromString(`<body>${html ?? ''}</body>`, 'text/html').body, niveau).join('\n\n');

// Fiches rangées par type (ordre des types, puis « Sans type ») : [[type | null, fiches]].
export function parType(types, fiches) {
  const groupes = types.map(t => [t, fiches.filter(f => f.typeId === t.id)]);
  const connus = new Set(types.map(t => t.id));
  groupes.push([null, fiches.filter(f => !connus.has(f.typeId))]);
  return groupes.filter(([, liste]) => liste.length);
}

// Lignes « Libellé : valeur » d'une fiche : autres noms, parente, cases remplies, étiquettes.
export function proprietes(f, type, nomDe) {
  const lien = id => nomDe.has(id) ? `[[${nomDe.get(id)}]]` : null;
  return [
    ['Autres noms', f.autresNoms?.join(', ')],
    ['Dans', f.parentId && lien(f.parentId)],
    ...(type?.cases ?? []).map(c => [c.nom, c.sorte === 'fiche' ? lien(f.valeurs?.[c.id]) : f.valeurs?.[c.id]]),
    ['Étiquettes', f.etiquettes?.join(', ')],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '');
}

export function ficheMarkdown(f, { type, nomDe, niveau = 1, secrets = false }) {
  const props = [...(niveau === 1 ? [['Type', type?.nom || 'Sans type']] : []), ...proprietes(f, type, nomDe)];
  const parties = [`${'#'.repeat(niveau)} ${f.nom || 'Sans nom'}`, props.map(([l, v]) => `- ${l} : ${v}`).join('\n'), versMarkdown(f.texte, niveau)];
  const s = secrets && versMarkdown(f.secrets, niveau);
  if (s) parties.push(`${'#'.repeat(niveau + 1)} Secrets`, s.replace(/^/gm, '> '));
  return parties.filter(Boolean).join('\n\n');
}

export function universMarkdown(u, types, fiches, secrets = false) {
  const nomDe = new Map(fiches.map(f => [f.id, f.nom || 'Sans nom']));
  const parties = [`# ${u.nom || 'Sans nom'}`, u.description?.trim()];
  for (const [type, liste] of parType(types, fiches)) {
    parties.push(`## ${type?.nom || 'Sans type'}`, ...liste.map(f => ficheMarkdown(f, { type, nomDe, niveau: 3, secrets })));
  }
  return `${parties.filter(Boolean).join('\n\n')}\n`;
}
