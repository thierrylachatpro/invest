import { ZONES } from "@/lib/libelles";
import type { Etablissement, TypeCommerce } from "@/lib/types";
import { Champ, ZoneTexte } from "./ui";

export function FormulaireEtablissement({
  action,
  e,
  types,
  proprietaires,
  proprietaireParDefaut,
  creation,
}: {
  action: (fd: FormData) => Promise<void>;
  e?: Etablissement;
  types: TypeCommerce[];
  proprietaires: { id: number; raison_sociale: string; siren: string | null }[];
  proprietaireParDefaut?: number;
  creation?: boolean;
}) {
  const ac = e?.a_contacter === true ? "oui" : e?.a_contacter === false ? "non" : "";
  return (
    <form action={action} className="carte space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ label="Nom commercial *" name="nom" defaultValue={e?.nom} required />
        <label className="block">
          <span className="etiquette">Type *</span>
          <select name="type_id" className="champ" defaultValue={e?.type_id ?? types[0]?.id}>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </select>
        </label>
        <Champ label="Adresse" name="adresse" defaultValue={e?.adresse} />
        <div className="grid grid-cols-3 gap-3">
          <Champ label="Code postal" name="code_postal" defaultValue={e?.code_postal} />
          <div className="col-span-2">
            <Champ label="Ville" name="ville" defaultValue={e?.ville} />
          </div>
        </div>
        <Champ label="Distance depuis Clairy-Saulchoix (min)" name="distance_min" type="number" defaultValue={e?.distance_min} />
        <label className="block">
          <span className="etiquette">Zone de chalandise</span>
          <select name="zone" className="champ" defaultValue={e?.zone ?? ""}>
            <option value="">—</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
        <Champ label="Franchise (vide = indépendant)" name="franchise" defaultValue={e?.franchise} />
        <label className="block">
          <span className="etiquette">À contacter ?</span>
          <select name="a_contacter" className="champ" defaultValue={ac}>
            <option value="">Non renseigné</option>
            <option value="oui">Oui</option>
            <option value="non">Non</option>
          </select>
        </label>
        <Champ label="Téléphone" name="telephone" type="tel" defaultValue={e?.telephone} />
        <Champ label="E-mail" name="email" type="email" defaultValue={e?.email} />
        <Champ label="Site web" name="site_web" defaultValue={e?.site_web} />
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Note Google" name="note_google" type="number" step="0.1" defaultValue={e?.note_google} />
          <Champ label="Nb d'avis" name="nb_avis" type="number" defaultValue={e?.nb_avis} />
        </div>
      </div>

      <fieldset className="rounded-md border border-slate-200 p-3">
        <legend className="px-1 text-sm font-medium">Propriétaire</legend>
        <select name="proprietaire_id" className="champ" defaultValue={e?.proprietaire_id ?? proprietaireParDefaut ?? ""}>
          <option value="">Non identifié</option>
          <option value="nouveau">+ Nouveau propriétaire…</option>
          {proprietaires.map((p) => (
            <option key={p.id} value={p.id}>
              {p.raison_sociale}
              {p.siren ? ` (${p.siren})` : ""}
            </option>
          ))}
        </select>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input name="nouveau_proprietaire" placeholder="Raison sociale du nouveau propriétaire" className="champ" />
          <input name="nouveau_siren" placeholder="SIREN du nouveau propriétaire" className="champ" />
        </div>
        <p className="mt-1 text-xs text-slate-500">Les deux champs ci-dessus ne servent que si « Nouveau propriétaire » est choisi.</p>
      </fieldset>

      <details className="rounded-md border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-medium">Liens et coordonnées (facultatif)</summary>
        <p className="mt-1 text-xs text-slate-500">Laissés vides, les liens sont construits depuis l&apos;adresse ou le SIREN.</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Champ label="Lien Google Maps" name="lien_maps" defaultValue={e?.lien_maps} />
          <Champ label="Lien Street View" name="lien_streetview" defaultValue={e?.lien_streetview} />
          <Champ label="Lien annuaire-entreprises" name="lien_annuaire" defaultValue={e?.lien_annuaire} />
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Latitude" name="latitude" type="number" step="any" defaultValue={e?.latitude} />
            <Champ label="Longitude" name="longitude" type="number" step="any" defaultValue={e?.longitude} />
          </div>
        </div>
      </details>

      <ZoneTexte label="Commentaires" name="commentaires" defaultValue={e?.commentaires} rows={4} />
      {creation && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ignorer_doublon" /> Créer quand même si un établissement du même nom existe au même code postal
        </label>
      )}
      <button className="btn-primaire">Enregistrer</button>
    </form>
  );
}
