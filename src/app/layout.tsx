import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { deconnexion } from "./actions";

export const metadata: Metadata = {
  title: "Invest — suivi de prospection",
  description: "Suivi des établissements, propriétaires et échanges",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const MENU = [
  { href: "/", libelle: "À rappeler" },
  { href: "/etablissements", libelle: "Établissements" },
  { href: "/proprietaires", libelle: "Propriétaires" },
  { href: "/courriers", libelle: "Courrier groupé" },
];

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="fr">
      <body className="antialiased">
        {user && (
          <header className="border-b border-slate-200 bg-white">
            <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <span className="mr-2 font-semibold text-blue-700">Invest</span>
              {MENU.map((m) => (
                <Link key={m.href} href={m.href} className="text-sm text-slate-700 hover:text-blue-700">
                  {m.libelle}
                </Link>
              ))}
              <form action={deconnexion} className="ml-auto">
                <button className="text-sm text-slate-500 hover:text-slate-800">Déconnexion</button>
              </form>
            </nav>
          </header>
        )}
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
