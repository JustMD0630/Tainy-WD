
import util from 'node:util'
import { Manager } from '../../../manager.js'
import Fastify from 'fastify'
import { Playlist } from '../../../database/schema/Playlist.js'
import { getUserBadgeInfo } from '../../util/getUserBadgeInfo.js'

export class GetExplorePlaylists {
  constructor(protected client: Manager) {}

  async main(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    if (this.client.config.utilities.WEB_SERVER.httpreq) {
      this.client.logger.info(
        GetExplorePlaylists.name,
        `${req.method} ${req.routeOptions.url} params=${req.params ? util.inspect(req.params) : '{}'}`
      )
    }

    try {
      // Fetch all playlists
      const allPlaylists = await this.client.db.playlist.all()
      
      // Filter for public playlists
      // In QuickDB .all() returns { id: key, value: data } array
      const publicPlaylists: any[] = []

      for (const entry of allPlaylists) {
          const playlist = entry.value as Playlist
          // Check if public (private !== true)
          // Also ensure it has tracks so we don't show empty ones
          if (playlist.private !== true && playlist.tracks && playlist.tracks.length > 0) {
              
              // Fetch owner info to display
              let ownerInfo = {
                  id: playlist.owner,
                  username: 'Desconocido',
                  avatar: null as string | null,
                  isOwner: false,
                  isAdmin: false,
                  isPremium: false
              }

              try {
                  const user = await this.client.users.fetch(playlist.owner)
                  if (user) {
                      ownerInfo.username = user.username
                      ownerInfo.avatar = user.displayAvatarURL({ size: 256 })
                  }
                  
                  const badgeInfo = await getUserBadgeInfo(this.client, playlist.owner)
                  Object.assign(ownerInfo, badgeInfo)

              } catch (e) {}

              publicPlaylists.push({
                  ...playlist,
                  ownerInfo
              })
          }
      }

      // Sort by newest first (using createdAt if available, otherwise random/insertion order)
      // Assuming createdAt is ISO string
      publicPlaylists.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
      })

      res.send({
        success: true,
        playlists: publicPlaylists,
      })
    } catch (err) {
      this.client.logger.error(GetExplorePlaylists.name, err)
      res.code(500).send({ success: false, error: 'Internal Server Error' })
    }
  }
}
