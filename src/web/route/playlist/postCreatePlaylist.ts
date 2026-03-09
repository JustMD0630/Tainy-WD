import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'
import id from 'voucher-code-generator'

export const postCreatePlaylist = async (
  client: Manager,
  req: FastifyRequest,
  res: FastifyReply
) => {
  const { name, owner, description } = req.body as {
    name: string
    owner: string
    description?: string
  }

  if (!name || !owner) {
    return res.code(400).send({ error: 'Missing name or owner' })
  }

  const idgen = id.generate({ length: 8, prefix: 'playlist-' })
  const playlistId = idgen[0]

  const newPlaylist = {
    id: playlistId,
    name,
    owner,
    tracks: [],
    private: true,
    created: Date.now(),
    description: description || null,
  }

  await client.db.playlist.set(playlistId, newPlaylist)

  return res.send({ success: true, playlist: newPlaylist })
}
