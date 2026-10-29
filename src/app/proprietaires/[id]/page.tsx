import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ajouterEchange,
  ajouterInterlocuteur,
  basculerArchive,
  changerStatut,
  supprimerInterlocuteur,
  supprimerProprietaire,
} from "@/app/actions";
import { BoutonConfirmer } from "@/components/BoutonConfirmer";
import { FormulaireEchange } from "@/components/FormulaireEchange";
import { BadgeStatut, BoutonLien, Erreur, Retour, Telephone } from "@/components/ui";
import { aujourdhui, dateFr, dateHeureFr } from "@/lib/format";
import { CANAUX, ORDRE_STATUTS, STATUTS } from "@/lib/libelles";
import { lienAnnuaire } from "@/lib/liens";
import { createClient } from "@/lib/supabase/server";
import type { Echange, Etablissement, Interlocuteur, Proprietaire } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PageProprietaire({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string; etab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: pData }, { data: iData }, { data: eData }, { data: xData }] = await Promise.all([
    supabase.from("proprietaires").select("*").eq("id", id).single(),
    supabase.from("interlocuteurs").select("*").eq("proprietaire_id", id).order("id"),
    supabase.from("etablissements").select("*, types_commerce(nom)").eq("proprietaire_id", id).order("ville"),
    supabase.from("echanges").select("*").eq("proprietaire_id", id).order("date_echange", { ascending: false }),
  ]);
  if (!pData) notFound();
  const p = pData as Proprietaire;
  const interlocuteurs = (iData ?? []) as Interlocuteur[];
  const etablissements = (eData ?? []) as (Etablissement & { types_commerce: { nom: string } | null })[];
  let echanges = (xData ?? []) as Echange[];
  const filtreEtab = sp.etab ? Number(sp.etab) : null;
  if (filtreEtab) echanges = echanges.filter((e) => e.etablissement_id === filtreEtab);

  const nomInterlocuteur = (iid: number | null) => {
    const i = interlocuteurs.find((x) => x.id === iid);
    return i ? [i.prenom, i.nom].filter(Boolean).join(" ") : null;
  };
  const nomEtab = (eid: number | null) => etablissements.find((x) => x.id === eid);
  const jour = aujourdhui();

  return (
    <div>
      <Retour href="/proprietaires">Propriétaires</Retour>
      <Erreur message={sp.erreur} />
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {p.raison_sociale} {p.archive && <span className="text-sm text-slate-500">(archivé)</span>}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <BadgeStatut statut={p.statut} />
            {p.forme_juridique && <span>{p.forme_juridique}</span>}
            {p.siren && <span>SIREN {p.siren}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <BoutonLien href={lienAnnuaire(null, p.siren)}>Annuaire entreprises</BoutonLien>
          <Link href={`/proprietaires/${p.id}/modifier`} className="btn">
            Modifier
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <section className="carte text-sm">
            <h2 className="mb-2 font-semibold">Coordonnées</h2>
            <p>{p.adresse_siege}</p>
            <p>{[p.cp_siege, p.ville_siege].filter(Boolean).join(" ")}</p>
            {p.telephone && (
              <p className="mt-1">
                Tél. <Telephone tel={p.telephone} />
              </p>
            )}
            {p.email && (
              <p>
                <a className="lien" href={`mailto:${p.email}`}>
                  {p.email}
                </a>
              </p>
            )}
            {p.date_creation && <p className="mt-1 text-slate-500">Société créée le {dateFr(p.date_creation)}</p>}
            {p.commentaires && <p className="mt-2 whitespace-pre-line text-slate-700">{p.commentaires}</p>}
            <form action={changerStatut.bind(null, p.id)} className="mt-3 flex gap-2">
              <select name="statut" defaultValue={p.statut} className="champ py-1">
                {ORDRE_STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {STATUTS[s].libelle}
                  </option>
                ))}
              </select>
              <button className="btn">OK</button>
            </form>
          </section>

          <section className="carte text-sm">
            <h2 className="mb-2 font-semibold">Interlocuteurs</h2>
            <ul className="space-y-2">
              {interlocuteurs.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {[i.prenom, i.nom].filter(Boolean).join(" ")}
                      {i.role && <span className="font-normal text-slate-500"> · {i.role}</span>}
                    </div>
                    <Telephone tel={i.telephone} />
                    {i.email && (
                      <a className="lien ml-2" href={`mailto:${i.email}`}>
                        {i.email}
                      </a>
                    )}
                  </div>
                  <form action={supprimerInterlocuteur.bind(null, i.id, p.id)}>
                    <BoutonConfirmer message="Supprimer cet interlocuteur ?" className="text-xs text-red-600 hover:underline">
                      Supprimer
                    </BoutonConfirmer>
                  </form>
                </li>
              ))}
            </ul>
            <details className="mt-3">
              <summary className="cursor-pointer text-blue-700">+ Ajouter un interlocuteur</summary>
              <form action={ajouterInterlocuteur.bind(null, p.id)} className="mt-2 grid grid-cols-2 gap-2">
                <input name="prenom" placeholder="Prénom" className="champ" />
                <input name="nom" placeholder="Nom" className="champ" />
                <input name="role" placeholder="Rôle" className="champ" />
                <input name="telephone" placeholder="Téléphone" className="champ" />
                <input name="email" placeholder="E-mail" className="champ col-span-2" />
                <button className="btn-primaire col-span-2">Ajouter</button>
              </form>
            </details>
          </section>

          <section className="carte text-sm">
            <h2 className="mb-2 font-semibold">Établissements ({etablissements.length})</h2>
            <ul className="space-y-1">
              {etablissements.map((e) => (
                <li key={e.id}>
                  <Link href={`/etablissements/${e.id}`} className="lien">
                    {e.nom}
                  </Link>{" "}
                  <span className="text-slate-500">
                    · {e.types_commerce?.nom} · {e.ville}
                    {e.distance_min != null && ` · ${e.distance_min} min`}
                  </span>
                </li>
              ))}
            </ul>
            <Link href={`/etablissements/nouveau?proprietaire=${p.id}`} className="mt-2 inline-block text-blue-700">
              + Ajouter un établissement
            </Link>
          </section>

          <section className="flex flex-wrap gap-2">
            <form action={basculerArchive.bind(null, p.id, !p.archive)}>
              <button className="btn">{p.archive ? "Désarchiver" : "Archiver"}</button>
            </form>
            <form action={supprimerProprietaire.bind(null, p.id)}>
              <BoutonConfirmer message={`Supprimer définitivement ${p.raison_sociale} et tous ses échanges ? Préférez l'archivage pour garder l'historique.`}>
                Supprimer
              </BoutonConfirmer>
            </form>
          </section>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <section id="nouvel-echange" className="carte">
            <h2 className="mb-3 font-semibold">Nouvel échange</h2>
            <FormulaireEchange
              action={ajouterEchange.bind(null, p.id)}
              etablissements={etablissements}
              interlocuteurs={interlocuteurs}
            />
          </section>

          <section className="carte">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Historique des échanges ({echanges.length})</h2>
              {etablissements.length > 1 && (
                <form className="flex gap-2">
                  <select name="etab" defaultValue={sp.etab ?? ""} className="champ py-1 text-sm">
                    <option value="">Tous les établissements</option>
                    {etablissements.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nom} ({e.ville})
                      </option>
                    ))}
                  </select>
                  <button className="btn">Filtrer</button>
                </form>
              )}
            </div>
            {echanges.length === 0 && <p className="text-sm text-slate-500">Aucun échange pour l&apos;instant.</p>}
            <ol className="space-y-3">
              {echanges.map((x) => {
                const etab = nomEtab(x.etablissement_id);
                const qui = nomInterlocuteur(x.interlocuteur_id);
                const rappelActif = x.date_rappel && !x.rappel_traite;
                return (
                  <li key={x.id} className="border-l-2 border-slate-200 pl-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <div>
                        <span className="font-medium">{CANAUX[x.canal]}</span>
                        <span className="text-slate-500"> · {dateHeureFr(x.date_echange)}</span>
                        {qui && <span className="text-slate-500"> · {qui}</span>}
                        {etab && <span className="text-slate-500"> · {etab.nom} ({etab.ville})</span>}
                      </div>
                      <Link href={`/echanges/${x.id}/modifier`} className="text-xs text-blue-700 hover:underline">
                        Modifier
                      </Link>
                    </div>
                    {x.resume && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{x.resume}</p>}
                    {x.date_rappel && (
                      <p className={`mt-1 text-xs ${rappelActif ? (x.date_rappel < jour ? "text-red-700" : "text-blue-700") : "text-slate-400 line-through"}`}>
                        Rappel le {dateFr(x.date_rappel)}
                        {x.rappel_traite && " (traité)"}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
