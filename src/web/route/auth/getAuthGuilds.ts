import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'
import { PermissionsBitField } from 'discord.js'

export const getAuthGuilds = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.code(401).send({ error: 'Missing or invalid token' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!guildsRes.ok) return res.code(401).send({ error: 'Invalid token' })
    const userGuilds = (await guildsRes.json()) as any[]

    // Filter guilds where user has Manage Server permission (0x20) or Administrator (0x8)
    // AND ALSO include guilds where the bot is present, even if user isn't admin (for public playlists/listening)
    // Wait, typically dashboards only show guilds you can MANAGE.
    // If the user wants to see a guild just to listen to music, they don't need "Manage Server".
    // But usually "Select Server" implies "Configure Server".
    // However, if the goal is to access the dashboard for a guild to request songs, they need to see it.
    
    const finalGuilds = userGuilds.map((g) => {
      const perms = BigInt(g.permissions)
      const hasManageGuild = (perms & BigInt(0x20)) === BigInt(0x20)
      const hasAdmin = (perms & BigInt(0x8)) === BigInt(0x8)
      const botInGuild = client.guilds.cache.has(g.id)

      // Include if:
      // 1. User has Admin/Manage Guild (to configure bot)
      // 2. OR Bot is in the guild (so regular users can access player/queue)
      if (hasManageGuild || hasAdmin || botInGuild) {
          return {
            id: g.id,
            name: g.name,
            icon: g.icon,
            botInGuild,
            permissions: g.permissions,
            owner: g.owner // Discord API returns owner boolean in /users/@me/guilds
          }
      }
      return null
    }).filter(g => g !== null)

    return res.send(finalGuilds)
  } catch (err) {
    return res.code(500).send({ error: 'Failed to fetch guilds' })
  }
}
