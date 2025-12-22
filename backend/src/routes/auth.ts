import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/client';

export async function authRoutes(app: FastifyInstance) {
  
  app.post('/login', async (request, reply) => {
    const loginBody = z.object({
      email: z.string().email(),
      password: z.string(),
    });

    const { email, password } = loginBody.parse(request.body);

    try {
      // Busca usuário e INCLUI O CAMPO is_super_admin
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

      if (result.rows.length === 0) {
        return reply.status(401).send({ error: 'Invalid email or password' });
      }

      const user = result.rows[0];

      if (!user.password_hash) {
         return reply.status(401).send({ error: 'Invalid authentication method' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        return reply.status(401).send({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role, 
          tenantId: user.tenant_id 
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      // --- AQUI ESTAVA FALTANDO O CAMPO: ---
      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_super_admin: user.is_super_admin, // <--- OBRIGATÓRIO PARA O MENU APARECER
          avatar_url: null 
        }
      };

    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}