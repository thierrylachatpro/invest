import { ORDRE_STATUTS, STATUTS } from "@/lib/libelles";
import type { Proprietaire } from "@/lib/types";
import { Champ, ZoneTexte } from "./ui";

export function FormulaireProprietaire({
  action,
  p,
}: {
  action: (fd: FormData) => Promise<void>;
  p?: Proprietaire;
}) {
  return (
    <form action={action} className="carte space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ label="Raison sociale *" name="raison_sociale" defaultValue={p?.raison_sociale} required />
        <Champ label="SIREN (9 chiffres)" name="siren" defaultValue={p?.siren} />
        <Champ label="Forme juridique" name="forme_juridique" defaultValue={p?.forme_juridique} />
        <label className="block">
          <span className="etiquette">Statut de prospection</span>
          <select name="statut" className="champ" defaultValue={p?.statut ?? "a_qualifier"}>
            {ORDRE_STATUTS.map((s) => (
              <option key={s} value={s}>
                {STATUTS[s].libelle}
              </option>
            ))}
          </select>
        </label>
        <Champ label="Adresse du siège" name="adresse_siege" defaultValue={p?.adresse_siege} />
        <div className="grid grid-cols-3 gap-3">
          <Champ label="CP" name="cp_siege" defaultValue={p?.cp_siege} />
          <div className="col-span-2">
            <Champ label="Ville" name="ville_siege" defaultValue={p?.ville_siege} />
          </div>
        </div>
        <Champ label="Téléphone" name="telephone" defaultValue={p?.telephone} type="tel" />
        <Champ label="E-mail" name="email" defaultValue={p?.email} type="email" />
      </div>
      <ZoneTexte label="Commentaires" name="commentaires" defaultValue={p?.commentaires} rows={4} />
      <button className="btn-primaire">Enregistrer</button>
    </form>
  );
}
