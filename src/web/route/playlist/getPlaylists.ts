import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'

export const getPlaylists = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
  const { userId } = req.params as { userId: string }
  // QuickDB v9+ returns array of objects { id: key, value: data }
  const allPlaylists = await client.db.playlist.all()
  
  // Filter playlists where owner matches userId
  const userPlaylists = allPlaylists
    .filter((entry: any) => entry.value.owner === userId)
    .map((entry: any) => entry.value)

  return res.send({ playlists: userPlaylists })
}
