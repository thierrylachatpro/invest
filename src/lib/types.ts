export type Statut =
  | "a_qualifier"
  | "a_contacter"
  | "courrier_envoye"
  | "en_discussion"
  | "offre_recue"
  | "visite_analyse"
  | "non_vendeur"
  | "abandonne";

export type Canal =
  | "courrier_envoye"
  | "courrier_recu"
  | "appel_sortant"
  | "appel_entrant"
  | "appel_sans_reponse"
  | "message_laisse"
  | "email"
  | "sms"
  | "rendez_vous";

export interface TypeCommerce {
  id: number;
  nom: string;
  actif: boolean;
}

export interface Proprietaire {
  id: number;
  raison_sociale: string;
  siren: string | null;
  forme_juridique: string | null;
  adresse_siege: string | null;
  cp_siege: string | null;
  ville_siege: string | null;
  telephone: string | null;
  email: string | null;
  statut: Statut;
  commentaires: string | null;
  archive: boolean;
  date_creation: string | null;
}

export interface Interlocuteur {
  id: number;
  proprietaire_id: number;
  prenom: string | null;
  nom: string | null;
  role: string | null;
  telephone: string | null;
  email: string | null;
}

export interface Etablissement {
  id: number;
  nom: string;
  type_id: number;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_min: number | null;
  zone: string | null;
  franchise: string | null;
  telephone: string | null;
  email: string | null;
  site_web: string | null;
  note_google: number | null;
  nb_avis: number | null;
  a_contacter: boolean | null;
  proprietaire_id: number | null;
  lien_maps: string | null;
  lien_streetview: string | null;
  lien_annuaire: string | null;
  commentaires: string | null;
}

export interface Echange {
  id: number;
  proprietaire_id: number;
  etablissement_id: number | null;
  interlocuteur_id: number | null;
  date_echange: string;
  canal: Canal;
  resume: string | null;
  date_rappel: string | null;
  rappel_traite: boolean;
}

export interface Rappel {
  echange_id: number;
  date_rappel: string;
  date_echange: string;
  canal: Canal;
  resume: string | null;
  proprietaire_id: number;
  raison_sociale: string;
  telephone_proprietaire: string | null;
  statut: Statut;
  prenom: string | null;
  nom_interlocuteur: string | null;
  telephone_interlocuteur: string | null;
  etablissement_id: number | null;
  nom_etablissement: string | null;
  ville_etablissement: string | null;
}
