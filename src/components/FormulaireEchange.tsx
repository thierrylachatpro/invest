import { CANAUX, ORDRE_CANAUX, ORDRE_STATUTS, STATUTS } from "@/lib/libelles";
import { versDatetimeLocal } from "@/lib/format";
import type { Echange, Etablissement, Interlocuteur } from "@/lib/types";

export function FormulaireEchange({
  action,
  etablissements,
  interlocuteurs,
  echange,
  libelleBouton = "Enregistrer l'échange",
}: {
  action: (fd: FormData) => Promise<void>;
  etablissements: Pick<Etablissement, "id" | "nom" | "ville">[];
  interlocuteurs: Interlocuteur[];
  echange?: Echange;
  libelleBouton?: string;
}) {
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="etiquette">Canal</span>
          <select name="canal" className="champ" defaultValue={echange?.canal ?? "appel_sortant"}>
            {ORDRE_CANAUX.map((c) => (
              <option key={c} value={c}>
                {CANAUX[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="etiquette">Date et heure {echange ? "" : "(vide = maintenant)"}</span>
          <input type="datetime-local" name="date_echange" className="champ" defaultValue={versDatetimeLocal(echange?.date_echange)} />
        </label>
        <label className="block">
          <span className="etiquette">Interlocuteur</span>
          <select name="interlocuteur_id" className="champ" defaultValue={echange?.interlocuteur_id ?? ""}>
            <option value="">—</option>
            {interlocuteurs.map((i) => (
              <option key={i.id} value={i.id}>
                {[i.prenom, i.nom].filter(Boolean).join(" ")}
                {i.role ? ` (${i.role})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="etiquette">Établissement concerné</span>
          <select name="etablissement_id" className="champ" defaultValue={echange?.etablissement_id ?? ""}>
            <option value="">Tous / non précisé</option>
            {etablissements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom} ({e.ville})
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="etiquette">Résumé de l&apos;échange</span>
        <textarea name="resume" rows={4} className="champ" defaultValue={echange?.resume ?? ""} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="etiquette">Date de rappel {echange ? "" : "(courrier : J+10 automatique)"}</span>
          <input type="date" name="date_rappel" className="champ" defaultValue={echange?.date_rappel ?? ""} />
        </label>
        {echange ? (
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="rappel_traite" defaultChecked={echange.rappel_traite} /> Rappel traité
          </label>
        ) : (
          <label className="block">
            <span className="etiquette">Changer le statut du propriétaire</span>
            <select name="nouveau_statut" className="champ" defaultValue="">
              <option value="">Ne pas changer</option>
              {ORDRE_STATUTS.map((s) => (
                <option key={s} value={s}>
                  {STATUTS[s].libelle}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <button className="btn-primaire">{libelleBouton}</button>
    </form>
  );
}
