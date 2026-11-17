// Réglages enregistrés avec les données (donc dans les sauvegardes), contrairement au thème.
const DEFAUT = { corbeilleJours: 30, versionsMax: 20 };

export const lireReglages = async stockage => ({ ...DEFAUT, ...(await stockage.get('meta', 'reglages'))?.valeur });

export const ecrireReglages = (stockage, valeur) => stockage.put('meta', { cle: 'reglages', valeur });
