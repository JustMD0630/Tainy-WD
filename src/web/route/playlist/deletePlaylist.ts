import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'

export const deletePlaylist = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
  const { id } = req.params as { id: string }

  const playlist = await client.db.playlist.get(id)
  if (!playlist) {
    return res.code(404).send({ error: 'Playlist not found' })
  }

  await client.db.playlist.delete(id)

  return res.send({ success: true })
}
