import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

export async function analyticsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // --- GET /api/analytics (Relatório Geral por Período) ---
  app.get('/', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    
    const querySchema = z.object({
        startDate: z.string().optional(), // YYYY-MM-DD
        endDate: z.string().optional()    // YYYY-MM-DD
    });

    const { startDate, endDate } = querySchema.parse(request.query);

    // Se não informar data, pega os últimos 30 dias por padrão
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

    try {
      // 1. Vendas Totais no Período (Status 'Ganho')
      const salesRes = await db.query(`
        SELECT 
            COUNT(d.id) as count, 
            COALESCE(SUM(d.value), 0) as total 
        FROM deals d
        JOIN stages s ON d.stage_id = s.id
        WHERE d.tenant_id = $1 
          AND s.name ILIKE '%Ganho%'
          AND d.created_at BETWEEN $2 AND $3
      `, [tenantId, start, end]);

      // 2. Ranking de Vendedores (Quem vendeu mais)
      const rankingRes = await db.query(`
        SELECT 
            u.name,
            COUNT(d.id) as deals_won,
            COALESCE(SUM(d.value), 0) as total_value
        FROM deals d
        JOIN stages s ON d.stage_id = s.id
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.tenant_id = $1 
          AND s.name ILIKE '%Ganho%'
          AND d.created_at BETWEEN $2 AND $3
        GROUP BY u.id, u.name
        ORDER BY total_value DESC
        LIMIT 5
      `, [tenantId, start, end]);

      // 3. Taxa de Conversão (Leads criados vs Convertidos no período)
      const leadsTotalRes = await db.query(`
        SELECT COUNT(*) FROM leads 
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
      `, [tenantId, start, end]);
      
      const leadsConvertedRes = await db.query(`
        SELECT COUNT(*) FROM leads 
        WHERE tenant_id = $1 AND status = 'converted' AND created_at BETWEEN $2 AND $3
      `, [tenantId, start, end]);

      return {
        period: { start, end },
        sales: {
            count: Number(salesRes.rows[0].count),
            value: Number(salesRes.rows[0].total)
        },
        sellers_ranking: rankingRes.rows,
        conversion: {
            total_leads: Number(leadsTotalRes.rows[0].count),
            converted_leads: Number(leadsConvertedRes.rows[0].count)
        }
      };

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Failed to fetch analytics' });
    }
  });
}