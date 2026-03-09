import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'

export const putUpdatePlaylist = async (
  client: Manager,
  req: FastifyRequest,
  res: FastifyReply
) => {
  const { id } = req.params as { id: string }
  const body = req.body as {
    name?: string
    tracks?: any[]
    description?: string
    private?: boolean
    commentsDisabled?: boolean
    image?: string
  }

  const playlist = await client.db.playlist.get(id)
  if (!playlist) {
    return res.code(404).send({ error: 'Playlist not found' })
  }

  const updated = {
    ...playlist,
    ...body,
  }

  await client.db.playlist.set(id, updated)

  return res.send({ success: true, playlist: updated })
}
