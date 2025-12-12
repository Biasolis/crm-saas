import { FastifyInstance } from 'fastify';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function dashboardRoutes(app: FastifyInstance) {
  // Garante que apenas usuários logados acessem e pega o tenant_id do token
  app.addHook('onRequest', authenticate);

  // --- Rota 1: Resumo Numérico (Cards) ---
  app.get('/summary', async (request, reply) => {
    const tenantId = request.user?.tenantId;

    try {
      // 1. Total de Clientes
      const contactsRes = await db.query(
        'SELECT COUNT(*) FROM contacts WHERE tenant_id = $1',
        [tenantId]
      );

      // 2. Valor em Negociação (Pipeline Aberto)
      // Soma o valor de todos os negócios que NÃO estão em etapas de "Ganho" ou "Perdido"
      const openDealsRes = await db.query(`
        SELECT SUM(d.value) as total 
        FROM deals d
        JOIN stages s ON d.stage_id = s.id
        WHERE d.tenant_id = $1 
        AND s.name NOT ILIKE '%Ganho%' 
        AND s.name NOT ILIKE '%Perdido%'
      `, [tenantId]);

      // 3. Vendas Realizadas (Ganho)
      const wonDealsRes = await db.query(`
        SELECT SUM(d.value) as total 
        FROM deals d
        JOIN stages s ON d.stage_id = s.id
        WHERE d.tenant_id = $1 AND s.name ILIKE '%Ganho%'
      `, [tenantId]);

      // 4. Propostas Enviadas (Total)
      const proposalsRes = await db.query(
        'SELECT COUNT(*) FROM proposals WHERE tenant_id = $1', 
        [tenantId]
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
    const tenantId = request.user?.tenantId;

    try {
      // Gráfico 1: Volume de Vendas/Negócios por Mês (Últimos 6 meses)
      // Agrupa por mês de criação
      const salesRes = await db.query(`
        SELECT 
          TO_CHAR(created_at, 'Mon') as name,
          SUM(value) as value
        FROM deals
        WHERE tenant_id = $1
        GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) DESC
        LIMIT 6
      `, [tenantId]);

      // Inverte o array para mostrar do mais antigo para o mais novo (cronológico: Jan -> Fev)
      const salesByMonth = salesRes.rows.reverse();

      // Gráfico 2: Distribuição do Funil (Pizza/Donut)
      // Conta quantos deals existem em cada etapa
      const funnelRes = await db.query(`
        SELECT 
          s.name, 
          COUNT(d.id) as value
        FROM stages s
        LEFT JOIN deals d ON s.id = d.stage_id
        JOIN pipelines p ON s.pipeline_id = p.id
        WHERE p.tenant_id = $1
        GROUP BY s.name, s."order"
        ORDER BY s."order" ASC
      `, [tenantId]);

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