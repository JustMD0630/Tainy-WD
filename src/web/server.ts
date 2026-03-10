import { Manager } from '../manager.js'
import Fastify from 'fastify'
// import WebsocketPlugin from '@fastify/websocket'
import FastifyStatic from '@fastify/static'
import FastifyCors from '@fastify/cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
// import { WebsocketRoute } from './websocket.js'
import { PlayerRoute } from './player.js'
import { PlaylistRoute } from './playlist.js'
import { AuthRoute } from './auth.js'
import { AdminRoute } from './admin.js'
import { getSearch } from './route/getSearch.js'
import { getCommands } from './route/getCommands.js'
import http from 'node:http'
import { WebSocketServer } from 'ws'

import { getAuthLogin } from './route/auth/getAuthLogin.js'
import { getAuthCallback } from './route/auth/getAuthCallback.js'
import { getAuthUser } from './route/auth/getAuthUser.js'
import { getAuthGuilds } from './route/auth/getAuthGuilds.js'
import { getSettings } from './route/getSettings.js'
import { postSettings } from './route/postSettings.js'
import { postUserSettings } from './route/postUserSettings.js'
import { patchProfile } from './route/user/patchProfile.js'
import { getUser } from './route/user/getUser.js'
import { getConfig } from './route/getConfig.js'
import { getBotHealth } from './route/getBotHealth.js'
import { getBotInfo } from './route/getBotInfo.js'
import { getNotifications } from './route/notification/getNotifications.js'
import { putReadNotifications } from './route/notification/putReadNotifications.js'
import { DeleteNotification } from './route/notification/deleteNotification.js'
import { GetAdminNotifications } from './route/admin/getNotificationsLog.js'
import { GetBannedUsers } from './route/admin/getBannedUsers.js'
import { GetUserHistory } from './route/admin/getUserHistory.js'
import { postUpload } from './route/upload/postUpload.js'
import { postDeleteUpload } from './route/upload/postDeleteUpload.js'
import { postRequest } from './route/friendship/postRequest.js'
import { postAccept } from './route/friendship/postAccept.js'
import { deleteRelationship } from './route/friendship/deleteRelationship.js'
import { getFriends } from './route/friendship/getFriends.js'

export class WebServer {
  app: Fastify.FastifyInstance
  server: http.Server
  constructor(private client: Manager) {
    this.app = Fastify({
      logger: false,
    })
    
    // Log de arranque de WebServer para confirmar PID y Cluster
    console.log(`[WEB] Starting WebServer on Cluster ${this.client.cluster.id} (PID: ${process.pid})`)
    
    this.app.register(FastifyCors, { 
      origin: true,
      credentials: true
    })

    // Registramos WebSocket Plugin ANTES de cualquier ruta, hook o static files
    // para asegurar que capture la petición de Upgrade.
    
    // Check if plugin is already registered to avoid duplicates
    // if (!this.app.hasPlugin('@fastify/websocket')) {
    //    this.app.register(WebsocketPlugin)
    // }
    
    // Ruta de diagnóstico SIMPLE para verificar que WebSocket funciona
    // this.app.get('/__ws', { websocket: true }, (connection, req) => {
    //   console.log('[WS __ws ENTERED]', req.raw.url)
    //   const socket = (connection as any).socket
    //   socket.send('ok')
    // })

    // IMPORTANTE: Registrar la ruta WebSocket DIRECTAMENTE en la instancia principal
    // para evitar problemas de encapsulamiento con register callbacks
    // new WebsocketRoute(client).main(this.app)
    
    // Debug de rutas registradas una vez que Fastify esté listo
    this.app.ready(() => {
      console.log('[DEBUG] Rutas registradas:\n' + this.app.printRoutes())
    })

    // Middleware de logging para todas las peticiones (Antes de cualquier ruta)
    this.app.addHook('onRequest', (request, reply, done) => {
      if (this.client.config.utilities.WEB_SERVER.httpreq) {
        console.log(`[HTTP REQ] ${request.method} ${request.url}`)
      }
      done()
    })

    // Auth Hook (Moved to top to ensure it applies to all routes)
    this.app.addHook('preValidation', function hook(req, reply, done) {
      const url = req.url || ''
      const isProtected =
        url.startsWith('/v1/players') ||
        (url.startsWith('/v1/playlists') && req.method !== 'GET') || 
        url.startsWith('/v1/admin') ||
        url.startsWith('/v1/websocket')
      
      if (!isProtected) return done()

      // Allow preflight OPTIONS requests
      if (req.method === 'OPTIONS') return done()

      // Debug log for protected routes
      if (client.config.utilities.WEB_SERVER.httpreq) {
        console.log(`[AUTH CHECK] Checking access for ${url}`)
      }
      
      // Allow user settings and profile patch to handle their own auth
      if (url.startsWith('/v1/user/') || url.startsWith('/v1/users/')) return done()

      const authHeader = req.headers['authorization']
      const query = (req.query ?? {}) as { token?: string; authorization?: string }
      const queryAuth = query.authorization || query.token
      const auth = authHeader || queryAuth
      const masterAuth = client.config.utilities.WEB_SERVER.auth

      if (client.config.utilities.WEB_SERVER.httpreq) {
        console.log(`[AUTH CHECK] Auth provided: ${auth ? 'YES' : 'NO'} (Starts with Bearer: ${auth && auth.startsWith('Bearer ') ? 'YES' : 'NO'})`)
      }

      if (auth === masterAuth) return done()
      if (auth && auth.startsWith('Bearer ')) return done()

      // Allow WebSocket connection to proceed to handler for custom validation
      // We will validate token inside the websocket handler to avoid preValidation issues
      if (url.startsWith('/v1/websocket')) {
          if (client.config.utilities.WEB_SERVER.httpreq) {
            console.log(`[AUTH CHECK] Skipping preValidation for WebSocket: ${url}`)
          }
          return done()
      }

      if (client.config.utilities.WEB_SERVER.httpreq) {
        console.log(`[AUTH CHECK] FAILED for ${url}`)
      }
      reply.code(401)
      reply.send(JSON.stringify({ error: 'Authorization failed' }))
      return done()
    })

    this.server = this.app.server

    // --- NATIVE WEBSOCKET IMPLEMENTATION ---
    const wss = new WebSocketServer({ server: this.server, path: '/v1/websocket' })
    console.log('[WS] Native WebSocketServer initialized on path /v1/websocket')

    wss.on('connection', (ws, req) => {
      const url = req.url ?? '(unknown)'
      console.log('[WS] Connection received:', url)
      
      const fullUrl = new URL(url, 'http://localhost')
      const guildId = fullUrl.searchParams.get('guildId')
      const auth = fullUrl.searchParams.get('authorization')

      if (!guildId) {
        console.log('[WS REJECT] Missing guildId')
        return ws.close(1008, 'Missing guildId')
      }

      const masterAuth = client.config.utilities.WEB_SERVER.auth
      if (auth !== masterAuth && (!auth || !auth.startsWith('Bearer '))) {
        console.log('[WS REJECT] Auth failed')
        return ws.close(1008, 'Authorization failed')
      }

      // Register in client.wsl
      const wrapper = { 
        send: (data: any) => {
            if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(data))
        } 
      }
      client.wsl.set(guildId, wrapper)
      console.log(`[WS REGISTERED] Guild: ${guildId}`)

      ws.on('close', (code, reason) => {
        console.log(`[WS CLOSED] Guild: ${guildId} Code: ${code}`)
        if (client.wsl.get(guildId) === wrapper) client.wsl.delete(guildId)
      })
      
      ws.on('error', (err) => {
        console.error(`[WS ERROR] Guild: ${guildId}`, err)
      })
    })
    // ---------------------------------------

    const __dirname = path.dirname(fileURLToPath(import.meta.url))

    // Ruta correcta: dist/client (donde Vite deposita el frontend compilado)
    // __dirname es '.../dist/web', así que subimos un nivel a '.../dist' y entramos a 'client'
    const distPath = path.resolve(__dirname, '../client')

    console.log(`[DEBUG] __dirname: ${__dirname}`)
    console.log(`[DEBUG] distPath resolved: ${distPath}`)

    import('fs').then((fs) => {
      if (fs.existsSync(distPath)) {
        console.log(`[DEBUG] Dashboard dist folder EXISTS at ${distPath}`)
        const indexHtml = path.join(distPath, 'index.html')
        if (fs.existsSync(indexHtml)) {
          console.log(`[DEBUG] index.html EXISTS at ${indexHtml}`)
        } else {
          console.log(`[DEBUG] index.html MISSING at ${indexHtml}`)
        }
      } else {
        console.log(`[DEBUG] Dashboard dist folder MISSING at ${distPath}`)
      }
    })

    this.client.logger.info(WebServer.name, `Serving static files from: ${distPath}`)

    // Serve static files from dashboard build
    this.app.register(FastifyStatic, {
      root: distPath,
      wildcard: false, // Disable wildcard so we can handle SPA routing manually
    })

    // Serve uploads folder
    // Commented out automatic static serving to use manual handler above for better debugging
    /*
    const uploadsPath = path.join(process.cwd(), 'uploads')
    this.app.register(FastifyStatic, {
      root: uploadsPath,
      prefix: '/uploads/',
      decorateReply: false // Avoid conflict with previous registration
    })
    */

    // Explicitly handle assets to bypass 404 handler
    this.app.get('/assets/*', async (req, reply) => {
      const filename = req.url.replace('/assets/', '')
      const filePath = path.join(distPath, 'assets', filename)
      try {
        const content = await fs.promises.readFile(filePath)
        if (filename.endsWith('.js')) reply.type('application/javascript')
        else if (filename.endsWith('.css')) reply.type('text/css')
        return reply.send(content)
      } catch (err) {
        reply.code(404).send('Not Found')
      }
    })

    // Manually handle uploads to ensure they are served correctly and logged
    this.app.get('/uploads/*', async (req, reply) => {
      // Use params if available, otherwise fallback to URL parsing
      const wildcard = (req.params as any)['*']
      const filename = wildcard || req.url.split('?')[0].replace('/uploads/', '')
      
      // Security check to prevent directory traversal
      if (filename.includes('..')) {
        return reply.code(403).send('Forbidden')
      }
      
      const filePath = path.join(process.cwd(), 'uploads', filename)
      if (this.client.config.utilities.WEB_SERVER.httpreq) {
        console.log(`[HTTP] Serving upload: ${filePath}`)
      }
      
      try {
        // Check if file exists first
        await fs.promises.access(filePath, fs.constants.R_OK)
        
        const content = await fs.promises.readFile(filePath)
        // Determine content type based on extension
        const ext = path.extname(filename).toLowerCase()
        if (ext === '.png') reply.type('image/png')
        else if (ext === '.jpg' || ext === '.jpeg') reply.type('image/jpeg')
        else if (ext === '.webp') reply.type('image/webp')
        else if (ext === '.gif') reply.type('image/gif')
        
        return reply.send(content)
      } catch (err) {
        console.error(`[HTTP] Error serving upload ${filePath}: ${err}`)
        return reply.code(404).send('Not Found')
      }
    })

    // API Routes under /v1 (Eliminado el bloque contenedor /v1 global para simplificar)

    // Auth Routes - MANUAL OVERRIDE to ensure it works
    // Registramos manualmente cada ruta para evitar problemas con AuthRoute y prefijos
    this.app.get('/v1/auth/login', (req, res) => getAuthLogin(client, req, res))
    this.app.get('/v1/auth/callback', (req, res) => getAuthCallback(client, req, res))
    this.app.get('/v1/auth/user', (req, res) => getAuthUser(client, req, res))
    this.app.get('/v1/auth/guilds', (req, res) => getAuthGuilds(client, req, res))

    // Settings Routes
    this.app.get('/v1/settings/:guildId', (req, res) => getSettings(client, req, res))
    this.app.post('/v1/settings/:guildId', (req, res) => postSettings(client, req, res))
    this.app.post('/v1/user/settings', (req, res) => postUserSettings(client, req, res))
    this.app.patch('/v1/user/profile', (req, res) => patchProfile(client, req, res))
    this.app.get('/v1/users/:userId', (req, res) => getUser(client, req, res))

    // Upload Route
    this.app.post('/v1/upload', {
      bodyLimit: 10485760 // 10MB limit
    }, (req, res) => postUpload(client, req as any, res))

    this.app.post('/v1/upload/delete', (req, res) => postDeleteUpload(client, req as any, res))

    // Friendship Routes
    this.app.post('/v1/friendships/request', (req, res) => postRequest(client, req, res))
    this.app.post('/v1/friendships/requests/:requestId/accept', (req, res) => postAccept(client, req, res))
    this.app.delete('/v1/friendships/:relationshipId', (req, res) => deleteRelationship(client, req, res))
    this.app.get('/v1/friendships', (req, res) => getFriends(client, req, res))

    // Config Routes (Legacy support)
    this.app.get('/api/config', (req, res) => getConfig(client, req, res))
    this.app.get('/api/bot/health', (req, res) => getBotHealth(client, req, res))

    // Frontend Compatibility Aliases=== ALIAS DE COMPATIBILIDAD CON FRONTEND (LEGACY) ===
    // El frontend parece estar buscando /api/auth/me en lugar de /v1/auth/user
    this.app.get('/api/auth/me', (req, res) => getAuthUser(client, req, res))
    this.app.get('/api/auth/login', (req, res) => getAuthLogin(client, req, res))
    this.app.get('/api/auth/callback', (req, res) => getAuthCallback(client, req, res))
    this.app.get('/api/auth/guilds', (req, res) => getAuthGuilds(client, req, res))
    // =====================================================

    // Ya no necesitamos registrar AuthRoute porque hemos registrado las rutas manualmente arriba
    // Esto evita duplicidad y garantiza que funcionen sin hooks extraños

    // Public Routes
    this.app.get('/v1/search', (req, res) => getSearch(client, req, res))
    this.app.get('/api/bot/search', (req, res) => getSearch(client, req, res))
    this.app.get('/v1/commands', (req, res) => getCommands(client, req, res))
    this.app.get('/v1/bot/info', (req, res) => getBotInfo(client, req, res))
    this.app.get('/v1/ping', (req, res) => res.send({ pong: true }))

    // Notification Routes
    this.app.get('/v1/notifications', (req, res) => getNotifications(client, req, res))
    this.app.post('/v1/notifications/read', (req, res) => putReadNotifications(client, req, res))
    this.app.delete('/v1/notifications/:id', (req, res) => new DeleteNotification(client).main(req, res))
    this.app.get('/v1/admin/notifications', (req, res) => new GetAdminNotifications(client).main(req, res))
    this.app.get('/v1/admin/users/banned', (req, res) => new GetBannedUsers(client).main(req, res))
    this.app.get('/v1/admin/users/:targetUserId/history', (req, res) => new GetUserHistory(client).main(req, res))

    // this.app.register(WebsocketPlugin)
    // this.app.register((fastify, _, done) => {
    //   new WebsocketRoute(client).main(fastify)
    //   done()
    // })

    new PlayerRoute(client).main(this.app)
    new PlaylistRoute(client).main(this.app)
    new AdminRoute(client).main(this.app)

    // Auth hook moved to top of file
    
    this.app.get('/catgirls', (request, reply) => {
      const response = [
        'Bro 💀',
        'Please stop...',
        "This ain't rule 34...",
        '💀',
        'Can you do something better please -_-',
        "Don't be like yandev ._.",
        'Why you still here >:v',
        'I know catgirls do nothing wrong but why you still here...',
        "Bro, I don't have any catgirls collection (or cosplay collection) so please leave...",
      ]
      client.logger.info('HealthRouterService', `${request.method} ${request.routeOptions.url}`)
      reply.send({ tainy: response[Math.floor(Math.random() * response.length)] })
    })

    // SPA Fallback for Dashboard
    this.app.setNotFoundHandler(async (req, res) => {
      const url = req.raw.url || ''
      
      // Define backend/asset prefixes that should return actual 404s and Log Warnings
      const isBackendRoute = 
        url.startsWith('/v1/') || 
        url.startsWith('/api/') || 
        url.startsWith('/uploads/') || 
        url.startsWith('/assets/') || 
        url.startsWith('/catgirls')

      if (isBackendRoute) {
        this.client.logger.warn(WebServer.name, `[404 Handler] Backend Route Not Found: ${url}`)
        res.status(404).send({ error: 'Not Found' })
        return
      }

      // SPA Fallback: Serve index.html for frontend routes (No WARN log)
      // This allows routes like /profile, /library, /dashboard to work without spamming logs
      const indexHtmlPath = path.join(distPath, 'index.html')
      try {
        const content = await fs.promises.readFile(indexHtmlPath, 'utf-8')
        res.type('text/html').send(content)
      } catch (err) {
        this.client.logger.error(
          WebServer.name,
          `Error reading index.html from ${indexHtmlPath}: ${err}`
        )
        res.status(500).send('Internal Server Error: Could not load dashboard.')
      }
    })

    const port = this.client.config.utilities.WEB_SERVER.port

    this.app.ready(() => {
      this.server.listen({ port })
      this.client.logger.info(WebServer.name, `Server running at port ${port}`)
    })
  }
}
