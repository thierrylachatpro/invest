const TZ = "Europe/Paris";

/** Date du jour à Paris, au format AAAA-MM-JJ */
export function aujourdhui(): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: TZ }).format(new Date());
}

export function ajouterJours(isoDate: string, jours: number): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

/** AAAA-MM-JJ → JJ/MM/AAAA */
export function dateFr(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const [a, m, j] = isoDate.slice(0, 10).split("-");
  return `${j}/${m}/${a}`;
}

/** timestamptz → JJ/MM/AAAA à HH:MM (heure de Paris) */
export function dateHeureFr(ts: string | null | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  const date = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, dateStyle: "short" }).format(d);
  const heure = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  return `${date} à ${heure}`;
}

/** timestamptz → valeur pour <input type="datetime-local"> en heure de Paris */
export function versDatetimeLocal(ts: string | null | undefined): string {
  if (!ts) return "";
  const parts = new Intl.DateTimeFormat("fr-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ts));
  const v = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${v("year")}-${v("month")}-${v("day")}T${v("hour")}:${v("minute")}`;
}

/** Valeur datetime-local saisie en heure de Paris → littéral timestamptz */
export function depuisDatetimeLocal(v: string): string {
  return `${v.replace("T", " ")} ${TZ}`;
}

/** Normalise pour la recherche : minuscules, sans accents */
export function normaliser(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function lienTel(tel: string | null | undefined): string | null {
  if (!tel) return null;
  const premier = tel.split("/")[0];
  const chiffres = premier.replace(/[^\d+]/g, "");
  return chiffres.length >= 10 ? `tel:${chiffres}` : null;
}
