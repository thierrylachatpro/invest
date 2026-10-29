import Link from "next/link";
import { notFound } from "next/navigation";
import { supprimerEtablissement } from "@/app/actions";
import { BoutonConfirmer } from "@/components/BoutonConfirmer";
import { BadgeStatut, BoutonLien, Retour, Telephone } from "@/components/ui";
import { dateFr, dateHeureFr } from "@/lib/format";
import { CANAUX } from "@/lib/libelles";
import { lienAnnuaire, lienMaps, lienStreetView } from "@/lib/liens";
import { createClient } from "@/lib/supabase/server";
import type { Echange, Etablissement, Proprietaire } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PageEtablissement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("etablissements")
    .select("*, types_commerce(nom), proprietaires(*)")
    .eq("id", id)
    .single();
  if (!data) notFound();
  const e = data as Etablissement & { types_commerce: { nom: string } | null; proprietaires: Proprietaire | null };
  const p = e.proprietaires;
  const { data: xData } = p
    ? await supabase
        .from("echanges")
        .select("*")
        .eq("proprietaire_id", p.id)
        .or(`etablissement_id.eq.${e.id},etablissement_id.is.null`)
        .order("date_echange", { ascending: false })
    : { data: [] };
  const echanges = (xData ?? []) as Echange[];

  const lignes: [string, React.ReactNode][] = [
    ["Type", e.types_commerce?.nom],
    ["Adresse", [e.adresse, [e.code_postal, e.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ")],
    ["Distance", e.distance_min != null ? `${e.distance_min} min` : null],
    ["Zone de chalandise", e.zone],
    ["Franchise", e.franchise || "Indépendant / non renseigné"],
    ["À contacter", e.a_contacter === true ? "Oui" : e.a_contacter === false ? "Non" : "—"],
    ["Téléphone", e.telephone ? <Telephone tel={e.telephone} /> : null],
    ["E-mail", e.email ? <a className="lien" href={`mailto:${e.email}`}>{e.email}</a> : null],
    ["Avis Google", e.note_google != null ? `${e.note_google} / 5 (${e.nb_avis ?? 0} avis)` : null],
  ];

  return (
    <div>
      <Retour href="/etablissements">Établissements</Retour>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-semibold">{e.nom}</h1>
        <div className="flex flex-wrap gap-2">
          <BoutonLien href={lienMaps(e)}>Google Maps</BoutonLien>
          <BoutonLien href={lienStreetView(e)}>Street View</BoutonLien>
          <BoutonLien href={lienAnnuaire(e, p?.siren)}>Annuaire entreprises</BoutonLien>
          {e.site_web && <BoutonLien href={e.site_web}>Site web</BoutonLien>}
          <Link href={`/etablissements/${e.id}/modifier`} className="btn">
            Modifier
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="carte text-sm lg:col-span-1">
          <dl className="space-y-2">
            {lignes
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          {e.commentaires && <p className="mt-3 whitespace-pre-line text-slate-700">{e.commentaires}</p>}
          <form action={supprimerEtablissement.bind(null, e.id)} className="mt-4">
            <BoutonConfirmer message={`Supprimer l'établissement ${e.nom} ?`}>Supprimer</BoutonConfirmer>
          </form>
        </section>

        <div className="space-y-4 lg:col-span-2">
          <section className="carte text-sm">
            <h2 className="mb-2 font-semibold">Propriétaire</h2>
            {p ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link href={`/proprietaires/${p.id}`} className="lien font-medium">
                    {p.raison_sociale}
                  </Link>{" "}
                  <BadgeStatut statut={p.statut} />
                  <div className="text-slate-600">
                    {[p.adresse_siege, [p.cp_siege, p.ville_siege].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                  </div>
                </div>
                <Link href={`/proprietaires/${p.id}#nouvel-echange`} className="btn-primaire">
                  Noter un échange
                </Link>
              </div>
            ) : (
              <p className="text-slate-500">
                Non identifié.{" "}
                <Link href={`/etablissements/${e.id}/modifier`} className="lien">
                  Rattacher un propriétaire
                </Link>
              </p>
            )}
          </section>

          {p && (
            <section className="carte text-sm">
              <h2 className="mb-2 font-semibold">Échanges concernant cet établissement ({echanges.length})</h2>
              <ol className="space-y-3">
                {echanges.map((x) => (
                  <li key={x.id} className="border-l-2 border-slate-200 pl-3">
                    <span className="font-medium">{CANAUX[x.canal]}</span>
                    <span className="text-slate-500"> · {dateHeureFr(x.date_echange)}</span>
                    {x.resume && <p className="whitespace-pre-line text-slate-700">{x.resume}</p>}
                    {x.date_rappel && !x.rappel_traite && <p className="text-xs text-blue-700">Rappel le {dateFr(x.date_rappel)}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
