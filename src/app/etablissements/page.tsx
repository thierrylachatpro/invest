import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dateFr, normaliser } from "@/lib/format";
import { ORDRE_STATUTS, STATUTS, ZONES } from "@/lib/libelles";
import type { Etablissement, Statut, TypeCommerce } from "@/lib/types";
import { BadgeStatut } from "@/components/ui";

export const dynamic = "force-dynamic";

type Ligne = Etablissement & {
  types_commerce: { nom: string } | null;
  proprietaires: {
    id: number;
    raison_sociale: string;
    siren: string | null;
    statut: Statut;
    interlocuteurs: { prenom: string | null; nom: string | null }[];
    echanges: { date_echange: string; date_rappel: string | null; rappel_traite: boolean }[];
  } | null;
};

type Filtres = {
  q?: string;
  ville?: string;
  type?: string;
  zone?: string;
  statut?: string;
  franchise?: string;
  contacter?: string;
  sans_proprietaire?: string;
  rappel?: string;
  tri?: string;
};

export default async function PageEtablissements({ searchParams }: { searchParams: Promise<Filtres> }) {
  const f = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: tData }] = await Promise.all([
    supabase
      .from("etablissements")
      .select(
        "*, types_commerce(nom), proprietaires(id, raison_sociale, siren, statut, interlocuteurs(prenom, nom), echanges(date_echange, date_rappel, rappel_traite))",
      ),
    supabase.from("types_commerce").select("*").order("nom"),
  ]);
  const tous = (data ?? []) as Ligne[];
  const types = (tData ?? []) as TypeCommerce[];
  const villes = [...new Set(tous.map((e) => e.ville).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "fr"));

  const dernierEchange = (e: Ligne) => e.proprietaires?.echanges.map((x) => x.date_echange).sort().at(-1) ?? "";
  const rappelEnAttente = (e: Ligne) => !!e.proprietaires?.echanges.some((x) => x.date_rappel && !x.rappel_traite);

  let lignes = tous;
  if (f.q) {
    const q = normaliser(f.q);
    lignes = lignes.filter((e) =>
      normaliser(
        [
          e.nom,
          e.ville,
          e.adresse,
          e.code_postal,
          e.franchise,
          e.proprietaires?.raison_sociale,
          e.proprietaires?.siren,
          ...(e.proprietaires?.interlocuteurs.map((i) => `${i.prenom} ${i.nom}`) ?? []),
        ].join(" "),
      ).includes(q),
    );
  }
  if (f.ville) lignes = lignes.filter((e) => e.ville === f.ville);
  if (f.type) lignes = lignes.filter((e) => String(e.type_id) === f.type);
  if (f.zone) lignes = lignes.filter((e) => e.zone === f.zone);
  if (f.statut) lignes = lignes.filter((e) => e.proprietaires?.statut === f.statut);
  if (f.franchise === "franchise") lignes = lignes.filter((e) => !!e.franchise);
  if (f.franchise === "independant") lignes = lignes.filter((e) => !e.franchise);
  if (f.contacter === "oui") lignes = lignes.filter((e) => e.a_contacter === true);
  if (f.contacter === "non") lignes = lignes.filter((e) => e.a_contacter === false);
  if (f.contacter === "vide") lignes = lignes.filter((e) => e.a_contacter === null);
  if (f.sans_proprietaire) lignes = lignes.filter((e) => !e.proprietaire_id);
  if (f.rappel) lignes = lignes.filter(rappelEnAttente);

  const tri = f.tri ?? "distance";
  lignes = [...lignes].sort((a, b) => {
    if (tri === "nom") return a.nom.localeCompare(b.nom, "fr");
    if (tri === "ville") return (a.ville ?? "").localeCompare(b.ville ?? "", "fr") || a.nom.localeCompare(b.nom, "fr");
    if (tri === "echange") return dernierEchange(b).localeCompare(dernierEchange(a));
    return (a.distance_min ?? 999) - (b.distance_min ?? 999) || a.nom.localeCompare(b.nom, "fr");
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="titre-page mb-0">
          Établissements ({lignes.length}
          {lignes.length !== tous.length && ` / ${tous.length}`})
        </h1>
        <Link href="/etablissements/nouveau" className="btn-primaire">
          + Nouvel établissement
        </Link>
      </div>

      <form className="carte mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input name="q" defaultValue={f.q} placeholder="Établissement, propriétaire, SIREN, interlocuteur…" className="champ sm:col-span-2" />
        <select name="ville" defaultValue={f.ville ?? ""} className="champ">
          <option value="">Toutes les villes</option>
          {villes.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select name="type" defaultValue={f.type ?? ""} className="champ">
          <option value="">Tous les types</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom}
            </option>
          ))}
        </select>
        <select name="zone" defaultValue={f.zone ?? ""} className="champ">
          <option value="">Toutes les zones</option>
          {ZONES.map((z) => (
            <option key={z}>{z}</option>
          ))}
        </select>
        <select name="statut" defaultValue={f.statut ?? ""} className="champ">
          <option value="">Tous les statuts</option>
          {ORDRE_STATUTS.map((s) => (
            <option key={s} value={s}>
              {STATUTS[s].libelle}
            </option>
          ))}
        </select>
        <select name="franchise" defaultValue={f.franchise ?? ""} className="champ">
          <option value="">Franchise ou indépendant</option>
          <option value="franchise">Franchises</option>
          <option value="independant">Indépendants</option>
        </select>
        <select name="contacter" defaultValue={f.contacter ?? ""} className="champ">
          <option value="">À contacter : tous</option>
          <option value="oui">À contacter : oui</option>
          <option value="non">À contacter : non</option>
          <option value="vide">À contacter : non renseigné</option>
        </select>
        <select name="tri" defaultValue={tri} className="champ">
          <option value="distance">Tri : distance</option>
          <option value="nom">Tri : nom</option>
          <option value="ville">Tri : ville</option>
          <option value="echange">Tri : dernier échange</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="sans_proprietaire" value="1" defaultChecked={!!f.sans_proprietaire} /> Sans propriétaire
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="rappel" value="1" defaultChecked={!!f.rappel} /> Rappel en attente
        </label>
        <div className="flex gap-2">
          <button className="btn-primaire">Filtrer</button>
          <Link href="/etablissements" className="btn">
            Réinitialiser
          </Link>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Établissement</th>
              <th className="px-3 py-2">Ville</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Distance</th>
              <th className="px-3 py-2">Propriétaire</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Dernier échange</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lignes.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-3 py-2">
                  <Link href={`/etablissements/${e.id}`} className="lien font-medium">
                    {e.nom}
                  </Link>
                  {e.franchise && <div className="text-xs text-slate-500">{e.franchise}</div>}
                </td>
                <td className="px-3 py-2 text-slate-600">{e.ville}</td>
                <td className="px-3 py-2 text-slate-600">{e.types_commerce?.nom}</td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{e.distance_min != null ? `${e.distance_min} min` : ""}</td>
                <td className="px-3 py-2">
                  {e.proprietaires ? (
                    <Link href={`/proprietaires/${e.proprietaires.id}`} className="lien">
                      {e.proprietaires.raison_sociale}
                    </Link>
                  ) : (
                    <span className="text-slate-400">Non identifié</span>
                  )}
                </td>
                <td className="px-3 py-2">{e.proprietaires && <BadgeStatut statut={e.proprietaires.statut} />}</td>
                <td className="px-3 py-2 text-slate-600">{dateFr(dernierEchange(e))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
