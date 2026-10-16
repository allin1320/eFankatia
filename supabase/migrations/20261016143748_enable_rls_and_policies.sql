-- Activation de la Row Level Security (RLS) sur toutes les tables applicatives.

alter table public.personnes enable row level security;
alter table public.mariages enable row level security;
alter table public.parent_enfants enable row level security;
alter table public.mariage_enfants enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

-- ---------------------------------------------------------------------------
-- personnes
-- ---------------------------------------------------------------------------

-- Lecture : tout utilisateur authentifié consulte l'arbre (le rôle ROLE_USER est
-- justement un rôle de consultation).
create policy "personnes_select" on public.personnes
  for select to authenticated using (true);

-- Mise à jour : admin partout, modérateur dans sa lignée.
create policy "personnes_update_admin" on public.personnes
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "personnes_update_moderator" on public.personnes
  for update to authenticated
  using (public.is_moderator() and public.is_in_lignee(id))
  with check (public.is_moderator() and public.is_in_lignee(id));

-- Suppression : admin partout, modérateur dans sa lignée.
create policy "personnes_delete_admin" on public.personnes
  for delete to authenticated
  using (public.is_admin());

create policy "personnes_delete_moderator" on public.personnes
  for delete to authenticated
  using (public.is_moderator() and public.is_in_lignee(id));

-- INSERT volontairement absent : la création d'une personne passe par les RPC
-- SECURITY DEFINER (create_personne_*) qui vérifient le rôle et la lignée de
-- façon atomique (rattachement dans une autre table).

-- ---------------------------------------------------------------------------
-- mariages
-- ---------------------------------------------------------------------------

create policy "mariages_select" on public.mariages
  for select to authenticated using (true);

create policy "mariages_insert_admin" on public.mariages
  for insert to authenticated
  with check (public.is_admin());

create policy "mariages_insert_moderator" on public.mariages
  for insert to authenticated
  with check (
    public.is_moderator()
    and (public.is_in_lignee(personne_1_id) or public.is_in_lignee(personne_2_id))
  );

create policy "mariages_update_admin" on public.mariages
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "mariages_update_moderator" on public.mariages
  for update to authenticated
  using (
    public.is_moderator()
    and (public.is_in_lignee(personne_1_id) or public.is_in_lignee(personne_2_id))
  )
  with check (
    public.is_moderator()
    and (public.is_in_lignee(personne_1_id) or public.is_in_lignee(personne_2_id))
  );

create policy "mariages_delete_admin" on public.mariages
  for delete to authenticated
  using (public.is_admin());

create policy "mariages_delete_moderator" on public.mariages
  for delete to authenticated
  using (
    public.is_moderator()
    and (public.is_in_lignee(personne_1_id) or public.is_in_lignee(personne_2_id))
  );

-- ---------------------------------------------------------------------------
-- parent_enfants
-- ---------------------------------------------------------------------------

create policy "parent_enfants_select" on public.parent_enfants
  for select to authenticated using (true);

create policy "parent_enfants_insert_admin" on public.parent_enfants
  for insert to authenticated
  with check (public.is_admin());

create policy "parent_enfants_insert_moderator" on public.parent_enfants
  for insert to authenticated
  with check (
    public.is_moderator()
    and (public.is_in_lignee(parent_id) or public.is_in_lignee(enfant_id))
  );

create policy "parent_enfants_update_admin" on public.parent_enfants
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "parent_enfants_update_moderator" on public.parent_enfants
  for update to authenticated
  using (
    public.is_moderator()
    and (public.is_in_lignee(parent_id) or public.is_in_lignee(enfant_id))
  )
  with check (
    public.is_moderator()
    and (public.is_in_lignee(parent_id) or public.is_in_lignee(enfant_id))
  );

create policy "parent_enfants_delete_admin" on public.parent_enfants
  for delete to authenticated
  using (public.is_admin());

create policy "parent_enfants_delete_moderator" on public.parent_enfants
  for delete to authenticated
  using (
    public.is_moderator()
    and (public.is_in_lignee(parent_id) or public.is_in_lignee(enfant_id))
  );

-- ---------------------------------------------------------------------------
-- mariage_enfants
-- ---------------------------------------------------------------------------

create policy "mariage_enfants_select" on public.mariage_enfants
  for select to authenticated using (true);

create policy "mariage_enfants_insert_admin" on public.mariage_enfants
  for insert to authenticated
  with check (public.is_admin());

create policy "mariage_enfants_insert_moderator" on public.mariage_enfants
  for insert to authenticated
  with check (public.is_moderator() and public.is_in_lignee(enfant_id));

create policy "mariage_enfants_delete_admin" on public.mariage_enfants
  for delete to authenticated
  using (public.is_admin());

create policy "mariage_enfants_delete_moderator" on public.mariage_enfants
  for delete to authenticated
  using (public.is_moderator() and public.is_in_lignee(enfant_id));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- Lecture : chacun lit son propre profil ; l'admin lit tout.
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Mise à jour : soi-même ou admin. La protection des colonnes sensibles
-- (role, personne_id) est assurée par le trigger `profiles_guard_role`.
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Pas d'INSERT direct (géré par le trigger handle_new_user).
-- Pas de DELETE direct (géré par la suppression du compte auth via ON DELETE CASCADE).

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------

-- Lecture : admin uniquement.
create policy "audit_logs_select_admin" on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-- Pas d'INSERT direct (journal alimenté par un trigger SECURITY DEFINER, à venir).
-- Pas d'UPDATE / DELETE (journal en append-only).

-- ---------------------------------------------------------------------------
-- Droits explicites (défense en profondeur)
-- ---------------------------------------------------------------------------

-- L'application requiert une connexion : anon ne doit rien voir.
revoke all on table public.personnes,
  public.mariages,
  public.parent_enfants,
  public.mariage_enfants,
  public.profiles,
  public.audit_logs from anon;

-- authenticated : lecture de l'arbre + écritures encadrées par RLS.
grant select, insert, update, delete
  on table public.personnes,
       public.mariages,
       public.parent_enfants,
       public.mariage_enfants to authenticated;

grant select, update on table public.profiles to authenticated;
grant select on table public.audit_logs to authenticated;
