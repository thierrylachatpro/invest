import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ajouterJours, aujourdhui, dateFr, dateHeureFr } from "@/lib/format";
import { CANAUX } from "@/lib/libelles";
import type { Rappel } from "@/lib/types";
import { BadgeStatut, Telephone } from "@/components/ui";
import { marquerRappelTraite, reporterRappel } from "./actions";

export const dynamic = "force-dynamic";

export default async function PageRappels() {
  const supabase = await createClient();
  const { data } = await supabase.from("v_rappels").select("*").order("date_rappel").order("raison_sociale");
  const rappels = (data ?? []) as Rappel[];

  const jour = aujourdhui();
  const dans7 = ajouterJours(jour, 7);
  const groupes = [
    { titre: "En retard", classe: "text-red-700", liste: rappels.filter((r) => r.date_rappel < jour) },
    { titre: "Aujourd'hui", classe: "text-blue-700", liste: rappels.filter((r) => r.date_rappel === jour) },
    { titre: "7 prochains jours", classe: "text-slate-800", liste: rappels.filter((r) => r.date_rappel > jour && r.date_rappel <= dans7) },
    { titre: "Plus tard", classe: "text-slate-500", liste: rappels.filter((r) => r.date_rappel > dans7) },
  ];

  return (
    <div>
      <h1 className="titre-page">À rappeler</h1>
      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        {groupes.slice(0, 3).map((g) => (
          <div key={g.titre} className="carte py-2">
            <span className={`text-lg font-semibold ${g.classe}`}>{g.liste.length}</span>{" "}
            <span className="text-slate-600">{g.titre.toLowerCase()}</span>
          </div>
        ))}
      </div>

      {groupes.map((g) =>
        g.liste.length === 0 ? null : (
          <section key={g.titre} className="mb-8">
            <h2 className={`mb-2 font-semibold ${g.classe}`}>
              {g.titre} ({g.liste.length})
            </h2>
            <div className="space-y-3">
              {g.liste.map((r) => (
                <CarteRappel key={r.echange_id} r={r} enRetard={r.date_rappel < jour} />
              ))}
            </div>
          </section>
        ),
      )}
      {rappels.length === 0 && <p className="text-slate-500">Aucun rappel en attente.</p>}
    </div>
  );
}

function CarteRappel({ r, enRetard }: { r: Rappel; enRetard: boolean }) {
  const interlocuteur = [r.prenom, r.nom_interlocuteur].filter(Boolean).join(" ");
  const tel = r.telephone_interlocuteur || r.telephone_proprietaire;
  return (
    <div className={`carte ${enRetard ? "border-l-4 border-l-red-400" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`/proprietaires/${r.proprietaire_id}`} className="font-medium lien">
            {r.raison_sociale}
          </Link>{" "}
          <BadgeStatut statut={r.statut} />
          <div className="mt-1 text-sm text-slate-600">
            {interlocuteur && <span>{interlocuteur} · </span>}
            <Telephone tel={tel} />
            {r.nom_etablissement && (
              <span>
                {" "}
                · {r.nom_etablissement} ({r.ville_etablissement})
              </span>
            )}
          </div>
        </div>
        <div className={`text-sm font-medium ${enRetard ? "text-red-700" : "text-slate-700"}`}>Rappel le {dateFr(r.date_rappel)}</div>
      </div>
      <p className="mt-2 text-sm text-slate-700">
        <span className="text-slate-500">
          {CANAUX[r.canal]} du {dateHeureFr(r.date_echange)} :
        </span>{" "}
        <span className="whitespace-pre-line">{r.resume || "—"}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link href={`/proprietaires/${r.proprietaire_id}#nouvel-echange`} className="btn-primaire">
          Noter l&apos;appel
        </Link>
        <form action={marquerRappelTraite.bind(null, r.echange_id)}>
          <button className="btn">Marquer traité</button>
        </form>
        <form action={reporterRappel.bind(null, r.echange_id)}>
          <input type="hidden" name="jours" value="1" />
          <button className="btn">+1 jour</button>
        </form>
        <form action={reporterRappel.bind(null, r.echange_id)}>
          <input type="hidden" name="jours" value="7" />
          <button className="btn">+1 semaine</button>
        </form>
        <form action={reporterRappel.bind(null, r.echange_id)} className="flex items-center gap-1">
          <input type="date" name="date" className="champ w-auto py-1" required />
          <button className="btn">Reporter</button>
        </form>
      </div>
    </div>
  );
}
