"use client";

import { useActionState } from "react";
import { connexion } from "../actions";

export default function PageConnexion() {
  const [erreur, action, enCours] = useActionState(connexion, null);
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="titre-page text-center">Invest — connexion</h1>
      <form action={action} className="carte space-y-3">
        <label className="block">
          <span className="etiquette">E-mail</span>
          <input className="champ" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block">
          <span className="etiquette">Mot de passe</span>
          <input className="champ" name="password" type="password" autoComplete="current-password" required />
        </label>
        {erreur && <p className="text-sm text-red-700">{erreur}</p>}
        <button className="btn-primaire w-full" disabled={enCours}>
          {enCours ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
