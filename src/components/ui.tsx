import Link from "next/link";
import { STATUTS } from "@/lib/libelles";
import type { Statut } from "@/lib/types";

export function BadgeStatut({ statut }: { statut: Statut }) {
  const s = STATUTS[statut];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.classe}`}>{s.libelle}</span>;
}

export function Erreur({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{message}</div>;
}

export function Succes({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div>;
}

export function BoutonLien({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return <span className="btn cursor-not-allowed opacity-40">{children}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn">
      {children}
    </a>
  );
}

export function Telephone({ tel }: { tel: string | null | undefined }) {
  if (!tel) return null;
  const href = `tel:${tel.split("/")[0].replace(/[^\d+]/g, "")}`;
  return (
    <a href={href} className="lien whitespace-nowrap">
      {tel}
    </a>
  );
}

export function Champ({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  placeholder,
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="etiquette">{label}</span>
      <input
        className="champ"
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        step={step}
      />
    </label>
  );
}

export function ZoneTexte({ label, name, defaultValue, rows = 3 }: { label: string; name: string; defaultValue?: string | null; rows?: number }) {
  return (
    <label className="block">
      <span className="etiquette">{label}</span>
      <textarea className="champ" name={name} rows={rows} defaultValue={defaultValue ?? ""} />
    </label>
  );
}

export function Retour({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-block text-sm text-slate-500 hover:text-slate-800">
      ← {children}
    </Link>
  );
}
