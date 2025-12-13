import { FastifyInstance } from 'fastify';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function dashboardRoutes(app: FastifyInstance) {
  // Garante que apenas usuários logados acessem e pega o tenant_id do token
  app.addHook('onRequest', authenticate);

  // --- Rota 1: Resumo Numérico (Cards) ---
  app.get('/summary', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';

    try {
      // Filtros de Segurança
      const params = [tenantId];
      let userFilter = '';
      
      // Se for agente, adiciona filtro de usuário e o ID dele nos parâmetros
      if (isAgent) {
        userFilter = 'AND user_id = $2';
        params.push(userId);
      }

      // 1. Total de Clientes
      const contactsRes = await db.query(
        `SELECT COUNT(*) FROM contacts WHERE tenant_id = $1 ${userFilter}`,
        params
      );

      // 2. Valor em Negociação (Pipeline Aberto)
      const openDealsRes = await db.query(`
        SELECT SUM(d.value) as total 
        FROM deals d
        JOIN stages s ON d.stage_id = s.id
        WHERE d.tenant_id = $1 
        AND s.name NOT ILIKE '%Ganho%' 
        AND s.name NOT ILIKE '%Perdido%'
        ${isAgent ? 'AND d.user_id = $2' : ''}
      `, params);

      // 3. Vendas Realizadas (Ganho)
      const wonDealsRes = await db.query(`
        SELECT SUM(d.value) as total 
        FROM deals d
        JOIN stages s ON d.stage_id = s.id
        WHERE d.tenant_id = $1 AND s.name ILIKE '%Ganho%'
        ${isAgent ? 'AND d.user_id = $2' : ''}
      `, params);

      // 4. Propostas Enviadas (Total)
      const proposalsRes = await db.query(
        `SELECT COUNT(*) FROM proposals WHERE tenant_id = $1 ${userFilter}`, 
        params
      );

      return {
        total_contacts: Number(contactsRes.rows[0].count),
        pipeline_value: Number(openDealsRes.rows[0].total) || 0,
        won_value: Number(wonDealsRes.rows[0].total) || 0,
        total_proposals: Number(proposalsRes.rows[0].count)
      };

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to load dashboard metrics' });
    }
  });

  // --- Rota 2: Dados para Gráficos (Analytics) ---
  app.get('/charts', async (request, reply) => {
    const { tenantId, role, userId } = request.user!;
    const isAgent = role === 'agent';

    try {
      const params = [tenantId];
      if (isAgent) params.push(userId);

      // Gráfico 1: Volume de Vendas/Negócios por Mês
      const salesRes = await db.query(`
        SELECT 
          TO_CHAR(created_at, 'Mon') as name,
          SUM(value) as value
        FROM deals
        WHERE tenant_id = $1
        ${isAgent ? 'AND user_id = $2' : ''}
        GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) DESC
        LIMIT 6
      `, params);

      const salesByMonth = salesRes.rows.reverse();

      // Gráfico 2: Distribuição do Funil
      // Nota: Stages são globais do tenant, mas contamos apenas os deals do usuário se for agent
      const funnelRes = await db.query(`
        SELECT 
          s.name, 
          COUNT(d.id) as value
        FROM stages s
        LEFT JOIN deals d ON s.id = d.stage_id ${isAgent ? 'AND d.user_id = $2' : ''}
        JOIN pipelines p ON s.pipeline_id = p.id
        WHERE p.tenant_id = $1
        GROUP BY s.name, s."order"
        ORDER BY s."order" ASC
      `, params);

      return {
        salesByMonth,
        dealsByStage: funnelRes.rows
      };

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to fetch charts data' });
    }
  });
}