import { nouvelUnivers } from './univers.js';

// Créé une seule fois : si l'utilisateur le supprime, il ne revient pas.
export async function creerExempleSiBesoin(stockage) {
  if (await stockage.get('meta', 'exempleCree')) return;
  const u = nouvelUnivers({
    nom: 'Royaume d’Elsméria',
    couleur: '#5b6b2f',
    description: 'Un royaume de forêts anciennes et de cités fortifiées, où la magie s’éteint lentement. '
      + 'Univers d’exemple : explorez-le, modifiez-le ou supprimez-le librement.',
  });
  // shortcut: les fiches d'exemple seront ajoutées avec le morceau 3 (fiches).
  await stockage.lot([['put', 'univers', u], ['put', 'meta', { cle: 'exempleCree', valeur: true }]]);
}
