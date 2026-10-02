-- ============================================================================
-- FINO DE GARAGEM — Esquema de banco de dados (PostgreSQL / Supabase)
-- ============================================================================
-- Este schema reflete 1:1 as entidades simuladas em /js/data.js. Ao migrar
-- para produção, a camada de dados do front-end deve ser substituída por
-- chamadas ao Supabase Client (ou API própria) usando esta mesma estrutura.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- users: conta de autenticação + perfil. Em produção, a autenticação real
-- (e-mail/senha, OTP) é feita pelo Supabase Auth; esta tabela guarda o
-- perfil público/relacional ligado a auth.users via "id".
-- ---------------------------------------------------------------------------
create table users (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  phone text,
  role text not null check (role in ('admin', 'barber', 'client')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- clients: dados específicos de cliente (CRM)
-- ---------------------------------------------------------------------------
create table clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  notes text,
  preferred_professional_id uuid references professionals(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- professionals: dono e funcionários que atendem
-- ---------------------------------------------------------------------------
create table professionals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  display_name text not null,
  role_title text not null default 'Barbeiro',
  commission_pct numeric(5,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
create table services (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price numeric(10,2),              -- null = "Consultar"
  duration_minutes int not null,
  category text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table professional_services (
  professional_id uuid references professionals(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  primary key (professional_id, service_id)
);

-- ---------------------------------------------------------------------------
-- business_hours: horário geral da barbearia (0=domingo ... 6=sábado)
-- ---------------------------------------------------------------------------
create table business_hours (
  id uuid primary key default uuid_generate_v4(),
  weekday int not null check (weekday between 0 and 6),
  open boolean not null default true,
  start_time time,
  end_time time
);
-- Cada linha representa UM intervalo. Um dia com almoço terá 2 linhas
-- (ex.: 09:00–12:00 e 13:00–19:00) para o mesmo weekday.

-- ---------------------------------------------------------------------------
-- availability: horários individuais por profissional (opcional, sobrepõe
-- business_hours quando presente)
-- ---------------------------------------------------------------------------
create table availability (
  id uuid primary key default uuid_generate_v4(),
  professional_id uuid not null references professionals(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null
);

-- ---------------------------------------------------------------------------
-- blocked_times: bloqueios manuais, folgas, almoço pontual, dia inteiro
-- ---------------------------------------------------------------------------
create table blocked_times (
  id uuid primary key default uuid_generate_v4(),
  professional_id uuid not null references professionals(id) on delete cascade,
  date date not null,
  full_day boolean not null default false,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------
create type appointment_status as enum (
  'PENDENTE', 'CONFIRMADO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO', 'NO_SHOW'
);

create table appointments (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id),
  professional_id uuid not null references professionals(id),
  service_id uuid not null references services(id),
  date date not null,
  start_time time not null,
  end_time time not null,
  status appointment_status not null default 'PENDENTE',
  price numeric(10,2),
  payment_method text check (payment_method in ('pix', 'cartao', 'local')),
  notes text,
  created_at timestamptz not null default now(),

  -- Garante que dois agendamentos do mesmo profissional nunca se sobreponham.
  constraint no_overlap exclude using gist (
    professional_id with =,
    date with =,
    tsrange(
      (date + start_time)::timestamp,
      (date + end_time)::timestamp
    ) with &&
  ) where (status not in ('CANCELADO'))
);

-- ---------------------------------------------------------------------------
-- payments: cobranças ligadas a um agendamento (Pix, cartão, local)
-- ---------------------------------------------------------------------------
create table payments (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  amount numeric(10,2) not null,
  method text not null check (method in ('pix', 'cartao', 'local')),
  status text not null check (status in ('pendente', 'aguardando', 'pago', 'falhou', 'reembolsado')),
  gateway text,                 -- ex.: 'mercadopago'
  gateway_payment_id text,      -- id retornado pela API do gateway
  qr_code text,
  pix_copy_paste text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- commissions: snapshot opcional por atendimento (pode também ser calculado
-- dinamicamente a partir de appointments + professionals.commission_pct,
-- como faz a demo em /js/data.js::getCommissionSummary)
-- ---------------------------------------------------------------------------
create table commissions (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  professional_id uuid not null references professionals(id),
  base_amount numeric(10,2) not null,
  commission_pct numeric(5,2) not null,
  commission_amount numeric(10,2) not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- employee_payments: pagamentos de comissão feitos pelo administrador
-- ---------------------------------------------------------------------------
create table employee_payments (
  id uuid primary key default uuid_generate_v4(),
  professional_id uuid not null references professionals(id),
  period_start date not null,
  period_end date not null,
  amount_paid numeric(10,2) not null,
  method text not null,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  message text not null,
  channel text not null default 'in_app' check (channel in ('in_app', 'whatsapp', 'email', 'push')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- settings: dados editáveis da barbearia (endereço, whatsapp, avaliação)
-- ---------------------------------------------------------------------------
create table settings (
  id uuid primary key default uuid_generate_v4(),
  business_name text not null,
  street text, number text, neighborhood text, city text, state text, zip text,
  whatsapp text not null,
  rating numeric(2,1),
  reviews_count int,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — exemplos de política por papel
-- ============================================================================
alter table appointments enable row level security;
alter table clients enable row level security;
alter table commissions enable row level security;
alter table employee_payments enable row level security;

-- Cliente só vê os próprios agendamentos
create policy client_select_own_appointments on appointments
  for select using (
    client_id in (select id from clients where user_id = auth.uid())
  );

-- Barbeiro vê os agendamentos em que é o profissional
create policy barber_select_own_appointments on appointments
  for select using (
    professional_id in (select id from professionals where user_id = auth.uid())
  );

-- Admin vê tudo
create policy admin_select_all_appointments on appointments
  for select using (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

-- Comissões e pagamentos de funcionário: só admin e o próprio profissional (leitura)
create policy admin_manage_commissions on commissions
  for all using (exists (select 1 from users where id = auth.uid() and role = 'admin'));

create policy professional_read_own_commissions on commissions
  for select using (
    professional_id in (select id from professionals where user_id = auth.uid())
  );

create policy admin_manage_employee_payments on employee_payments
  for all using (exists (select 1 from users where id = auth.uid() and role = 'admin'));
