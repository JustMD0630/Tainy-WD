import { Manager } from '../manager.js'
import Fastify from 'fastify'
import { GetAdminStats } from './route/admin/getStats.js'
import { GetAdminReports } from './route/admin/getReports.js'
import { PostAdminAction } from './route/admin/postAction.js'
import { GetAdminGuilds } from './route/admin/getGuilds.js'
import { PostGuildLeave } from './route/admin/postGuildLeave.js'
import { GetAdminHistoryUsers } from './route/admin/getHistoryUsers.js'

export class AdminRoute {
  constructor(protected client: Manager) {}

  main(fastify: Fastify.FastifyInstance) {
    fastify.get('/v1/admin/stats', (req, res) => new GetAdminStats(this.client).main(req, res))
    fastify.get('/v1/admin/reports', (req, res) => new GetAdminReports(this.client).main(req, res))
    fastify.post('/v1/admin/action', (req, res) => new PostAdminAction(this.client).main(req, res))
    
    // Guild Management
    fastify.get('/v1/admin/guilds', (req, res) => new GetAdminGuilds(this.client).main(req, res))
    fastify.post('/v1/admin/guilds/:guildId/leave', (req, res) => new PostGuildLeave(this.client).main(req, res))

    // User History Management
    fastify.get('/v1/admin/history/users', (req, res) => new GetAdminHistoryUsers(this.client).main(req, res))
  }
}
