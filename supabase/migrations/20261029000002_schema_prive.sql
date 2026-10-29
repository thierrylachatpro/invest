-- Déplace le contrôle d'accès dans un schéma non exposé par l'API REST
create schema if not exists prive;
grant usage on schema prive to authenticated;

alter table public.utilisateurs_autorises set schema prive;

create or replace function prive.est_autorise()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from prive.utilisateurs_autorises u
    where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function prive.est_autorise() from public, anon;
grant execute on function prive.est_autorise() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['types_commerce','proprietaires','interlocuteurs','etablissements','echanges'] loop
    execute format('drop policy if exists "acces_autorise" on public.%I', t);
    execute format(
      'create policy "acces_autorise" on public.%I for all to authenticated using ((select prive.est_autorise())) with check ((select prive.est_autorise()))', t);
  end loop;
end $$;

drop function public.est_autorise();
