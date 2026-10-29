-- Schéma initial de l'outil de suivi de prospection (cf. cahier des charges)

create extension if not exists unaccent with schema extensions;

-- Statuts et canaux
create type public.statut_prospection as enum (
  'a_qualifier', 'a_contacter', 'courrier_envoye', 'en_discussion',
  'offre_recue', 'visite_analyse', 'non_vendeur', 'abandonne'
);

create type public.canal_echange as enum (
  'courrier_envoye', 'courrier_recu', 'appel_sortant', 'appel_entrant',
  'appel_sans_reponse', 'message_laisse', 'email', 'sms', 'rendez_vous'
);

-- Utilisateurs autorisés (liste blanche d'e-mails, alimentée hors dépôt)
create table public.utilisateurs_autorises (
  email text primary key
);
alter table public.utilisateurs_autorises enable row level security;
-- aucune policy : table lisible uniquement via la fonction ci-dessous

create or replace function public.est_autorise()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.utilisateurs_autorises u
    where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.est_autorise() from public, anon;
grant execute on function public.est_autorise() to authenticated;

-- Horodatage de mise à jour
create or replace function public.maj_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Types de commerce
create table public.types_commerce (
  id bigint generated always as identity primary key,
  nom text not null unique,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.types_commerce (nom) values ('Laverie'), ('CarWash');

-- Propriétaires (sociétés exploitantes)
create table public.proprietaires (
  id bigint generated always as identity primary key,
  raison_sociale text not null,
  siren text unique check (siren is null or siren ~ '^[0-9]{9}$'),
  forme_juridique text,
  adresse_siege text,
  cp_siege text,
  ville_siege text,
  telephone text,
  email text,
  statut public.statut_prospection not null default 'a_qualifier',
  commentaires text,
  archive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger proprietaires_updated before update on public.proprietaires
  for each row execute function public.maj_updated_at();

-- Interlocuteurs
create table public.interlocuteurs (
  id bigint generated always as identity primary key,
  proprietaire_id bigint not null references public.proprietaires(id) on delete cascade,
  prenom text,
  nom text,
  role text,
  telephone text,
  email text,
  created_at timestamptz not null default now()
);
create index on public.interlocuteurs (proprietaire_id);

-- Établissements
create table public.etablissements (
  id bigint generated always as identity primary key,
  nom text not null,
  type_id bigint not null references public.types_commerce(id),
  adresse text,
  code_postal text,
  ville text,
  latitude double precision,
  longitude double precision,
  distance_min integer,
  zone text check (zone is null or zone in ('< 45min', '45min - 60min', '> 60min')),
  franchise text,
  telephone text,
  a_contacter boolean,
  proprietaire_id bigint references public.proprietaires(id) on delete set null,
  lien_maps text,
  lien_streetview text,
  lien_annuaire text,
  commentaires text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.etablissements (proprietaire_id);
create index on public.etablissements (type_id);
create trigger etablissements_updated before update on public.etablissements
  for each row execute function public.maj_updated_at();

-- Échanges
create table public.echanges (
  id bigint generated always as identity primary key,
  proprietaire_id bigint not null references public.proprietaires(id) on delete cascade,
  etablissement_id bigint references public.etablissements(id) on delete set null,
  interlocuteur_id bigint references public.interlocuteurs(id) on delete set null,
  date_echange timestamptz not null default now(),
  canal public.canal_echange not null,
  resume text,
  date_rappel date,
  rappel_traite boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.echanges (proprietaire_id);
create index on public.echanges (etablissement_id);
create index on public.echanges (interlocuteur_id);
create index on public.echanges (date_rappel) where rappel_traite = false;

-- Règles métier : rappel J+10 après un courrier, rappel précédent traité, statut
create or replace function public.echange_avant_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.date_echange is null then
    new.date_echange = now();
  end if;
  if new.canal = 'courrier_envoye' and new.date_rappel is null then
    new.date_rappel = (new.date_echange at time zone 'Europe/Paris')::date + 10;
  end if;
  return new;
end;
$$;
create trigger echanges_avant_insert before insert on public.echanges
  for each row execute function public.echange_avant_insert();

create or replace function public.echange_apres_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.echanges
     set rappel_traite = true
   where proprietaire_id = new.proprietaire_id
     and id <> new.id
     and rappel_traite = false
     and date_echange <= new.date_echange;

  if new.canal = 'courrier_envoye' then
    update public.proprietaires
       set statut = 'courrier_envoye'
     where id = new.proprietaire_id
       and statut in ('a_qualifier', 'a_contacter');
  end if;
  return new;
end;
$$;
create trigger echanges_apres_insert after insert on public.echanges
  for each row execute function public.echange_apres_insert();

-- Vue « À rappeler »
create view public.v_rappels with (security_invoker = true) as
select e.id as echange_id,
       e.date_rappel,
       e.date_echange,
       e.canal,
       e.resume,
       p.id as proprietaire_id,
       p.raison_sociale,
       p.telephone as telephone_proprietaire,
       p.statut,
       i.prenom, i.nom as nom_interlocuteur, i.telephone as telephone_interlocuteur,
       et.id as etablissement_id, et.nom as nom_etablissement, et.ville as ville_etablissement
  from public.echanges e
  join public.proprietaires p on p.id = e.proprietaire_id
  left join public.interlocuteurs i on i.id = e.interlocuteur_id
  left join public.etablissements et on et.id = e.etablissement_id
 where e.rappel_traite = false
   and e.date_rappel is not null
   and p.archive = false;

-- Sécurité : RLS, accès réservé aux utilisateurs autorisés
alter table public.types_commerce enable row level security;
alter table public.proprietaires enable row level security;
alter table public.interlocuteurs enable row level security;
alter table public.etablissements enable row level security;
alter table public.echanges enable row level security;

create policy "acces_autorise" on public.types_commerce for all to authenticated
  using ((select public.est_autorise())) with check ((select public.est_autorise()));
create policy "acces_autorise" on public.proprietaires for all to authenticated
  using ((select public.est_autorise())) with check ((select public.est_autorise()));
create policy "acces_autorise" on public.interlocuteurs for all to authenticated
  using ((select public.est_autorise())) with check ((select public.est_autorise()));
create policy "acces_autorise" on public.etablissements for all to authenticated
  using ((select public.est_autorise())) with check ((select public.est_autorise()));
create policy "acces_autorise" on public.echanges for all to authenticated
  using ((select public.est_autorise())) with check ((select public.est_autorise()));

revoke all on all tables in schema public from anon;
