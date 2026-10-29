import { notFound } from "next/navigation";
import { modifierEchange, supprimerEchange } from "@/app/actions";
import { BoutonConfirmer } from "@/components/BoutonConfirmer";
import { FormulaireEchange } from "@/components/FormulaireEchange";
import { Erreur, Retour } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Echange, Etablissement, Interlocuteur } from "@/lib/types";

export default async function PageModifierEchange({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("echanges").select("*, proprietaires(raison_sociale)").eq("id", id).single();
  if (!data) notFound();
  const x = data as Echange & { proprietaires: { raison_sociale: string } | null };
  const [{ data: iData }, { data: eData }] = await Promise.all([
    supabase.from("interlocuteurs").select("*").eq("proprietaire_id", x.proprietaire_id),
    supabase.from("etablissements").select("id, nom, ville").eq("proprietaire_id", x.proprietaire_id),
  ]);
  return (
    <div className="max-w-3xl">
      <Retour href={`/proprietaires/${x.proprietaire_id}`}>{x.proprietaires?.raison_sociale}</Retour>
      <h1 className="titre-page">Modifier l&apos;échange</h1>
      <Erreur message={erreur} />
      <div className="carte">
        <FormulaireEchange
          action={modifierEchange.bind(null, x.id, x.proprietaire_id)}
          etablissements={(eData ?? []) as Pick<Etablissement, "id" | "nom" | "ville">[]}
          interlocuteurs={(iData ?? []) as Interlocuteur[]}
          echange={x}
        />
      </div>
      <form action={supprimerEchange.bind(null, x.id, x.proprietaire_id)} className="mt-4">
        <BoutonConfirmer message="Supprimer cet échange ?">Supprimer l&apos;échange</BoutonConfirmer>
      </form>
    </div>
  );
}
