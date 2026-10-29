import { notFound } from "next/navigation";
import { modifierEtablissement } from "@/app/actions";
import { FormulaireEtablissement } from "@/components/FormulaireEtablissement";
import { Erreur, Retour } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Etablissement, TypeCommerce } from "@/lib/types";

export default async function PageModifierEtablissement({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: types }, { data: props }] = await Promise.all([
    supabase.from("etablissements").select("*").eq("id", id).single(),
    supabase.from("types_commerce").select("*").order("nom"),
    supabase.from("proprietaires").select("id, raison_sociale, siren").order("raison_sociale"),
  ]);
  if (!data) notFound();
  const e = data as Etablissement;
  return (
    <div className="max-w-3xl">
      <Retour href={`/etablissements/${e.id}`}>{e.nom}</Retour>
      <h1 className="titre-page">Modifier l&apos;établissement</h1>
      <Erreur message={erreur} />
      <FormulaireEtablissement
        action={modifierEtablissement.bind(null, e.id)}
        e={e}
        types={(types ?? []) as TypeCommerce[]}
        proprietaires={props ?? []}
      />
    </div>
  );
}
