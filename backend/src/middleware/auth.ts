import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { db } from '../db/client';

// Define a interface do Payload do Token
interface UserPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

// Extende o tipo do Fastify para incluir o usuário na requisição
declare module 'fastify' {
  interface FastifyRequest {
    user?: UserPayload;
  }
}

// --- Middleware Padrão: Verifica Token JWT ---
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return reply.status(401).send({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as UserPayload;
    request.user = decoded;
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}

// --- Middleware Super Admin: Verifica Permissão no Banco ---
export async function verifySuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    // 1. Executa a autenticação padrão primeiro
    await authenticate(request, reply);

    if (!request.user || !request.user.userId) {
       return; // Se authenticate falhou, ele já respondeu 401
    }

    // 2. Consulta o banco para ver se é super admin
    const result = await db.query('SELECT is_super_admin FROM users WHERE id = $1', [request.user.userId]);
    
    if (!result.rows[0] || !result.rows[0].is_super_admin) {
      return reply.status(403).send({ error: 'Access denied. Super Admin only.' });
    }

  } catch (error) {
    console.error('Super Admin Check Error:', error);
    return reply.status(403).send({ error: 'Unauthorized access' });
  }
}