import { FastifyInstance } from 'fastify';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function analyticsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // GET /api/analytics/dashboard
  app.get('/dashboard', async (request, reply) => {
    const { tenantId } = request.user!;

    try {
      const client = await db.getClient();

      // 1. KPI: Total de Leads e Status
      const leadsStats = await client.query(`
        SELECT status, COUNT(*) as count 
        FROM leads 
        WHERE tenant_id = $1 
        GROUP BY status
      `, [tenantId]);

      const leadCounts = {
        new: 0,
        in_progress: 0,
        converted: 0,
        lost: 0,
        total: 0
      };

      leadsStats.rows.forEach(row => {
        const count = Number(row.count);
        if (row.status === 'new') leadCounts.new = count;
        if (row.status === 'in_progress') leadCounts.in_progress = count;
        if (row.status === 'converted') leadCounts.converted = count;
        if (row.status === 'lost') leadCounts.lost = count;
        leadCounts.total += count;
      });

      // 2. KPI: Financeiro (Propostas Aceitas vs Enviadas)
      const financialStats = await client.query(`
        SELECT status, SUM(total_amount) as total 
        FROM proposals 
        WHERE tenant_id = $1 
        GROUP BY status
      `, [tenantId]);

      const revenue = {
        sent: 0,      // Pipeline (Enviado)
        accepted: 0,  // Receita Garantida
        rejected: 0
      };

      financialStats.rows.forEach(row => {
        const val = Number(row.total);
        if (row.status === 'sent') revenue.sent = val;
        if (row.status === 'accepted') revenue.accepted = val;
        if (row.status === 'rejected') revenue.rejected = val;
      });

      // 3. Performance por Vendedor (Top 5)
      // Agrega leads convertidos e tarefas concluídas
      const agentsStats = await client.query(`
        SELECT 
            u.id, 
            u.name,
            COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'converted') as converted_leads,
            COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks
        FROM users u
        LEFT JOIN leads l ON l.user_id = u.id AND l.tenant_id = $1
        LEFT JOIN tasks t ON t.user_id = u.id AND t.tenant_id = $1
        WHERE u.tenant_id = $1 AND u.role IN ('agent', 'admin', 'owner')
        GROUP BY u.id, u.name
        ORDER BY converted_leads DESC
        LIMIT 5
      `, [tenantId]);

      client.release();

      // Cálculos Finais
      const conversionRate = leadCounts.total > 0 
        ? ((leadCounts.converted / leadCounts.total) * 100).toFixed(1) 
        : '0.0';

      return {
        leads: leadCounts,
        revenue,
        conversionRate,
        agents: agentsStats.rows
      };

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to fetch analytics' });
    }
  });
}