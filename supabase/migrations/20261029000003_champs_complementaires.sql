-- Champs repris du fichier de suivi Google Sheets
alter table public.etablissements
  add column email text,
  add column site_web text,
  add column note_google numeric(2,1),
  add column nb_avis integer;

alter table public.proprietaires
  add column date_creation date;
