import { Manager } from '../manager.js'
import Fastify from 'fastify'
import { getAuthLogin } from './route/auth/getAuthLogin.js'
import { getAuthCallback } from './route/auth/getAuthCallback.js'
import { getAuthUser } from './route/auth/getAuthUser.js'
import { getAuthGuilds } from './route/auth/getAuthGuilds.js'

export class AuthRoute {
  constructor(protected client: Manager) {}

  main(fastify: Fastify.FastifyInstance) {
    fastify.get('/login', (req, res) => getAuthLogin(this.client, req, res))
    fastify.get('/callback', (req, res) => getAuthCallback(this.client, req, res))
    fastify.get('/user', (req, res) => getAuthUser(this.client, req, res))
    fastify.get('/guilds', (req, res) => getAuthGuilds(this.client, req, res))
  }
}
