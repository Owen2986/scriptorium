// Une seule adresse par image pour toute la visite (évite d'en recréer à chaque page).
const urls = new Map();

export async function urlImage(stockage, id) {
  if (!id) return null;
  if (!urls.has(id)) {
    const img = await stockage.get('images', id);
    if (!img) return null;
    urls.set(id, URL.createObjectURL(img.fichier));
  }
  return urls.get(id);
}
