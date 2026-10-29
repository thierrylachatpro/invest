"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ajouterJours, aujourdhui, depuisDatetimeLocal, normaliser } from "@/lib/format";
import type { Canal, Statut } from "@/lib/types";

// ---------- utilitaires ----------

function texte(fd: FormData, cle: string): string | null {
  const v = fd.get(cle);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function nombre(fd: FormData, cle: string): number | null {
  const t = texte(fd, cle);
  if (t === null) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function triEtat(fd: FormData, cle: string): boolean | null {
  const t = texte(fd, cle);
  return t === "oui" ? true : t === "non" ? false : null;
}

function echec(chemin: string, message: string): never {
  redirect(`${chemin}${chemin.includes("?") ? "&" : "?"}erreur=${encodeURIComponent(message)}`);
}

function messageErreur(message: string): string {
  if (message.includes("proprietaires_siren_key")) return "Ce SIREN existe déjà pour un autre propriétaire.";
  if (message.includes("siren_check")) return "Le SIREN doit comporter 9 chiffres.";
  return message;
}

// ---------- authentification ----------

export async function connexion(_etat: string | null, fd: FormData): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: texte(fd, "email") ?? "",
    password: (fd.get("password") as string) ?? "",
  });
  if (error) return "Identifiants incorrects.";
  redirect("/");
}

export async function deconnexion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------- propriétaires ----------

function champsProprietaire(fd: FormData) {
  const siren = texte(fd, "siren")?.replace(/\s/g, "") ?? null;
  return {
    raison_sociale: texte(fd, "raison_sociale") ?? "",
    siren,
    forme_juridique: texte(fd, "forme_juridique"),
    adresse_siege: texte(fd, "adresse_siege"),
    cp_siege: texte(fd, "cp_siege"),
    ville_siege: texte(fd, "ville_siege"),
    telephone: texte(fd, "telephone"),
    email: texte(fd, "email"),
    statut: (texte(fd, "statut") ?? "a_qualifier") as Statut,
    commentaires: texte(fd, "commentaires"),
  };
}

export async function creerProprietaire(fd: FormData) {
  const supabase = await createClient();
  const champs = champsProprietaire(fd);
  if (!champs.raison_sociale) echec("/proprietaires/nouveau", "La raison sociale est obligatoire.");
  const { data, error } = await supabase.from("proprietaires").insert(champs).select("id").single();
  if (error) echec("/proprietaires/nouveau", messageErreur(error.message));
  revalidatePath("/proprietaires");
  redirect(`/proprietaires/${data.id}`);
}

export async function modifierProprietaire(id: number, fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("proprietaires").update(champsProprietaire(fd)).eq("id", id);
  if (error) echec(`/proprietaires/${id}/modifier`, messageErreur(error.message));
  revalidatePath("/", "layout");
  redirect(`/proprietaires/${id}`);
}

export async function changerStatut(id: number, fd: FormData) {
  const supabase = await createClient();
  await supabase.from("proprietaires").update({ statut: texte(fd, "statut") as Statut }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function basculerArchive(id: number, archive: boolean) {
  const supabase = await createClient();
  await supabase.from("proprietaires").update({ archive }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function supprimerProprietaire(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("proprietaires").delete().eq("id", id);
  if (error) echec(`/proprietaires/${id}`, error.message);
  revalidatePath("/", "layout");
  redirect("/proprietaires");
}

// ---------- interlocuteurs ----------

export async function ajouterInterlocuteur(proprietaireId: number, fd: FormData) {
  const supabase = await createClient();
  await supabase.from("interlocuteurs").insert({
    proprietaire_id: proprietaireId,
    prenom: texte(fd, "prenom"),
    nom: texte(fd, "nom"),
    role: texte(fd, "role"),
    telephone: texte(fd, "telephone"),
    email: texte(fd, "email"),
  });
  revalidatePath(`/proprietaires/${proprietaireId}`);
}

export async function supprimerInterlocuteur(id: number, proprietaireId: number) {
  const supabase = await createClient();
  await supabase.from("interlocuteurs").delete().eq("id", id);
  revalidatePath(`/proprietaires/${proprietaireId}`);
}

// ---------- établissements ----------

async function champsEtablissement(fd: FormData, cheminErreur: string) {
  const supabase = await createClient();
  let proprietaire_id: number | null = nombre(fd, "proprietaire_id");
  const nouveau = texte(fd, "nouveau_proprietaire");
  if (texte(fd, "proprietaire_id") === "nouveau") {
    if (!nouveau) echec(cheminErreur, "Indiquez la raison sociale du nouveau propriétaire.");
    const siren = texte(fd, "nouveau_siren")?.replace(/\s/g, "") ?? null;
    const { data, error } = await supabase
      .from("proprietaires")
      .insert({ raison_sociale: nouveau, siren })
      .select("id")
      .single();
    if (error) echec(cheminErreur, messageErreur(error.message));
    proprietaire_id = data.id;
  }
  return {
    nom: texte(fd, "nom") ?? "",
    type_id: nombre(fd, "type_id") ?? 1,
    adresse: texte(fd, "adresse"),
    code_postal: texte(fd, "code_postal"),
    ville: texte(fd, "ville"),
    latitude: nombre(fd, "latitude"),
    longitude: nombre(fd, "longitude"),
    distance_min: nombre(fd, "distance_min"),
    zone: texte(fd, "zone"),
    franchise: texte(fd, "franchise"),
    telephone: texte(fd, "telephone"),
    email: texte(fd, "email"),
    site_web: texte(fd, "site_web"),
    note_google: nombre(fd, "note_google"),
    nb_avis: nombre(fd, "nb_avis"),
    a_contacter: triEtat(fd, "a_contacter"),
    proprietaire_id,
    lien_maps: texte(fd, "lien_maps"),
    lien_streetview: texte(fd, "lien_streetview"),
    lien_annuaire: texte(fd, "lien_annuaire"),
    commentaires: texte(fd, "commentaires"),
  };
}

export async function creerEtablissement(fd: FormData) {
  const supabase = await createClient();
  const chemin = "/etablissements/nouveau";
  const champs = await champsEtablissement(fd, chemin);
  if (!champs.nom) echec(chemin, "Le nom est obligatoire.");
  if (!texte(fd, "ignorer_doublon")) {
    const { data: memes } = await supabase
      .from("etablissements")
      .select("id, nom, code_postal")
      .eq("code_postal", champs.code_postal ?? "");
    const doublon = (memes ?? []).find((e) => normaliser(e.nom) === normaliser(champs.nom));
    if (doublon) {
      echec(chemin, `Un établissement « ${doublon.nom} » existe déjà au ${champs.code_postal} (fiche n° ${doublon.id}). Cochez « Créer quand même » pour confirmer.`);
    }
  }
  const { data, error } = await supabase.from("etablissements").insert(champs).select("id").single();
  if (error) echec(chemin, error.message);
  revalidatePath("/etablissements");
  redirect(`/etablissements/${data.id}`);
}

export async function modifierEtablissement(id: number, fd: FormData) {
  const supabase = await createClient();
  const champs = await champsEtablissement(fd, `/etablissements/${id}/modifier`);
  const { error } = await supabase.from("etablissements").update(champs).eq("id", id);
  if (error) echec(`/etablissements/${id}/modifier`, error.message);
  revalidatePath("/", "layout");
  redirect(`/etablissements/${id}`);
}

export async function supprimerEtablissement(id: number) {
  const supabase = await createClient();
  await supabase.from("etablissements").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/etablissements");
}

// ---------- échanges ----------

function champsEchange(fd: FormData) {
  const dt = texte(fd, "date_echange");
  return {
    canal: (texte(fd, "canal") ?? "appel_sortant") as Canal,
    resume: texte(fd, "resume"),
    etablissement_id: nombre(fd, "etablissement_id"),
    interlocuteur_id: nombre(fd, "interlocuteur_id"),
    date_rappel: texte(fd, "date_rappel"),
    ...(dt ? { date_echange: depuisDatetimeLocal(dt) } : {}),
  };
}

export async function ajouterEchange(proprietaireId: number, fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("echanges")
    .insert({ proprietaire_id: proprietaireId, ...champsEchange(fd) });
  if (error) echec(`/proprietaires/${proprietaireId}`, error.message);
  const statut = texte(fd, "nouveau_statut");
  if (statut) await supabase.from("proprietaires").update({ statut: statut as Statut }).eq("id", proprietaireId);
  revalidatePath("/", "layout");
  const retour = texte(fd, "retour");
  if (retour) redirect(retour);
}

export async function modifierEchange(id: number, proprietaireId: number, fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("echanges")
    .update({ ...champsEchange(fd), rappel_traite: texte(fd, "rappel_traite") === "on" })
    .eq("id", id);
  if (error) echec(`/echanges/${id}/modifier`, error.message);
  revalidatePath("/", "layout");
  redirect(`/proprietaires/${proprietaireId}`);
}

export async function supprimerEchange(id: number, proprietaireId: number) {
  const supabase = await createClient();
  await supabase.from("echanges").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect(`/proprietaires/${proprietaireId}`);
}

export async function marquerRappelTraite(echangeId: number) {
  const supabase = await createClient();
  await supabase.from("echanges").update({ rappel_traite: true }).eq("id", echangeId);
  revalidatePath("/", "layout");
}

export async function reporterRappel(echangeId: number, fd: FormData) {
  const supabase = await createClient();
  const jours = nombre(fd, "jours");
  const date = jours ? ajouterJours(aujourdhui(), jours) : texte(fd, "date");
  if (!date) return;
  await supabase.from("echanges").update({ date_rappel: date }).eq("id", echangeId);
  revalidatePath("/", "layout");
}

// ---------- courrier groupé ----------

export async function enregistrerCourriers(fd: FormData) {
  const supabase = await createClient();
  const ids = fd.getAll("proprietaires").map((v) => Number(v)).filter(Number.isFinite);
  if (ids.length === 0) echec("/courriers", "Sélectionnez au moins un propriétaire.");
  const date = texte(fd, "date") ?? aujourdhui();
  const resume = texte(fd, "resume") ?? "Courrier de prospection";
  const { error } = await supabase.from("echanges").insert(
    ids.map((id) => ({
      proprietaire_id: id,
      canal: "courrier_envoye" as Canal,
      date_echange: `${date} 12:00 Europe/Paris`,
      resume,
    })),
  );
  if (error) echec("/courriers", error.message);
  revalidatePath("/", "layout");
  redirect(`/courriers?ok=${ids.length}`);
}
