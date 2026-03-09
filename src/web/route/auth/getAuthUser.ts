import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'

export const getAuthUser = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.code(401).send({ error: 'Missing or invalid token' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!userRes.ok) return res.code(401).send({ error: 'Invalid token' })
    const discordUser = await userRes.json()

    // Fetch user from DB to get ban status
    const dbUser = await client.db.user.get(discordUser.id)

    // Check Blacklist
    const isBlacklisted = await client.db.blacklist.get(`user_${discordUser.id}`)

    // Check Roles (Owner & Admin)
    const isOwner = client.config.bot.OWNER_ID === discordUser.id
    const isAdmin = client.config.bot.ADMIN.includes(discordUser.id)

    // Check Premium
    const premium = await client.db.premium.get(discordUser.id) as any
    // Owner and Admin are automatically Premium
    const isPremium = premium ? true : (isOwner || isAdmin)

    const banLevel = isBlacklisted ? 3 : (dbUser?.banLevel || (dbUser?.banned ? 2 : 0))
    const isBanned = isBlacklisted || dbUser?.banned || banLevel > 1

    const user = {
      ...discordUser,
      banner: dbUser?.banner || discordUser.banner,
      isPremium,
      isOwner,
      isAdmin,
      premiumPlan: premium ? premium.plan : (isOwner ? 'Owner' : (isAdmin ? 'Admin' : null)),
      banned: isBanned,
      banLevel: banLevel,
      banExpires: dbUser?.banExpires || 0,
      banReason: isBlacklisted ? 'Blacklisted by Bot Owner' : (dbUser?.banReason || (dbUser?.banned ? 'Suspensión (Legacy)' : '')),
      dashboardLanguage: dbUser?.dashboardLanguage || 'en',
      bio: dbUser?.bio || '',
      socials: dbUser?.socials || {},
      created: dbUser?.created || Date.now()
    }

    return res.send(user)
  } catch (err) {
    return res.code(500).send({ error: 'Failed to fetch user' })
  }
}
