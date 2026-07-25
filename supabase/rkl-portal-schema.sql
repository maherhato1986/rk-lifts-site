create extension if not exists pgcrypto;
create type public.portal_role as enum ('client','client_approver','technician','supervisor','admin');
create type public.workflow_status as enum ('draft','submitted','under_review','approved','rejected','changes_requested','closed');
create type public.asset_kind as enum ('elevator','escalator','moving_walk');
create type public.document_kind as enum ('drawing','design','quotation','technical_report','maintenance_report','purchase_order','contract','invoice','other');

create table public.organizations(
 id uuid primary key default gen_random_uuid(), name text not null, cr_number text, vat_number text,
 status text not null default 'active' check(status in('pending','active','suspended')), created_at timestamptz not null default now()
);
create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade, organization_id uuid references public.organizations(id),
 full_name text not null, email text not null unique, phone text not null unique, role public.portal_role not null default 'client',
 email_verified_at timestamptz, phone_verified_at timestamptz, active boolean not null default true, created_at timestamptz not null default now()
);
create table public.projects(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 name text not null, city text, address text, status text not null default 'active', created_at timestamptz not null default now()
);
create table public.buildings(
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 name text not null, code text, created_at timestamptz not null default now()
);
create table public.assets(
 id uuid primary key default gen_random_uuid(), building_id uuid not null references public.buildings(id) on delete cascade,
 kind public.asset_kind not null default 'elevator', asset_code text not null unique, serial_number text, manufacturer text, model text,
 stops integer, capacity_kg integer, speed_mps numeric(5,2), status text not null default 'active',
 qr_token uuid not null default gen_random_uuid() unique, created_at timestamptz not null default now()
);
create table public.service_requests(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 project_id uuid references public.projects(id), asset_id uuid references public.assets(id), created_by uuid not null references public.profiles(id),
 assigned_to uuid references public.profiles(id), kind text not null, reference text not null unique, city text, project_name text not null,
 units integer, description text not null, priority text not null default 'normal' check(priority in('normal','high','emergency')),
 status public.workflow_status not null default 'submitted', response_due_at timestamptz, closed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.documents(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 project_id uuid references public.projects(id), asset_id uuid references public.assets(id), request_id uuid references public.service_requests(id),
 uploaded_by uuid not null references public.profiles(id), kind public.document_kind not null default 'other', title text not null,
 storage_path text not null unique, mime_type text, size_bytes bigint check(size_bytes>=0), version integer not null default 1,
 status public.workflow_status not null default 'submitted', approved_by uuid references public.profiles(id), approved_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.document_actions(
 id uuid primary key default gen_random_uuid(), document_id uuid not null references public.documents(id) on delete cascade,
 actor_id uuid not null references public.profiles(id), action text not null, note text, ip_hash text, created_at timestamptz not null default now()
);
create table public.notifications(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null, body text not null, channel text not null check(channel in('portal','email','sms')),
 read_at timestamptz, sent_at timestamptz, created_at timestamptz not null default now()
);
create table public.audit_log(
 id bigint generated always as identity primary key, organization_id uuid references public.organizations(id),
 actor_id uuid references public.profiles(id), action text not null, entity_type text not null, entity_id text,
 metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.pending_registrations(
 id uuid primary key default gen_random_uuid(), full_name text not null, company_name text not null, email text not null, phone text not null,
 email_code_hash text not null, phone_code_hash text not null, attempts integer not null default 0,
 expires_at timestamptz not null, created_at timestamptz not null default now()
);

create index on public.profiles(organization_id);
create index on public.projects(organization_id);
create index on public.service_requests(organization_id,created_at desc);
create index on public.documents(organization_id,created_at desc);
create index on public.notifications(user_id,created_at desc);

create or replace function public.current_org_id() returns uuid language sql stable security definer set search_path=public
as $$select organization_id from public.profiles where id=auth.uid()$$;
create or replace function public.current_portal_role() returns public.portal_role language sql stable security definer set search_path=public
as $$select role from public.profiles where id=auth.uid()$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.buildings enable row level security;
alter table public.assets enable row level security;
alter table public.service_requests enable row level security;
alter table public.documents enable row level security;
alter table public.document_actions enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;
alter table public.pending_registrations enable row level security;

create policy "org read" on public.organizations for select using(id=public.current_org_id() or public.current_portal_role() in('admin','supervisor'));
create policy "profile org read" on public.profiles for select using(organization_id=public.current_org_id() or public.current_portal_role() in('admin','supervisor'));
create policy "profile self update" on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy "project org read" on public.projects for select using(organization_id=public.current_org_id() or public.current_portal_role() in('admin','supervisor','technician'));
create policy "request org read" on public.service_requests for select using(organization_id=public.current_org_id() or public.current_portal_role() in('admin','supervisor','technician'));
create policy "request org insert" on public.service_requests for insert with check(organization_id=public.current_org_id() and created_by=auth.uid());
create policy "document org read" on public.documents for select using(organization_id=public.current_org_id() or public.current_portal_role() in('admin','supervisor','technician'));
create policy "document org insert" on public.documents for insert with check(organization_id=public.current_org_id() and uploaded_by=auth.uid());
create policy "notification self read" on public.notifications for select using(user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit) values('client-files','client-files',false,52428800) on conflict(id) do nothing;
create policy "private org files read" on storage.objects for select
using(bucket_id='client-files' and(storage.foldername(name))[1]=public.current_org_id()::text);
create policy "private org files upload" on storage.objects for insert
with check(bucket_id='client-files' and(storage.foldername(name))[1]=public.current_org_id()::text);
