import crypto from 'crypto'
import { k, redis } from './redis'

/**
 * Relógio da Anna: fila de tarefas com hora marcada no Redis (ZSET por horário).
 * O /api/tick é chamado de 5 em 5 minutos (QStash) e executa o que venceu.
 *
 * Claim atômico (kommo/PEGADINHAS §10): só quem consegue o ZREM executa, então
 * dois ticks simultâneos nunca disparam o mesmo job duas vezes.
 * Cancelamento por TOKEN: o job carrega o token do momento em que foi agendado;
 * se o estado do lead mudou (respondeu, passou para humano), o token não bate e
 * o job morre sem fazer nada. Não é preciso caçar jobs para apagar.
 */

export type TipoJob = 'msg5' | 'fu' | 'encerra' | 'lembrete'

export interface Job {
  id: string
  tipo: TipoJob
  leadId: number
  /** ms epoch */
  quando: number
  token: string
  dados?: Record<string, unknown>
}

const TTL = 30 * 86400

export async function agendarJob(j: Omit<Job, 'id'>): Promise<string> {
  const id = crypto.randomUUID()
  await redis.set(k('job', id), { ...j, id }, { ex: TTL })
  await redis.zadd(k('jobs'), { score: j.quando, member: id })
  return id
}

/** Pega (e tira da fila) os jobs vencidos. Cada id só é devolvido a um chamador. */
export async function pegarVencidos(agora = Date.now(), max = 50): Promise<Job[]> {
  const ids = await redis.zrange<string[]>(k('jobs'), 0, agora, { byScore: true, offset: 0, count: max })
  const out: Job[] = []
  for (const id of ids) {
    if ((await redis.zrem(k('jobs'), id)) !== 1) continue
    const job = await redis.get<Job>(k('job', id))
    await redis.del(k('job', id))
    if (job) out.push(job)
  }
  return out
}

export async function proximosJobs(limite = 50): Promise<Job[]> {
  const ids = await redis.zrange<string[]>(k('jobs'), 0, limite - 1)
  const jobs = await Promise.all(ids.map(id => redis.get<Job>(k('job', id))))
  return jobs.filter((j): j is Job => !!j)
}

export const novoToken = () => crypto.randomUUID().slice(0, 12)
