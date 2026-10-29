#!/usr/bin/env python3
"""Génère le SQL d'import initial depuis l'export .xlsx du Google Sheet de suivi.

Usage : python3 scripts/import_sheet.py chemin/suivi.xlsx > import.sql

Le fichier source et le SQL produit contiennent des données réelles :
ils ne doivent JAMAIS être commités (voir .gitignore).
"""
import re
import sys
from collections import OrderedDict
from datetime import date, datetime, timedelta

import openpyxl

ANNEE = 2026


def q(v):
    """Littéral SQL."""
    if v is None or (isinstance(v, str) and v.strip() == ""):
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).strip().replace("'", "''") + "'"


def siren_txt(v):
    if v is None or v == "":
        return None
    s = re.sub(r"\D", "", str(v).split(".")[0])
    return s.zfill(9) if s else None


def tel_txt(v):
    if v is None or v == "":
        return None
    if isinstance(v, float):
        v = str(int(v))
    s = str(v).strip()
    chiffres = re.sub(r"\D", "", s)
    if s.startswith("+33"):
        chiffres = "0" + chiffres[2:]
    elif len(chiffres) == 9:
        chiffres = "0" + chiffres
    if len(chiffres) == 10:
        reste = s[len(re.match(r"[\d\s.+]*", s).group(0)):].strip()
        tel = " ".join(chiffres[i:i + 2] for i in range(0, 10, 2))
        return f"{tel} ({reste})" if reste else tel
    return s


def cp_txt(v):
    if v is None or v == "":
        return None
    return str(v).split(".")[0].zfill(5)


def sans_naissance(texte):
    if not texte:
        return texte
    t = re.sub(r",?\s*n[ée]{1,2}(\(e\))?\s+(en\s+)?([a-zéû]+\s+)?\d{4}", "", texte, flags=re.I)
    t = re.sub(r"\(\s*,?\s*", "(", t)
    t = re.sub(r"\(\s*\)", "", t)
    return re.sub(r"\s{2,}", " ", t).strip(" ,")


def parse_siege(texte):
    """Retourne (adresse, cp, ville) à partir d'une adresse libre."""
    if not texte:
        return None, None, None
    t = " ".join(str(texte).split())
    m = None
    for m in re.finditer(r"(\d{5})\s+([^,(—]+)", t):
        pass
    if not m:
        return t, None, None
    adresse = t[: m.start()].strip(" ,")
    if "," in adresse:
        adresse = adresse.split(",")[-1].strip()
    adresse = re.sub(r"^[A-Z .']+:\s*", "", adresse)
    return adresse or None, m.group(1), m.group(2).strip()


def streetview(url):
    """Extrait les coordonnées d'un lien Street View et produit un lien court."""
    if not url:
        return {"sv": None, "lat": None, "lng": None}
    m = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", url) or re.search(r"viewpoint=(-?\d+\.\d+),(-?\d+\.\d+)", url)
    if not m:
        return {"sv": url, "lat": None, "lng": None}
    lat, lng = float(m.group(1)), float(m.group(2))
    court = f"https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={lat},{lng}"
    return {"sv": court, "lat": lat, "lng": lng}


def date_note(note):
    m = re.search(r"(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?", note)
    if not m:
        return None
    annee = int(m.group(3)) if m.group(3) else ANNEE
    if annee < 100:
        annee += 2000
    return date(annee, int(m.group(2)), int(m.group(1)))


def canal_note(note):
    n = note.lower()
    if "repondeur" in n or "répondeur" in n:
        return "appel_sans_reponse"
    if "message" in n:
        return "sms"
    return "appel_sortant"


def main(chemin):
    wb = openpyxl.load_workbook(chemin)
    ws = wb["Laveries"]
    col = {c.value: c.column for c in ws[1] if c.value}
    # « Téléphone public » est en double : on prend les deux colonnes M et N
    def v(i, nom):
        return ws.cell(i, col[nom]).value

    def lien(i, nom):
        c = ws.cell(i, col[nom])
        return c.hyperlink.target if c.hyperlink else None

    # Récapitulatif : noms soignés, contacts nettoyés, siège découpé
    recap = {}
    wr = wb["Recapitulatif"]
    for r in wr.iter_rows(min_row=2):
        if r[0].value and r[1].value:
            recap[siren_txt(r[1].value)] = {
                "nom": str(r[0].value).strip(),
                "contact": r[2].value,
                "adresse": r[3].value,
                "cpville": r[4].value,
            }

    proprietaires = OrderedDict()
    etablissements = []
    for i in range(2, ws.max_row + 1):
        nom = v(i, "Nom de la laverie")
        if not nom:
            continue
        siren = siren_txt(v(i, "SIREN"))
        rs = v(i, "Raison sociale")
        if siren and siren not in proprietaires:
            rc = recap.get(siren)
            if rc and rc["cpville"]:
                cp, ville = (str(rc["cpville"]).split(" ", 1) + [None])[:2]
                adresse = rc["adresse"]
            else:
                adresse, cp, ville = parse_siege(v(i, "Adresse du siège social"))
            proprietaires[siren] = {
                "raison_sociale": rc["nom"] if rc else str(rs).strip(),
                "forme_juridique": v(i, "Forme juridique"),
                "adresse": adresse, "cp": cp, "ville": ville,
                "date_creation": v(i, "Date de création société"),
                "contact": rc["contact"] if rc else None,
                "dirigeants": sans_naissance(v(i, "Dirigeant(s)")),
                "statuts": [], "notes": [], "commentaires": [],
            }
        if siren:
            p = proprietaires[siren]
            sc = (v(i, "Statut courrier") or "").strip()
            p["statuts"].append(sc)
            if sc and sc not in ("Envoyé", "À faire"):
                p["commentaires"].append(f"Statut courrier : {sc}")
            note = v(i, "Relance téléphonique")
            if note and str(note).strip() and str(note).strip() not in p["notes"]:
                p["notes"].append(" ".join(str(note).split()))

        dist = v(i, "Distance")
        if isinstance(dist, str):
            dist = int(re.sub(r"\D", "", dist) or 0) or None
        elif dist is not None:
            dist = int(dist)
        tels = [t for t in (tel_txt(ws.cell(i, 13).value), tel_txt(ws.cell(i, 14).value)) if t]
        ac = v(i, "Contacter ?")
        site = lien(i, "Site") or (v(i, "Site") if str(v(i, "Site") or "").startswith("http") else None)
        etablissements.append({
            "nom": str(nom).strip(), "type": v(i, "Type") or "Laverie",
            "adresse": v(i, "Adresse de la laverie"), "cp": cp_txt(v(i, "Code postal")),
            "ville": v(i, "Ville"), "distance": dist, "zone": v(i, "Zone de chalandise"),
            "franchise": v(i, "Franchise"), "telephone": " / ".join(tels) or None,
            "email": v(i, "Email laverie"), "site": site,
            "note": v(i, "Note Google"), "avis": v(i, "Avis (nb)"),
            "a_contacter": True if ac == "Oui" else False if ac == "Non" else None,
            "siren": siren,
            "maps": lien(i, "Mybusiness"), "gouv": lien(i, "Datas Gouv"),
            **streetview(lien(i, "Street View")),
            "commentaires": v(i, "Commentaires suivi"),
            "date_courrier": v(i, "Date envoi courrier"),
        })

    def values(rows):
        return ",\n".join("(" + ", ".join(q(x) for x in r) + ")" for r in rows)

    props, inters, comms_sans_date, non_vendeurs = [], [], [], []
    courriers, appels = [], []
    for siren, p in proprietaires.items():
        statut = "a_qualifier"
        if any(s == "À faire" or s.lower().startswith("a reporter") for s in p["statuts"]):
            statut = "a_contacter"
        comm = list(p["commentaires"])
        if p["dirigeants"] and not p["contact"]:
            comm.append(f"Dirigeant(s) : {p['dirigeants']}")
        dc = p["date_creation"]
        if isinstance(dc, datetime):
            dc = dc.date().isoformat()
        elif isinstance(dc, str) and re.fullmatch(r"\d{4}-\d{2}", dc.strip()):
            dc = dc.strip() + "-01"
        elif not (isinstance(dc, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", dc.strip())):
            dc = None
        props.append([p["raison_sociale"], siren, p["forme_juridique"], p["adresse"], p["cp"], p["ville"],
                      dc, statut, "\n".join(comm) or None])
        # Interlocuteurs (contacts nettoyés du Récapitulatif)
        for nom_complet in [c.strip() for c in str(p["contact"] or "").split(",") if c.strip()]:
            prenom, _, nom = nom_complet.partition(" ")
            m = re.search(re.escape(nom.split()[-1] if nom else prenom) + r"[^,(]*\(([^)]+)\)", p["dirigeants"] or "", re.I)
            role = m.group(1).strip() if m else None
            if role and not re.search(r"pr[ée]sident|g[ée]rant|\bDG\b|directeur|associ", role, re.I):
                role = None
            if role:
                role = re.sub(r"(?i)^g[ée]rants$", "Gérant", role)
            inters.append([siren, prenom, nom or None, role])
        # Échanges : courrier envoyé puis relances téléphoniques
        dates = {e["date_courrier"] for e in etablissements if e["siren"] == siren and isinstance(e["date_courrier"], datetime)}
        if "Envoyé" in p["statuts"]:
            d = min(dates).date() if dates else date(ANNEE, 10, 16)
            courriers.append([siren, d.isoformat() + " 12:00 Europe/Paris"])
        par_date, sans_date = OrderedDict(), []
        for n in p["notes"]:
            d = date_note(n)
            (par_date.setdefault(d, []) if d else sans_date).append(n)
        if par_date and sans_date:
            par_date[max(par_date)] += sans_date
            sans_date = []
        for d, notes in sorted(par_date.items()):
            canal = canal_note(" ".join(notes))
            rappel = (d + timedelta(days=2)).isoformat() if canal == "appel_sans_reponse" else None
            appels.append([siren, canal, d.isoformat() + " 12:00 Europe/Paris", "\n".join(notes), rappel])
        if sans_date:
            comms_sans_date.append([siren, "Relance : " + " / ".join(sans_date)])
        if any("non vendeur" in n.lower() for n in p["notes"]):
            non_vendeurs.append(siren)

    etabs = []
    for e in etablissements:
        gouv = e["gouv"]
        if e["siren"] and gouv == f"https://annuaire-entreprises.data.gouv.fr/entreprise/{e['siren']}":
            gouv = None  # reconstruit par l'application depuis le SIREN
        etabs.append([e["nom"], e["type"], e["adresse"], e["cp"], e["ville"], e["distance"], e["zone"],
                      e["franchise"], e["telephone"], e["email"], e["site"], e["note"],
                      int(e["avis"]) if e["avis"] else None, e["a_contacter"], e["siren"],
                      e["maps"], e["sv"], gouv, e["commentaires"], e["lat"], e["lng"]])

    out = ["begin;"]
    out.append("insert into public.proprietaires (raison_sociale, siren, forme_juridique, adresse_siege, cp_siege, "
               "ville_siege, date_creation, statut, commentaires)\nselect r, s, f, a, c, v, d::date, st::public.statut_prospection, co from (values\n"
               + values(props) + "\n) t(r, s, f, a, c, v, d, st, co);")
    out.append("insert into public.interlocuteurs (proprietaire_id, prenom, nom, role)\nselect p.id, t.pr, t.n, t.ro from (values\n"
               + values(inters) + "\n) t(s, pr, n, ro) join public.proprietaires p on p.siren = t.s;")
    out.append("insert into public.etablissements (nom, type_id, adresse, code_postal, ville, distance_min, zone, franchise, "
               "telephone, email, site_web, note_google, nb_avis, a_contacter, proprietaire_id, lien_maps, lien_streetview, "
               "lien_annuaire, commentaires, latitude, longitude)\nselect t.n, ty.id, t.a, t.cp, t.v, t.di::int, t.z, t.fr, t.te, t.em, t.si, "
               "t.no::numeric, t.av::int, t.ac::boolean, p.id, t.lm, t.ls, t.la, t.co, t.lat::float8, t.lng::float8 from (values\n"
               + values(etabs) + "\n) t(n, ty, a, cp, v, di, z, fr, te, em, si, no, av, ac, s, lm, ls, la, co, lat, lng)\n"
               "join public.types_commerce ty on ty.nom = t.ty left join public.proprietaires p on p.siren = t.s;")
    out.append("insert into public.echanges (proprietaire_id, canal, date_echange, resume)\nselect p.id, 'courrier_envoye', t.d::timestamptz, "
               "'Courrier de prospection (reprise du fichier de suivi)' from (values\n" + values(courriers)
               + "\n) t(s, d) join public.proprietaires p on p.siren = t.s;")
    if appels:
        out.append("insert into public.echanges (proprietaire_id, canal, date_echange, resume, date_rappel)\nselect p.id, "
                   "t.c::public.canal_echange, t.d::timestamptz, t.r, t.ra::date from (values\n" + values(appels)
                   + "\n) t(s, c, d, r, ra) join public.proprietaires p on p.siren = t.s;")
    if comms_sans_date:
        out.append("update public.proprietaires p set commentaires = concat_ws(E'\\n', p.commentaires, t.c) from (values\n"
                   + values(comms_sans_date) + "\n) t(s, c) where p.siren = t.s;")
    if non_vendeurs:
        out.append("update public.proprietaires set statut = 'non_vendeur' where siren in ("
                   + ", ".join(q(s) for s in non_vendeurs) + ");")
    out.append("commit;")
    print("\n".join(out))


if __name__ == "__main__":
    main(sys.argv[1])
