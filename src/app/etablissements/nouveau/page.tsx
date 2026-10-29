import { creerEtablissement } from "@/app/actions";
import { FormulaireEtablissement } from "@/components/FormulaireEtablissement";
import { Erreur, Retour } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { TypeCommerce } from "@/lib/types";

export default async function PageNouvelEtablissement({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; proprietaire?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: types }, { data: props }] = await Promise.all([
    supabase.from("types_commerce").select("*").eq("actif", true).order("nom"),
    supabase.from("proprietaires").select("id, raison_sociale, siren").eq("archive", false).order("raison_sociale"),
  ]);
  return (
    <div className="max-w-3xl">
      <Retour href="/etablissements">Établissements</Retour>
      <h1 className="titre-page">Nouvel établissement</h1>
      <Erreur message={sp.erreur} />
      <FormulaireEtablissement
        action={creerEtablissement}
        types={(types ?? []) as TypeCommerce[]}
        proprietaires={props ?? []}
        proprietaireParDefaut={sp.proprietaire ? Number(sp.proprietaire) : undefined}
        creation
      />
    </div>
  );
}
