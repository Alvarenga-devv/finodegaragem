# Fino de Garagem — Arquitetura de Backend (produção)

Este diretório **não contém um servidor rodando** — ele documenta a arquitetura que substitui a camada de dados simulada (`/js/data.js`, localStorage) quando o projeto for para produção. O front-end foi escrito para que essa troca não exija reescrever as páginas, apenas o conteúdo de `js/data.js`, `js/auth.js` e `js/payments.js`.

## Visão geral

- **Autenticação e banco de dados:** [Supabase](https://supabase.com) (PostgreSQL + Auth + Row Level Security + Storage).
- **Pagamentos:** gateway externo (ex.: Mercado Pago) via Checkout Pro/Transparente + webhooks.
- **Notificações:** arquitetura pronta para WhatsApp (ex.: API oficial do WhatsApp Business ou provedor como Twilio/Z-API), e-mail (ex.: Resend/SendGrid) e push.

## Por que Supabase

- Autenticação com e-mail/senha pronta (hash seguro no servidor), com espaço para evoluir para OTP por telefone.
- PostgreSQL real com Row Level Security (RLS) — a autorização por papel (admin/barber/client) é garantida no banco, não apenas no front-end.
- Client JS oficial (`@supabase/supabase-js`) com API muito próxima da assinatura usada em `js/data.js` (ex.: `supabase.from('appointments').select(...)`).

## Esquema de dados

Ver [`schema.sql`](./schema.sql). Tabelas principais:

`users → clients / professionals → appointments → service, payment, commission`

Todas as entidades descritas no briefing têm tabela equivalente: `users`, `clients`, `professionals`, `services`, `appointments`, `availability`, `blocked_times`, `business_hours`, `payments`, `commissions`, `employee_payments`, `notifications`, `settings`.

## Migrando a camada de dados

Cada função pública de `window.FDG.db` (em `js/data.js`) tem uma assinatura estável (ex.: `getAvailableSlots`, `createAppointment`, `getRevenueSummary`). Para produção:

1. Trocar o corpo de cada função por uma chamada ao Supabase (`supabase.from(...)`) mantendo a mesma assinatura e retorno.
2. Mover a lógica de **validação de conflito de horário** (`validateAppointment`) para uma função de banco (`supabase.rpc`) ou mantê-la no front-end *e* reforçá-la no banco via a constraint `no_overlap` (já incluída em `schema.sql`) — nunca confiar só no front-end.
3. Trocar `js/auth.js` por `supabase.auth.signInWithPassword`, `supabase.auth.signUp`, etc. O hashing de senha deixa de ser responsabilidade do front-end.

## Pagamentos (Pix / Cartão)

**Nenhuma integração real está conectada neste protótipo.** A tela `pages/pagamento.html` e o módulo `js/payments.js` estão estruturados com os pontos exatos de integração marcados como `TODO_GATEWAY`:

1. O front-end chama um endpoint do seu backend (ex.: `POST /api/payments/pix`), nunca a API do gateway diretamente (a chave secreta nunca pode estar no navegador).
2. O backend (Supabase Edge Function ou servidor próprio) cria a cobrança no gateway (Mercado Pago, por exemplo) usando a **chave secreta** armazenada em variável de ambiente no servidor.
3. O gateway retorna QR Code, código copia-e-cola e um `payment_id`. O backend grava isso na tabela `payments` e devolve ao front apenas os dados não sensíveis necessários para exibir a tela.
4. O gateway notifica o backend via **webhook** quando o pagamento é aprovado. O backend atualiza `payments.status` e `appointments.payment_status`. O front-end nunca marca um pagamento como "pago" por conta própria.

## Variáveis de ambiente

Ver [`/.env.example`](../.env.example) na raiz do projeto. Nunca commitar `.env` com valores reais; `service_role` e chaves secretas de gateway **nunca** podem ir para o front-end — apenas para funções server-side (Edge Functions, servidor Node, etc.).

## Notificações

Tabela `notifications` já guarda `channel` (`in_app`, `whatsapp`, `email`, `push`). Para WhatsApp: usar a API oficial do WhatsApp Business ou um provedor (Twilio, Z-API) disparado por uma função server-side quando um agendamento é criado/cancelado/reagendado ou um pagamento é confirmado.
