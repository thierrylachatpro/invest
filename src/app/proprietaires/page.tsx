import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dateFr, normaliser } from "@/lib/format";
import { ORDRE_STATUTS, STATUTS } from "@/lib/libelles";
import type { Proprietaire, Statut } from "@/lib/types";
import { BadgeStatut } from "@/components/ui";

export const dynamic = "force-dynamic";

type Ligne = Proprietaire & {
  etablissements: { nom: string; ville: string | null }[];
  interlocuteurs: { prenom: string | null; nom: string | null }[];
  echanges: { date_echange: string; date_rappel: string | null; rappel_traite: boolean }[];
};

export default async function PageProprietaires({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; archives?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("proprietaires")
    .select("*, etablissements(nom, ville), interlocuteurs(prenom, nom), echanges(date_echange, date_rappel, rappel_traite)")
    .order("raison_sociale");
  let lignes = (data ?? []) as Ligne[];

  if (!sp.archives) lignes = lignes.filter((p) => !p.archive);
  if (sp.statut) lignes = lignes.filter((p) => p.statut === sp.statut);
  if (sp.q) {
    const q = normaliser(sp.q);
    lignes = lignes.filter((p) =>
      normaliser(
        [
          p.raison_sociale,
          p.siren,
          p.ville_siege,
          ...p.etablissements.map((e) => `${e.nom} ${e.ville}`),
          ...p.interlocuteurs.map((i) => `${i.prenom} ${i.nom}`),
        ].join(" "),
      ).includes(q),
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="titre-page mb-0">Propriétaires ({lignes.length})</h1>
        <Link href="/proprietaires/nouveau" className="btn-primaire">
          + Nouveau propriétaire
        </Link>
      </div>
      <form className="carte mb-4 grid gap-3 sm:grid-cols-4">
        <input name="q" defaultValue={sp.q} placeholder="Raison sociale, SIREN, interlocuteur, établissement…" className="champ sm:col-span-2" />
        <select name="statut" defaultValue={sp.statut ?? ""} className="champ">
          <option value="">Tous les statuts</option>
          {ORDRE_STATUTS.map((s) => (
            <option key={s} value={s}>
              {STATUTS[s].libelle}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="archives" value="1" defaultChecked={!!sp.archives} /> Archivés
          </label>
          <button className="btn">Filtrer</button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Propriétaire</th>
              <th className="px-3 py-2">Siège</th>
              <th className="px-3 py-2">Établissements</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Dernier échange</th>
              <th className="px-3 py-2">Prochain rappel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lignes.map((p) => {
              const dernier = p.echanges.map((e) => e.date_echange).sort().at(-1);
              const prochain = p.echanges
                .filter((e) => e.date_rappel && !e.rappel_traite)
                .map((e) => e.date_rappel as string)
                .sort()[0];
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <Link href={`/proprietaires/${p.id}`} className="lien font-medium">
                      {p.raison_sociale}
                    </Link>
                    {p.interlocuteurs.length > 0 && (
                      <div className="text-xs text-slate-500">{p.interlocuteurs.map((i) => [i.prenom, i.nom].filter(Boolean).join(" ")).join(", ")}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{p.ville_siege}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {p.etablissements.length}
                    {p.etablissements.length > 0 && (
                      <span className="text-xs"> · {[...new Set(p.etablissements.map((e) => e.ville))].join(", ")}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <BadgeStatut statut={p.statut as Statut} />
                  </td>
                  <td className="px-3 py-2 text-slate-600">{dateFr(dernier)}</td>
                  <td className="px-3 py-2 text-slate-600">{dateFr(prochain)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
