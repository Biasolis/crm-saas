import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/client';

export async function authRoutes(app: FastifyInstance) {
  
  app.post('/login', async (request, reply) => {
    try {
      // 1. Validação DENTRO do try/catch para capturar erros de formato
      const loginBody = z.object({
        email: z.string().email(),
        password: z.string(),
      });

      const { email, password } = loginBody.parse(request.body);

      // 2. Busca usuário
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

      if (result.rows.length === 0) {
        return reply.status(401).send({ error: 'E-mail não encontrado ou senha inválida' });
      }

      const user = result.rows[0];

      // 3. Verifica hash da senha
      if (!user.password_hash) {
         console.error('ERRO: Usuário sem senha cadastrada no banco.');
         return reply.status(401).send({ error: 'Método de autenticação inválido' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        return reply.status(401).send({ error: 'Senha incorreta' });
      }

      // 4. Gera o Token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role, 
          tenantId: user.tenant_id,
          isSuperAdmin: user.is_super_admin || false // Adiciona flag no token também
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      // 5. Retorna dados
      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_super_admin: user.is_super_admin || false, // Garante booleano mesmo se null
          avatar_url: null 
        }
      };

    } catch (error: any) {
      // LOG DETALHADO NO TERMINAL DO BACKEND
      console.error('🚨 ERRO NO LOGIN:', error);
      
      // Se for erro de validação do Zod
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
      }

      return reply.status(500).send({ error: 'Erro interno no servidor. Verifique o terminal.' });
    }
  });
}