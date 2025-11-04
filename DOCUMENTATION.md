# 📋 Documentação Completa do Sistema de Agendamento

## 🎯 Visão Geral do Projeto

Sistema completo de gestão para profissionais autônomos da área de beleza e bem-estar (cabeleireiros, manicures, esteticistas, etc.). Oferece controle total de agendamentos, clientes, finanças e comunicação com clientes via WhatsApp.

### Proposta de Valor
- **Gestão Centralizada**: Todos os aspectos do negócio em um único lugar
- **Automação de Comunicação**: Lembretes e confirmações automáticas via WhatsApp
- **Controle Financeiro**: Gestão completa de receitas e despesas
- **Agendamento Público**: Link personalizado para clientes agendarem online
- **Multi-plataforma**: Funciona em desktop e mobile

---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológico
- **Frontend**: React 18.3.1 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Shadcn/ui
- **Backend**: Supabase (Lovable Cloud)
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Edge Functions**: Supabase Functions
- **Payment**: Stripe Integration
- **State Management**: React Query (@tanstack/react-query)
- **Forms**: React Hook Form + Zod
- **Routing**: React Router DOM

---

## 📁 Estrutura de Pastas

```
├── public/
│   ├── robots.txt              # SEO - Instruções para bots
│   └── favicon.ico             # Ícone do site
│
├── src/
│   ├── components/             # Componentes React reutilizáveis
│   │   ├── ui/                 # Componentes Shadcn/ui
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── table.tsx
│   │   │   └── ... (outros componentes UI)
│   │   │
│   │   ├── AppointmentDialog.tsx      # Dialog para criar/editar agendamentos
│   │   ├── BlockSlotDialog.tsx        # Dialog para bloquear horários
│   │   ├── BottomNav.tsx              # Navegação inferior (mobile)
│   │   ├── ClientDialog.tsx           # Dialog para criar/editar clientes
│   │   ├── ClientHistoryDialog.tsx    # Histórico de atendimentos do cliente
│   │   ├── CompletionDialog.tsx       # Dialog para finalizar atendimento
│   │   ├── DayScheduleView.tsx        # Visualização diária da agenda
│   │   ├── ErrorBoundary.tsx          # Tratamento de erros React
│   │   ├── ExpenseDialog.tsx          # Dialog para adicionar despesas
│   │   ├── MonthScheduleView.tsx      # Visualização mensal da agenda
│   │   ├── ProtectedRoute.tsx         # Proteção de rotas autenticadas
│   │   ├── ServiceDialog.tsx          # Dialog para criar/editar serviços
│   │   ├── SubscriptionRoute.tsx      # Proteção de rotas com assinatura
│   │   ├── TopNav.tsx                 # Navegação superior
│   │   └── WeekScheduleView.tsx       # Visualização semanal da agenda
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx            # Contexto de autenticação
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx             # Hook para detectar mobile
│   │   ├── use-toast.ts               # Hook para toast notifications
│   │   └── useSubscription.tsx        # Hook para verificar assinatura
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts              # Cliente Supabase (auto-gerado)
│   │       └── types.ts               # Tipos TypeScript do DB (auto-gerado)
│   │
│   ├── lib/
│   │   ├── utils.ts                   # Funções utilitárias
│   │   └── whatsappUtils.ts           # Funções para WhatsApp
│   │
│   ├── pages/
│   │   ├── Index.tsx                  # Página inicial (Agenda)
│   │   ├── Home.tsx                   # Dashboard principal
│   │   ├── Auth.tsx                   # Login/Cadastro
│   │   ├── Clientes.tsx               # Gestão de clientes
│   │   ├── Servicos.tsx               # Gestão de serviços
│   │   ├── Financeiro.tsx             # Gestão financeira
│   │   ├── Configuracoes.tsx          # Configurações gerais
│   │   ├── Perfil.tsx                 # Perfil do usuário
│   │   ├── HorarioExpediente.tsx      # Configuração de horários de trabalho
│   │   ├── HorariosAgendamento.tsx    # Horários disponíveis para agendamento
│   │   ├── ModelosMensagem.tsx        # Templates de mensagens WhatsApp
│   │   ├── Notificacoes.tsx           # Central de notificações
│   │   ├── AgendamentoPublico.tsx     # Página pública de agendamento
│   │   ├── Assinatura.tsx             # Gestão de assinatura
│   │   └── NotFound.tsx               # Página 404
│   │
│   ├── App.tsx                        # Componente principal
│   ├── App.css                        # Estilos globais do App
│   ├── index.css                      # Estilos globais + Design System
│   ├── main.tsx                       # Entry point
│   └── vite-env.d.ts                  # Tipos Vite
│
├── supabase/
│   ├── config.toml                    # Configuração Supabase (auto-gerado)
│   ├── migrations/                    # Migrações SQL
│   └── functions/                     # Edge Functions
│       ├── check-subscription/        # Verificação de assinatura
│       ├── create-checkout/           # Criar checkout Stripe
│       ├── customer-portal/           # Portal do cliente Stripe
│       ├── export-user-data/          # Exportar dados do usuário
│       ├── notification-scheduler/    # Agendador de notificações
│       └── stripe-webhook/            # Webhook Stripe
│
├── .env                               # Variáveis de ambiente (auto-gerado)
├── index.html                         # HTML principal
├── tailwind.config.ts                 # Configuração Tailwind + Design System
├── vite.config.ts                     # Configuração Vite
└── tsconfig.json                      # Configuração TypeScript
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### 1. **profiles**
Perfil do usuário profissional
```sql
- id (UUID, PK) - Referência ao auth.users
- full_name (TEXT) - Nome completo
- professional_name (TEXT) - Nome profissional
- phone (TEXT) - Telefone
- location (TEXT) - Endereço/localização
- pix_key (TEXT) - Chave PIX
- booking_enabled (BOOLEAN) - Agendamento público ativo
- booking_slug (TEXT, UNIQUE) - URL personalizada
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**RLS Policies:**
- ✅ Usuários podem ver/editar apenas seu próprio perfil

---

#### 2. **clients**
Clientes do profissional
```sql
- id (UUID, PK)
- user_id (UUID, FK) - Profissional dono do cliente
- name (TEXT) - Nome do cliente
- phone (TEXT) - Telefone
- email (TEXT) - Email
- birth_date (DATE) - Data de nascimento
- notes (TEXT) - Observações
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- deleted_at (TIMESTAMP) - Soft delete
```

**RLS Policies:**
- ✅ Usuários veem apenas seus próprios clientes
- ✅ Soft delete implementado

---

#### 3. **services**
Serviços oferecidos pelo profissional
```sql
- id (UUID, PK)
- user_id (UUID, FK) - Profissional dono do serviço
- name (TEXT) - Nome do serviço
- duration_minutes (INTEGER) - Duração em minutos
- price_mode (TEXT) - 'fixed' ou 'variable'
- suggested_price (NUMERIC) - Preço sugerido
- include_salon_percentage (BOOLEAN) - Incluir porcentagem do salão
- salon_percentage (NUMERIC) - Porcentagem do salão
- is_active (BOOLEAN) - Serviço ativo
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- deleted_at (TIMESTAMP) - Soft delete
```

**RLS Policies:**
- ✅ Usuários veem apenas seus próprios serviços
- ✅ Soft delete implementado

---

#### 4. **appointments**
Agendamentos realizados
```sql
- id (UUID, PK)
- user_id (UUID, FK) - Profissional
- client_id (UUID, FK) - Cliente
- service_id (UUID, FK) - Serviço
- appointment_date (DATE) - Data do agendamento
- appointment_time (TIME) - Horário
- status (TEXT) - 'scheduled', 'confirmed', 'completed', 'cancelled'
- price (NUMERIC) - Preço cobrado
- include_salon_percentage (BOOLEAN)
- salon_percentage (NUMERIC)
- payment_status (TEXT) - 'pending', 'paid'
- payment_method (TEXT) - 'Dinheiro', 'Cartão', 'PIX'
- notes (TEXT) - Observações
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- deleted_at (TIMESTAMP) - Soft delete
```

**Índices:**
- idx_appointments_payment_status (payment_status, user_id)

**RLS Policies:**
- ✅ Usuários veem apenas seus próprios agendamentos
- ✅ Soft delete implementado

---

#### 5. **blocked_slots**
Horários bloqueados na agenda
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- blocked_date (DATE)
- blocked_time (TIME) - NULL se dia inteiro
- is_full_day (BOOLEAN)
- reason (TEXT) - Motivo do bloqueio
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- deleted_at (TIMESTAMP)
```

**RLS Policies:**
- ✅ Usuários veem apenas seus próprios bloqueios

---

#### 6. **expenses**
Despesas do profissional
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- description (TEXT) - Descrição da despesa
- amount (NUMERIC) - Valor
- payment_date (DATE) - Data do pagamento
- is_fixed (BOOLEAN) - Despesa fixa recorrente
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- deleted_at (TIMESTAMP)
```

**RLS Policies:**
- ✅ Usuários veem apenas suas próprias despesas

---

#### 7. **working_hours**
Horário de expediente do profissional
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- day_of_week (INTEGER) - 0-6 (Domingo-Sábado)
- start_time (TIME) - Hora inicial
- end_time (TIME) - Hora final
- is_active (BOOLEAN) - Dia ativo
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**RLS Policies:**
- ✅ Usuários veem apenas seus próprios horários
- ✅ Público pode ver horários ativos (para agendamento)

---

#### 8. **booking_time_slots**
Horários específicos disponíveis para agendamento público
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- time_slot (TIME) - Horário
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**RLS Policies:**
- ✅ Usuários gerenciam seus próprios horários
- ✅ Público pode ver horários ativos

---

#### 9. **message_templates**
Templates de mensagens WhatsApp
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- template_type (TEXT) - 'confirmation', 'reminder', 'custom'
- message (TEXT) - Conteúdo da mensagem
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**Variáveis disponíveis:**
- {cliente} - Nome do cliente
- {servico} - Nome do serviço
- {data} - Data do agendamento
- {horario} - Horário do agendamento
- {profissional} - Nome do profissional

**RLS Policies:**
- ✅ Usuários veem apenas seus próprios templates

---

#### 10. **notifications**
Notificações do sistema
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- title (TEXT) - Título da notificação
- message (TEXT) - Mensagem
- is_read (BOOLEAN) - Lida ou não
- created_at (TIMESTAMP)
```

**RLS Policies:**
- ✅ Usuários veem apenas suas próprias notificações
- ❌ Usuários não podem criar/deletar (somente sistema)

---

#### 11. **audit_logs**
Log de auditoria de ações
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- table_name (TEXT) - Tabela afetada
- record_id (UUID) - ID do registro
- action (TEXT) - 'INSERT', 'UPDATE', 'DELETE'
- old_data (JSONB) - Dados antigos
- new_data (JSONB) - Dados novos
- created_at (TIMESTAMP)
```

**RLS Policies:**
- ✅ Usuários veem apenas seus próprios logs
- ❌ Somente leitura

---

### Tabelas de Assinatura (Stripe Integration)

#### 12. **subscription_plans**
Planos de assinatura disponíveis
```sql
- id (UUID, PK)
- name (TEXT) - Nome do plano
- description (TEXT)
- price_monthly (NUMERIC) - Preço mensal
- price_yearly (NUMERIC) - Preço anual
- currency (TEXT) - Moeda (BRL)
- stripe_product_id (TEXT)
- stripe_price_id (TEXT)
- max_appointments_per_month (INTEGER) - Limite de agendamentos
- max_clients (INTEGER) - Limite de clientes
- max_services (INTEGER) - Limite de serviços
- features (JSONB) - Array de features
- is_active (BOOLEAN)
- is_featured (BOOLEAN) - Plano em destaque
- sort_order (INTEGER) - Ordem de exibição
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**RLS Policies:**
- ✅ Todos podem ver planos ativos
- ❌ Apenas admins podem modificar

---

#### 13. **user_subscriptions**
Assinaturas dos usuários
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- plan_id (UUID, FK) - Plano atual
- status (ENUM) - 'trialing', 'active', 'past_due', 'canceled', 'incomplete'
- stripe_customer_id (TEXT)
- stripe_subscription_id (TEXT)
- stripe_payment_method_id (TEXT)
- trial_ends_at (TIMESTAMP) - Fim do trial (14 dias)
- current_period_start (TIMESTAMP)
- current_period_end (TIMESTAMP)
- canceled_at (TIMESTAMP)
- is_early_adopter (BOOLEAN) - Primeiros 50 usuários
- appointments_used_this_month (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**RLS Policies:**
- ✅ Usuários veem apenas sua própria assinatura
- ✅ Usuários podem atualizar (para cancelamento)

---

#### 14. **billing_events**
Eventos de cobrança Stripe
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- stripe_event_id (TEXT)
- event_type (TEXT) - Tipo de evento Stripe
- payload (JSONB) - Dados do evento
- processed_at (TIMESTAMP)
- error (TEXT) - Erro se houver
- created_at (TIMESTAMP)
```

**RLS Policies:**
- ✅ Usuários veem apenas seus eventos
- ❌ Somente leitura

---

#### 15. **app_errors**
Erros da aplicação (monitoramento)
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- error_message (TEXT)
- error_stack (TEXT)
- page_url (TEXT)
- user_agent (TEXT)
- metadata (JSONB)
- created_at (TIMESTAMP)
```

**RLS Policies:**
- ✅ Usuários veem apenas seus erros
- ✅ Qualquer um pode inserir (para logging)

---

## 🔐 Funções do Banco de Dados

### 1. `check_subscription_limit()`
Verifica se usuário atingiu limite de recursos do plano
```sql
Parâmetros: _user_id, _limit_type ('appointments', 'clients', 'services')
Retorno: BOOLEAN
```

### 2. `get_subscription_status()`
Retorna status completo da assinatura do usuário
```sql
Parâmetro: _user_id
Retorno: TABLE (has_active_subscription, plan_name, status, limites, uso)
```

### 3. `soft_delete_record()`
Trigger para implementar soft delete
```sql
Tabelas: appointments, clients, services, expenses, blocked_slots
```

### 4. `update_updated_at_column()`
Trigger para atualizar updated_at automaticamente

### 5. `create_trial_subscription()`
Trigger para criar assinatura trial de 14 dias ao cadastrar

### 6. `mark_early_adopter()`
Trigger para marcar primeiros 50 usuários como early adopters

### 7. `handle_new_user()`
Trigger para criar perfil ao criar novo usuário

---

## ⚡ Edge Functions

### 1. **check-subscription**
Valida status da assinatura do usuário
- Endpoint: `/functions/v1/check-subscription`
- Método: POST
- Payload: `{ userId }`

### 2. **create-checkout**
Cria sessão de checkout Stripe
- Endpoint: `/functions/v1/create-checkout`
- Método: POST
- Payload: `{ priceId, userId }`

### 3. **customer-portal**
Cria link para portal do cliente Stripe
- Endpoint: `/functions/v1/customer-portal`
- Método: POST
- Payload: `{ customerId }`

### 4. **export-user-data**
Exporta todos os dados do usuário (LGPD)
- Endpoint: `/functions/v1/export-user-data`
- Método: POST
- Payload: `{ userId }`

### 5. **notification-scheduler**
Agenda e envia notificações automáticas
- Endpoint: Cron job automático
- Notificações:
  - Lembrete 24h antes do agendamento
  - Fim do período trial
  - Pagamentos pendentes

### 6. **stripe-webhook**
Processa webhooks do Stripe
- Endpoint: `/functions/v1/stripe-webhook`
- Eventos:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

---

## 🎨 Design System

### Tokens de Cor (HSL)
Definidos em `src/index.css` e `tailwind.config.ts`:

```css
/* Cores Base */
--background: 0 0% 100%
--foreground: 222.2 84% 4.9%
--primary: 221.2 83.2% 53.3%
--secondary: 210 40% 96.1%
--accent: 210 40% 96.1%
--destructive: 0 84.2% 60.2%
--muted: 210 40% 96.1%
--card: 0 0% 100%
--border: 214.3 31.8% 91.4%
--input: 214.3 31.8% 91.4%

/* Dark Mode */
.dark {
  --background: 222.2 84% 4.9%
  --foreground: 210 40% 98%
  /* ... outros tokens dark */
}
```

### Componentes UI
Todos os componentes seguem o padrão Shadcn/ui com variants personalizadas.

---

## 🚀 Funcionalidades Implementadas

### ✅ Autenticação
- [x] Login com email/senha
- [x] Cadastro de novos usuários
- [x] Recuperação de senha
- [x] Auto-confirm email
- [x] Proteção de rotas

### ✅ Dashboard
- [x] Resumo do dia
- [x] Próximo atendimento destacado
- [x] Lista de agendamentos do dia
- [x] Métricas rápidas (faturamento, qtd atendimentos)
- [x] Notificações não lidas

### ✅ Agenda
- [x] Visualização diária/semanal/mensal
- [x] Criar novo agendamento
- [x] Editar agendamento existente
- [x] Cancelar agendamento
- [x] Marcar como concluído
- [x] Remarcar agendamento
- [x] Bloquear horários específicos
- [x] Bloquear dia inteiro
- [x] Filtros e busca

### ✅ Clientes
- [x] Lista de clientes
- [x] Adicionar novo cliente
- [x] Editar dados do cliente
- [x] Excluir cliente (soft delete)
- [x] Buscar clientes
- [x] Ver histórico de atendimentos
- [x] Armazenar: nome, telefone, email, aniversário, observações

### ✅ Serviços
- [x] Lista de serviços
- [x] Adicionar novo serviço
- [x] Editar serviço
- [x] Excluir serviço (soft delete)
- [x] Ativar/desativar serviço
- [x] Preço fixo ou variável
- [x] Duração do serviço
- [x] Porcentagem do salão

### ✅ Financeiro
- [x] Resumo mensal de faturamento
- [x] Gráfico de faturamento
- [x] Lista de receitas (agendamentos pagos)
- [x] Adicionar despesas
- [x] Editar despesas
- [x] Excluir despesas
- [x] Despesas fixas recorrentes
- [x] Pagamentos pendentes
- [x] Marcar como pago
- [x] Cálculo de lucro líquido

### ✅ Comunicação WhatsApp
- [x] Confirmar horário via WhatsApp
- [x] Enviar lembrete via WhatsApp
- [x] Templates de mensagens personalizáveis
- [x] Variáveis dinâmicas (nome, data, horário)
- [x] Preview da mensagem antes de enviar

### ✅ Agendamento Público
- [x] Link personalizado (slug)
- [x] Página pública de agendamento
- [x] Seleção de serviço
- [x] Seleção de data/horário disponível
- [x] Formulário de dados do cliente
- [x] Confirmação por WhatsApp
- [x] Verificação de horários disponíveis
- [x] Respeito ao horário de expediente

### ✅ Configurações
- [x] Perfil do profissional
- [x] Nome profissional
- [x] Telefone e localização
- [x] Chave PIX
- [x] Slug personalizado
- [x] Ativar/desativar agendamento público
- [x] Horário de expediente (por dia da semana)
- [x] Horários específicos para agendamento
- [x] Templates de mensagens WhatsApp

### ✅ Assinatura
- [x] Planos de assinatura
- [x] Trial de 14 dias
- [x] Integração com Stripe
- [x] Checkout seguro
- [x] Portal do cliente (cancelar, atualizar)
- [x] Limites por plano (agendamentos, clientes, serviços)
- [x] Verificação de limites
- [x] Early adopter (primeiros 50 usuários)
- [x] Status da assinatura

### ✅ Notificações
- [x] Central de notificações
- [x] Marcar como lida
- [x] Notificações automáticas (sistema)

### ✅ Segurança
- [x] Row-Level Security (RLS) em todas as tabelas
- [x] Soft delete para preservar histórico
- [x] Audit logs
- [x] Error tracking
- [x] LGPD - Exportação de dados

---

## 🎯 Roadmap - Funcionalidades Futuras

### 📱 Mobile App
- [ ] App nativo iOS/Android (React Native)
- [ ] Push notifications
- [ ] Widget de próximo atendimento
- [ ] Modo offline com sincronização

### 🤖 Automação
- [ ] Lembretes automáticos 24h antes (WhatsApp/SMS/Email)
- [ ] Confirmação automática de presença
- [ ] Reagendamento automático em caso de cancelamento
- [ ] Envio automático de pesquisa de satisfação
- [ ] Felicitações de aniversário automáticas
- [ ] Campanhas de recuperação de clientes inativos

### 📊 Analytics Avançado
- [ ] Dashboard analítico completo
- [ ] Taxa de ocupação da agenda
- [ ] Ticket médio por cliente
- [ ] Serviços mais rentáveis
- [ ] Horários de pico
- [ ] Clientes mais frequentes
- [ ] Taxa de cancelamento
- [ ] Previsão de faturamento
- [ ] Comparativo mensal/anual
- [ ] Exportar relatórios (PDF, Excel)

### 💰 Financeiro Avançado
- [ ] Fluxo de caixa
- [ ] Projeção financeira
- [ ] Múltiplas contas bancárias
- [ ] Categorização de despesas
- [ ] Despesas por centro de custo
- [ ] Impostos e DAS
- [ ] Reconciliação bancária
- [ ] Integração com contabilidade
- [ ] Nota fiscal eletrônica

### 👥 Gestão de Equipe
- [ ] Múltiplos profissionais por conta
- [ ] Agenda individual por profissional
- [ ] Comissões por profissional
- [ ] Controle de ponto
- [ ] Metas individuais e de equipe
- [ ] Chat interno
- [ ] Permissões granulares (admin, profissional, recepcionista)

### 🛍️ E-commerce
- [ ] Loja virtual de produtos
- [ ] Gestão de estoque
- [ ] Venda de produtos no agendamento
- [ ] Combos e pacotes
- [ ] Programa de fidelidade/pontos
- [ ] Cashback
- [ ] Gift cards

### 📸 Marketing
- [ ] Galeria de trabalhos (antes/depois)
- [ ] Stories e posts automáticos
- [ ] Integração com Instagram
- [ ] Integração com Facebook
- [ ] Integração com Google Meu Negócio
- [ ] Campanhas de email marketing
- [ ] SMS marketing
- [ ] Landing pages personalizadas
- [ ] Cupons de desconto
- [ ] Programa de indicação

### 🔗 Integrações
- [ ] Google Calendar
- [ ] Apple Calendar
- [ ] Outlook Calendar
- [ ] Zoom/Meet para atendimento online
- [ ] Mercado Pago
- [ ] PagSeguro
- [ ] PayPal
- [ ] Google Analytics
- [ ] Facebook Pixel
- [ ] Hotmart (para cursos)

### 🎓 Gestão de Conhecimento
- [ ] Base de conhecimento interna
- [ ] Protocolos de atendimento
- [ ] Fichas de anamnese
- [ ] Histórico de procedimentos detalhado
- [ ] Fotos antes/depois por cliente
- [ ] Alergias e restrições
- [ ] Produtos utilizados

### 🌐 Multi-idioma
- [ ] Inglês
- [ ] Espanhol
- [ ] Outros idiomas

### 🎨 Personalização
- [ ] Temas personalizados
- [ ] Logo personalizada
- [ ] Cores da marca
- [ ] Domínio próprio
- [ ] Email personalizado
- [ ] White label completo

### 🔔 Melhorias de Notificações
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Push notifications (PWA)
- [ ] Configurar preferências de notificação
- [ ] Agendar envio de mensagens

### 📋 Compliance
- [ ] Termo de consentimento LGPD
- [ ] Política de privacidade
- [ ] Termos de uso
- [ ] Gestão de consentimentos
- [ ] Direito ao esquecimento
- [ ] Portabilidade de dados

### 💳 Pagamentos Online
- [ ] Pagar via PIX na hora
- [ ] Pagar com cartão
- [ ] Parcelamento
- [ ] Split de pagamento (salão + profissional)
- [ ] Antecipação de recebíveis

### 📦 Funcionalidades Específicas por Segmento

#### Para Salões de Beleza
- [ ] Gestão de cadeiras/estações
- [ ] Aluguel de cadeiras
- [ ] Controle de produtos (shampoo, tinta, etc)
- [ ] Venda de pacotes

#### Para Barbearias
- [ ] Fila de espera
- [ ] Check-in presencial
- [ ] Programa de fidelidade (10 cortes = 1 grátis)

#### Para Estética
- [ ] Prontuário eletrônico
- [ ] Evolução de tratamentos
- [ ] Protocolos específicos
- [ ] Consentimento informado

#### Para Personal Trainer
- [ ] Fichas de treino
- [ ] Evolução de medidas
- [ ] Fotos de progresso
- [ ] Plano alimentar

### 🔧 Melhorias Técnicas
- [ ] PWA completo (offline-first)
- [ ] Service Worker para cache
- [ ] Otimização de performance
- [ ] SEO avançado
- [ ] Testes automatizados
- [ ] CI/CD
- [ ] Monitoramento (Sentry, LogRocket)
- [ ] A/B testing
- [ ] Feature flags

---

## 🔒 Segurança e Privacidade

### Medidas Implementadas
✅ Row-Level Security (RLS) em todas as tabelas
✅ Soft delete para manter histórico
✅ Audit logs para rastreabilidade
✅ Autenticação segura (Supabase Auth)
✅ HTTPS obrigatório
✅ Tokens JWT para API
✅ Error tracking sem dados sensíveis
✅ Exportação de dados (LGPD)

### Medidas Futuras
🔲 2FA (Two-Factor Authentication)
🔲 Backup automático diário
🔲 Criptografia end-to-end para mensagens
🔲 Logs de acesso
🔲 Detecção de anomalias
🔲 Rate limiting
🔲 CAPTCHA em formulários públicos

---

## 🎯 Personas e Casos de Uso

### Persona 1: Cabeleireira Autônoma
**Maria, 32 anos**
- Trabalha sozinha em um salão alugado
- 30-40 clientes fixos
- Atende 5-8 pessoas por dia
- Precisa organizar agenda e receber lembretes
- Quer automatizar confirmações

**Usa o sistema para:**
- Agendar clientes pelo WhatsApp
- Enviar lembretes automáticos
- Controlar quanto ganhou no mês
- Compartilhar link para novos clientes

---

### Persona 2: Dono de Barbearia
**João, 28 anos**
- Tem 3 barbeiros na equipe
- 100+ clientes mensais
- Quer profissionalizar o negócio
- Precisa controlar comissões

**Usa o sistema para:**
- Gerenciar agenda de múltiplos profissionais
- Calcular comissões automaticamente
- Controlar despesas do estabelecimento
- Gerar relatórios financeiros

---

### Persona 3: Esteticista
**Ana, 35 anos**
- Trabalha em casa
- Faz procedimentos longos (1-2h)
- Precisa de prontuário detalhado
- Clientes retornam mensalmente

**Usa o sistema para:**
- Agendar com espaçamento adequado
- Registrar histórico de procedimentos
- Enviar lembretes de retorno
- Controlar estoque de produtos

---

## 📱 Fluxos de Usuário

### Fluxo 1: Novo Agendamento (Profissional)
1. Login → Dashboard
2. Clica em "Nova Agenda" ou "Adicionar"
3. Seleciona cliente (ou cria novo)
4. Seleciona serviço
5. Escolhe data e horário
6. Define preço (se variável)
7. Adiciona observações (opcional)
8. Salva
9. ✅ Sistema envia confirmação por WhatsApp

---

### Fluxo 2: Agendamento Público (Cliente)
1. Cliente recebe link personalizado
2. Acessa página pública
3. Vê serviços disponíveis
4. Seleciona serviço
5. Escolhe data disponível
6. Escolhe horário disponível
7. Preenche dados (nome, telefone)
8. Confirma agendamento
9. ✅ Recebe confirmação no WhatsApp
10. ✅ Profissional recebe notificação

---

### Fluxo 3: Finalização de Atendimento
1. Atendimento é realizado
2. Horário passa
3. Sistema mostra botões "Realizado" e "Remarcar"
4. Profissional clica em "Realizado"
5. Confirma/ajusta preço
6. Seleciona forma de pagamento
7. Ou marca como "Pendente"
8. ✅ Sistema registra no financeiro

---

### Fluxo 4: Pagamento Pendente
1. Cliente não pagou
2. Aparece em "Financeiro > Pendentes"
3. Profissional cobra cliente
4. Cliente paga
5. Profissional clica "Pagou"
6. ✅ Sistema contabiliza no faturamento

---

## 🎨 Guia de Estilo e UI/UX

### Princípios de Design
1. **Simplicidade**: Interface limpa, sem poluição visual
2. **Eficiência**: Mínimo de cliques para tarefas comuns
3. **Feedback**: Sempre confirmar ações do usuário
4. **Consistência**: Mesmos padrões em todo o app
5. **Mobile-first**: Funciona perfeitamente no celular

### Componentes Principais
- **Cards**: Para agrupar informações relacionadas
- **Dialogs**: Para formulários e ações importantes
- **Tabs**: Para organizar diferentes visualizações
- **Tables**: Para listas de dados
- **Toast**: Para feedback de ações

### Responsividade
- **Mobile** (< 768px): Layout vertical, bottom nav
- **Tablet** (768px - 1024px): Layout adaptado
- **Desktop** (> 1024px): Layout completo, sidebar

---

## 🚀 Deploy e Infraestrutura

### Stack de Produção
- **Frontend**: Vercel/Netlify
- **Backend**: Supabase (Lovable Cloud)
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage
- **CDN**: Cloudflare
- **Domain**: Configurável pelo usuário

### Variáveis de Ambiente
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxx...
VITE_SUPABASE_PROJECT_ID=wrbsknjrlacdemgtqoyh
```

---

## 📝 Notas de Desenvolvimento

### Convenções
- **Commits**: Conventional Commits
- **Branches**: feature/, bugfix/, hotfix/
- **Code Style**: ESLint + Prettier
- **TypeScript**: Strict mode
- **Components**: Functional components + hooks

### Performance
- React Query para cache
- Lazy loading de rotas
- Imagens otimizadas
- Code splitting
- Memoization quando necessário

### Testes
- Unit tests: Vitest
- E2E tests: Playwright
- Coverage mínimo: 80%

---

## 📞 Suporte e Manutenção

### Bugs Conhecidos
Nenhum bug crítico conhecido no momento.

### Como Reportar Bugs
1. Descrever o problema
2. Passos para reproduzir
3. Comportamento esperado
4. Screenshots (se aplicável)
5. Informações do dispositivo/browser

---

## 📄 Licença e Créditos

**Desenvolvido com Lovable.dev**
- React + TypeScript + Vite
- Supabase (Lovable Cloud)
- Shadcn/ui
- Tailwind CSS
- React Query
- Stripe

---

**Última atualização**: Outubro 2024
**Versão**: 1.0.0
**Status**: Em produção
