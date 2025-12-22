# CRM SaaS B2B - Fullstack

Este é um sistema de CRM (Customer Relationship Management) Multi-tenant desenvolvido como um SaaS (Software as a Service). O sistema permite que empresas gerenciem seus Leads, Contatos, Funis de Venda e Tarefas em uma interface moderna e responsiva.

Inclui funcionalidades avançadas como painel de Super Admin, planos de assinatura, importação via CSV e visualização Kanban.

## 🚀 Funcionalidades

### 🏢 Core & Multi-tenancy
* **Multi-tenant:** Arquitetura onde cada empresa (Tenant) tem seus dados isolados.
* **Autenticação:** Login seguro com JWT e proteção de rotas.
* **Gestão de Equipe:** Convite de novos usuários e níveis de permissão (Owner, Admin, Agent).

### 🤝 Gestão Comercial
* **Leads:** Captura e qualificação de pré-vendas com importação em massa (CSV).
* **Conversão:** Botão de conversão automática de Lead para Cliente/Empresa.
* **Contatos & Empresas:** Visão 360º com histórico de negócios e tarefas vinculadas.
* **Funil de Vendas (Pipeline):** Visualização Kanban com Drag & Drop para mover negócios entre etapas.

### 📅 Produtividade
* **Agenda Inteligente:** Gestão de tarefas com visualização em **Lista** e **Quadro (Kanban)**.
* **Lembretes:** Status de tarefas (A fazer, Em andamento, Concluído).

### 📊 Gestão & Analytics
* **Dashboard:** Visão geral com KPIs em tempo real.
* **Relatórios:** Gráficos de vendas por período, ranking de vendedores e taxa de conversão.
* **Configurações:** Personalização de Branding (Logo, Cores) por empresa.

### 🛡️ Super Admin (Backoffice)
* **Gestão de Tenants:** Visualizar, bloquear ou ativar empresas clientes.
* **Gestão de Planos:** Criar e editar planos de assinatura (Free, Pro, Enterprise).

### 🔌 Integrações
* **Chatwoot:** Configuração de URL e Token para abrir chats diretamente do CRM.
* **Webhooks:** Endpoint pronto para receber dados externos (ex: criação automática de contatos via Chatwoot).

---

## 🛠️ Tecnologias Utilizadas

### Backend (API)
* **Node.js** com **Fastify** (Alta performance).
* **TypeScript**: Tipagem estática e segurança.
* **PostgreSQL**: Banco de dados relacional (hospedado no NeonDB).
* **Zod**: Validação de esquemas de dados.
* **JWT**: Autenticação stateless.

### Frontend (App)
* **Next.js 16**: Framework React com App Router.
* **TypeScript**: Desenvolvimento robusto.
* **CSS Modules**: Estilização modular e organizada.
* **Recharts**: Gráficos de alta qualidade.
* **Hello Pangea DnD**: Funcionalidades de Drag & Drop (Kanban).
* **React Hook Form**: Gerenciamento de formulários performático.
* **Lucide React**: Ícones modernos.

### Infraestrutura
* **Docker & Docker Compose**: Orquestração de containers para ambiente de desenvolvimento.

---

## ⚙️ Pré-requisitos

* Docker e Docker Compose instalados.
* Uma conta no [NeonDB](https://neon.tech) (ou um banco Postgres local).

---

## 🚀 Como Rodar o Projeto

### 1. Clonar o repositório
```bash
git clone [https://github.com/SEU_USUARIO/NOME_DO_REPO.git](https://github.com/SEU_USUARIO/NOME_DO_REPO.git)
cd NOME_DO_REPO

2. Configurar Variáveis de Ambiente
Crie um arquivo .env na raiz do projeto (ou dentro das pastas backend e frontend conforme sua estrutura docker-compose) com as seguintes chaves.

Exemplo de .env (Raiz):

Snippet de código

# Backend
PORT=3000
DATABASE_URL="postgres://user:password@endpoint.neon.tech/neondb?sslmode=require"
JWT_SECRET="sua_chave_secreta_super_segura"
FRONTEND_URL="http://localhost:3001"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3000"

3. Subir os Containers
Execute o comando na raiz do projeto:

Bash

docker-compose up --build
O sistema estará acessível em:

Frontend: http://localhost:3001

Backend: http://localhost:3000

💾 Configuração do Banco de Dados
Ao rodar pela primeira vez, você precisará criar as tabelas no seu banco PostgreSQL. Utilize os scripts SQL fornecidos durante o desenvolvimento para criar as tabelas:

tenants

users

contacts, companies, leads

pipelines, stages, deals

tasks

plans (Super Admin)

Criar o Primeiro Super Admin
Para acessar o painel administrativo, registre um usuário normalmente pelo sistema ou API pública, e depois execute este SQL no banco:

SQL

UPDATE users SET is_super_admin = true WHERE email = 'seu@email.com';
📂 Estrutura de Pastas
.
├── backend/             # API Fastify
│   ├── src/
│   │   ├── db/          # Conexão com Banco
│   │   ├── middleware/  # Auth e Permissões
│   │   ├── routes/      # Rotas da API
│   │   └── server.ts    # Entry point
│   └── ...
├── frontend/            # Next.js App
│   ├── src/
│   │   ├── app/         # Páginas (App Router)
│   │   │   ├── dashboard/
│   │   │   └── ...
│   │   ├── services/    # Configuração Axios
│   │   └── ...
│   └── ...
└── docker-compose.yml
📄 Licença
Este projeto é proprietário. Todos os direitos reservados.