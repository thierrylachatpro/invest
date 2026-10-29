import type { Etablissement } from "./types";

/** Lien Google Maps : celui enregistré, sinon construit depuis le nom et l'adresse */
export function lienMaps(e: Etablissement): string | null {
  if (e.lien_maps) return e.lien_maps;
  const requete = [e.nom, e.adresse, [e.code_postal, e.ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  if (!requete) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(requete)}`;
}

/** Lien Street View : celui enregistré, sinon depuis les coordonnées, sinon recherche Maps de l'adresse */
export function lienStreetView(e: Etablissement): string | null {
  if (e.lien_streetview) return e.lien_streetview;
  if (e.latitude != null && e.longitude != null) {
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${e.latitude},${e.longitude}`;
  }
  const adresse = [e.adresse, e.code_postal, e.ville].filter(Boolean).join(" ");
  return adresse ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}` : null;
}

/** Lien annuaire-entreprises : celui enregistré, sinon depuis le SIREN du propriétaire */
export function lienAnnuaire(e: Etablissement | null, siren: string | null | undefined): string | null {
  if (e?.lien_annuaire) return e.lien_annuaire;
  return siren ? `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren}` : null;
}
