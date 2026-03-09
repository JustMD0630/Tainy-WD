import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'
import { getUserBadgeInfo } from '../../util/getUserBadgeInfo.js'

export const getUser = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
  const { userId } = req.params as { userId: string }

  try {
    // 1. Get from DB
    const dbUser = await client.db.user.get(userId)

    // 2. Get public Discord info (Avatar, Username, Banner)
    // We need to fetch this from Discord API using the Bot Token
    let discordUser = null
    try {
        const userRes = await fetch(`https://discord.com/api/users/${userId}`, {
            headers: { Authorization: `Bot ${client.config.bot.TOKEN}` }
        })
        if (userRes.ok) {
            discordUser = await userRes.json()
        }
    } catch (e) {
        // Ignore fetch error
    }

    if (!discordUser && !dbUser) {
        return res.code(404).send({ error: 'User not found' })
    }

    // 3. Get Badge Info
    const badgeInfo = await getUserBadgeInfo(client, userId)

    // 4. Construct Public Profile
    const publicProfile = {
        id: userId,
        username: discordUser?.username || 'Unknown User',
        discriminator: discordUser?.discriminator || '0',
        avatar: discordUser?.avatar,
        banner: dbUser?.banner || discordUser?.banner, // Prefer custom banner from DB
        accent_color: discordUser?.accent_color,
        profileColor: dbUser?.profileColor,
        bio: dbUser?.bio || '',
        socials: dbUser?.socials || {},
        created: dbUser?.created, // Join date (to bot system)
        ...badgeInfo // Spread isOwner, isAdmin, isPremium
    }

    return res.send(publicProfile)
  } catch (err) {
      client.logger.error('GetUser', err)
      return res.code(500).send({ error: 'Internal Server Error' })
  }
}
