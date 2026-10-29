import Link from "next/link";
import { enregistrerCourriers } from "@/app/actions";
import { BadgeStatut, Erreur, Succes } from "@/components/ui";
import { aujourdhui, dateFr } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Statut } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ligne = {
  id: number;
  raison_sociale: string;
  ville_siege: string | null;
  adresse_siege: string | null;
  statut: Statut;
  etablissements: { distance_min: number | null; a_contacter: boolean | null }[];
  echanges: { canal: string; date_echange: string }[];
};

export default async function PageCourriers({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; ok?: string; tous?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("proprietaires")
    .select("id, raison_sociale, ville_siege, adresse_siege, statut, etablissements(distance_min, a_contacter), echanges(canal, date_echange)")
    .eq("archive", false);
  let lignes = (data ?? []) as Ligne[];
  if (!sp.tous) lignes = lignes.filter((p) => p.statut === "a_qualifier" || p.statut === "a_contacter");
  const distance = (p: Ligne) => Math.min(...p.etablissements.map((e) => e.distance_min ?? 999), 999);
  lignes.sort((a, b) => distance(a) - distance(b) || a.raison_sociale.localeCompare(b.raison_sociale, "fr"));

  return (
    <div>
      <h1 className="titre-page">Courrier groupé</h1>
      <p className="mb-4 text-sm text-slate-600">
        Cochez les propriétaires à qui vous avez envoyé le courrier : un échange « Courrier envoyé » est créé pour chacun, avec un rappel
        automatique 10 jours plus tard, et leur statut passe à « Courrier envoyé ».
      </p>
      <Erreur message={sp.erreur} />
      <Succes message={sp.ok ? `${sp.ok} courrier(s) enregistré(s), rappels créés à J+10.` : undefined} />
      <div className="mb-3 text-sm">
        {sp.tous ? (
          <Link href="/courriers" className="lien">
            Afficher seulement « À qualifier » et « À contacter »
          </Link>
        ) : (
          <Link href="/courriers?tous=1" className="lien">
            Afficher tous les propriétaires
          </Link>
        )}
      </div>
      <form action={enregistrerCourriers} className="space-y-4">
        <div className="carte grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="etiquette">Date d&apos;envoi</span>
            <input type="date" name="date" defaultValue={aujourdhui()} className="champ" />
          </label>
          <label className="block sm:col-span-2">
            <span className="etiquette">Résumé</span>
            <input name="resume" defaultValue="Courrier de prospection" className="champ" />
          </label>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2">Propriétaire</th>
                <th className="px-3 py-2">Siège</th>
                <th className="px-3 py-2">Distance min.</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Dernier courrier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lignes.map((p) => {
                const dernierCourrier = p.echanges
                  .filter((x) => x.canal === "courrier_envoye")
                  .map((x) => x.date_echange)
                  .sort()
                  .at(-1);
                const d = distance(p);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <input type="checkbox" name="proprietaires" value={p.id} aria-label={p.raison_sociale} />
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/proprietaires/${p.id}`} className="lien">
                        {p.raison_sociale}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{[p.adresse_siege, p.ville_siege].filter(Boolean).join(", ")}</td>
                    <td className="px-3 py-2 text-slate-600">{d < 999 ? `${d} min` : ""}</td>
                    <td className="px-3 py-2">
                      <BadgeStatut statut={p.statut} />
                    </td>
                    <td className="px-3 py-2 text-slate-600">{dateFr(dernierCourrier)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button className="btn-primaire">Enregistrer les courriers envoyés</button>
      </form>
    </div>
  );
}
