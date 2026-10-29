import { notFound } from "next/navigation";
import { modifierProprietaire } from "@/app/actions";
import { FormulaireProprietaire } from "@/components/FormulaireProprietaire";
import { Erreur, Retour } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Proprietaire } from "@/lib/types";

export default async function PageModifierProprietaire({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("proprietaires").select("*").eq("id", id).single();
  if (!data) notFound();
  const p = data as Proprietaire;
  return (
    <div className="max-w-3xl">
      <Retour href={`/proprietaires/${p.id}`}>{p.raison_sociale}</Retour>
      <h1 className="titre-page">Modifier le propriétaire</h1>
      <Erreur message={erreur} />
      <FormulaireProprietaire action={modifierProprietaire.bind(null, p.id)} p={p} />
    </div>
  );
}
