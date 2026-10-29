"use client";

export default function Erreur({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="carte max-w-xl">
      <h1 className="mb-2 font-semibold text-red-700">Une erreur est survenue</h1>
      <p className="mb-4 text-sm text-slate-700">{error.message}</p>
      <button className="btn" onClick={reset}>
        Réessayer
      </button>
    </div>
  );
}
