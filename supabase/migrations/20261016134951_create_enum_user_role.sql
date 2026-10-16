-- Enum des rôles applicatifs (RBAC).
create type public.user_role as enum (
  'ROLE_ADMIN',
  'ROLE_MODERATEUR',
  'ROLE_USER'
);
