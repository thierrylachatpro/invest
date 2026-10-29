import { creerProprietaire } from "@/app/actions";
import { FormulaireProprietaire } from "@/components/FormulaireProprietaire";
import { Erreur, Retour } from "@/components/ui";

export default async function PageNouveauProprietaire({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  return (
    <div className="max-w-3xl">
      <Retour href="/proprietaires">Propriétaires</Retour>
      <h1 className="titre-page">Nouveau propriétaire</h1>
      <Erreur message={erreur} />
      <FormulaireProprietaire action={creerProprietaire} />
    </div>
  );
}
