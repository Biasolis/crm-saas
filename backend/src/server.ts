import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { db } from './db/client';

// Importação das Rotas
import { tenantRoutes } from './routes/tenants';
import { userRoutes } from './routes/users';
import { authRoutes } from './routes/auth';
import { contactRoutes } from './routes/contacts';
import { pipelineRoutes } from './routes/pipelines';
import { dealRoutes } from './routes/deals';
import { productRoutes } from './routes/products';
import { companyRoutes } from './routes/companies';
import { taskRoutes } from './routes/tasks';
import { dashboardRoutes } from './routes/dashboard';
import { proposalRoutes } from './routes/proposals';
import { leadRoutes } from './routes/leads';
import { webhookRoutes } from './routes/webhooks';
import { analyticsRoutes } from './routes/analytics';
import { adminRoutes } from './routes/admin';       // <--- Super Admin
import { publicApiRoutes } from './routes/public_api'; // <--- Cadastro Automático

dotenv.config();

const server: FastifyInstance = Fastify({ logger: true });

// Configuração do CORS (Permitindo PATCH)
server.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});

server.get('/', async () => { return { message: 'CRM SaaS API Running 🚀' }; });

server.get('/health', async (request, reply) => {
  try {
    const result = await db.query('SELECT NOW() as now');
    return { status: 'ok', time: result.rows[0].now };
  } catch (error) {
    return reply.status(500).send({ status: 'error' });
  }
});

// Registro de Rotas
server.register(tenantRoutes, { prefix: '/api/tenants' });
server.register(userRoutes, { prefix: '/api/users' });
server.register(authRoutes, { prefix: '/api/auth' });
server.register(contactRoutes, { prefix: '/api/contacts' });
server.register(pipelineRoutes, { prefix: '/api/pipelines' });
server.register(dealRoutes, { prefix: '/api/deals' });
server.register(productRoutes, { prefix: '/api/products' });
server.register(companyRoutes, { prefix: '/api/companies' });
server.register(taskRoutes, { prefix: '/api/tasks' });
server.register(dashboardRoutes, { prefix: '/api/dashboard' });
server.register(proposalRoutes, { prefix: '/api/proposals' });
server.register(leadRoutes, { prefix: '/api/leads' });
server.register(webhookRoutes, { prefix: '/api/webhooks' });
server.register(analyticsRoutes, { prefix: '/api/analytics' });

// Rotas Novas (Admin)
server.register(adminRoutes, { prefix: '/api/admin' });
server.register(publicApiRoutes, { prefix: '/api/public' });

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();