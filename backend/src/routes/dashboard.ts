import { FastifyInstance } from 'fastify';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // GET /api/dashboard/summary
  app.get('/summary', async (request, reply) => {
    const { tenantId, userId, role } = request.user!;
    const isAgent = role === 'agent';

    try {
      const client = await db.getClient();

      // 1. STATS: Contadores Rápidos
      // Leads (Ativos)
      let leadsCountQuery = `SELECT COUNT(*) FROM leads WHERE tenant_id = $1 AND status IN ('new', 'in_progress')`;
      const leadsCountParams: any[] = [tenantId];
      if (isAgent) {
        leadsCountQuery += ` AND user_id = $2`;
        leadsCountParams.push(userId);
      }
      const leadsRes = await client.query(leadsCountQuery, leadsCountParams);

      // Tarefas (Pendentes)
      let tasksCountQuery = `SELECT COUNT(*) FROM tasks WHERE tenant_id = $1 AND status = 'pending'`;
      const tasksCountParams: any[] = [tenantId];
      if (isAgent) {
        tasksCountQuery += ` AND user_id = $2`;
        tasksCountParams.push(userId);
      }
      const tasksRes = await client.query(tasksCountQuery, tasksCountParams);

      // Propostas (Em aberto: Draft ou Sent)
      let proposalsCountQuery = `SELECT COUNT(*) FROM proposals WHERE tenant_id = $1 AND status IN ('draft', 'sent')`;
      const proposalsCountParams: any[] = [tenantId];
      if (isAgent) {
        proposalsCountQuery += ` AND user_id = $2`;
        proposalsCountParams.push(userId);
      }
      const proposalsRes = await client.query(proposalsCountQuery, proposalsCountParams);

      // Valor em Pipeline (Deals ou Propostas enviadas)
      // Vamos usar propostas enviadas como base de "Valor em Negociação"
      let pipelineValueQuery = `SELECT SUM(total_amount) FROM proposals WHERE tenant_id = $1 AND status = 'sent'`;
      const pipelineParams: any[] = [tenantId];
      if (isAgent) {
        pipelineValueQuery += ` AND user_id = $2`;
        pipelineParams.push(userId);
      }
      const pipelineRes = await client.query(pipelineValueQuery, pipelineParams);


      // 2. LISTAS: Agenda e Leads Recentes
      
      // Minha Agenda (Próximas 5 tarefas pendentes, ordenadas por data)
      let agendaQuery = `
        SELECT id, title, due_date, priority 
        FROM tasks 
        WHERE tenant_id = $1 AND status = 'pending'
      `;
      const agendaParams: any[] = [tenantId];
      if (isAgent) {
        agendaQuery += ` AND user_id = $2`;
        agendaParams.push(userId);
      }
      agendaQuery += ` ORDER BY due_date ASC NULLS LAST LIMIT 5`;
      const agendaRes = await client.query(agendaQuery, agendaParams);

      // Leads Recentes (Últimos 5)
      let recentLeadsQuery = `
        SELECT id, name, company_name, status, created_at 
        FROM leads 
        WHERE tenant_id = $1
      `;
      const recentLeadsParams: any[] = [tenantId];
      if (isAgent) {
        recentLeadsQuery += ` AND user_id = $2`;
        recentLeadsParams.push(userId);
      }
      recentLeadsQuery += ` ORDER BY created_at DESC LIMIT 5`;
      const recentLeadsRes = await client.query(recentLeadsQuery, recentLeadsParams);

      client.release();

      return {
        stats: {
            active_leads: parseInt(leadsRes.rows[0].count),
            pending_tasks: parseInt(tasksRes.rows[0].count),
            open_proposals: parseInt(proposalsRes.rows[0].count),
            pipeline_value: parseFloat(pipelineRes.rows[0].sum || '0')
        },
        agenda: agendaRes.rows,
        recent_leads: recentLeadsRes.rows
      };

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to load dashboard' });
    }
  });
}