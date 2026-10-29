import type { Canal, Statut } from "./types";

export const STATUTS: Record<Statut, { libelle: string; classe: string }> = {
  a_qualifier: { libelle: "À qualifier", classe: "bg-slate-100 text-slate-700" },
  a_contacter: { libelle: "À contacter", classe: "bg-sky-100 text-sky-800" },
  courrier_envoye: { libelle: "Courrier envoyé", classe: "bg-indigo-100 text-indigo-800" },
  en_discussion: { libelle: "En discussion", classe: "bg-amber-100 text-amber-800" },
  offre_recue: { libelle: "Offre reçue", classe: "bg-emerald-100 text-emerald-800" },
  visite_analyse: { libelle: "Visite / analyse", classe: "bg-teal-100 text-teal-800" },
  non_vendeur: { libelle: "Non vendeur", classe: "bg-rose-100 text-rose-800" },
  abandonne: { libelle: "Abandonné", classe: "bg-zinc-200 text-zinc-600" },
};

export const CANAUX: Record<Canal, string> = {
  courrier_envoye: "Courrier envoyé",
  courrier_recu: "Courrier reçu",
  appel_sortant: "Appel sortant",
  appel_entrant: "Appel entrant",
  appel_sans_reponse: "Appel sans réponse",
  message_laisse: "Message laissé",
  email: "E-mail",
  sms: "SMS",
  rendez_vous: "Rendez-vous / visite",
};

export const ZONES = ["< 45min", "45min - 60min", "> 60min"] as const;

export const ORDRE_STATUTS = Object.keys(STATUTS) as Statut[];
export const ORDRE_CANAUX = Object.keys(CANAUX) as Canal[];
