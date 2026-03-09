import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'
import { UserData } from '../../../database/schema/User.js'

export const patchProfile = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.code(401).send({ error: 'Unauthorized' })
  }
  const token = authHeader.split(' ')[1]

  try {
      // Verify token with Discord
      const userRes = await fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${token}` }
      })
      if (!userRes.ok) return res.code(401).send({ error: 'Invalid token' })
      const discordUser = await userRes.json()
      
      const { bio, socials, banner, profileColor } = req.body as { 
          bio?: string; 
          banner?: string;
          profileColor?: string;
          socials?: { twitter?: string; instagram?: string; website?: string; github?: string } 
      }
      
      // Get existing user or create default
      let user = await client.db.user.get(discordUser.id)
      
      if (!user) {
          user = {
              id: discordUser.id,
              banned: false,
              muted: false,
              warns: 0,
              created: Date.now()
          }
      }

      // Update fields
      if (bio !== undefined) {
          if (bio.length > 200) return res.code(400).send({ error: 'Bio too long (max 200 chars)' })
          user.bio = bio
      }

      if (banner !== undefined) {
        // Basic URL validation
        // Allow empty string to clear banner, and relative paths starting with /uploads/
        if (banner && !banner.startsWith('http') && !banner.startsWith('/uploads/')) {
             return res.code(400).send({ error: 'Invalid banner URL' })
        }
        user.banner = banner
      }

      if (profileColor !== undefined) {
        // Hex color validation
        if (profileColor && !/^#[0-9A-F]{6}$/i.test(profileColor)) return res.code(400).send({ error: 'Invalid profile color' })
        user.profileColor = profileColor
      }

      if (socials) {
          // Simple URL validation could go here
          user.socials = {
              ...user.socials,
              ...socials
          }
      }
      
      await client.db.user.set(discordUser.id, user)

      return res.send({ success: true, user })
  } catch (err) {
      client.logger.error('PatchProfile', err)
      return res.code(500).send({ error: 'Internal Server Error' })
  }
}