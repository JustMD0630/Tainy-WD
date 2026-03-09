import { Manager } from '../manager.js'
import Fastify from 'fastify'
import { getPlaylists } from './route/playlist/getPlaylists.js'
import { postCreatePlaylist } from './route/playlist/postCreatePlaylist.js'
import { getPlaylist } from './route/playlist/getPlaylist.js'
import { putUpdatePlaylist } from './route/playlist/putUpdatePlaylist.js'
import { deletePlaylist } from './route/playlist/deletePlaylist.js'
import { GetExplorePlaylists } from './route/playlist/getExplore.js'
import { PlaylistComments } from './route/playlist/comment.js'

export class PlaylistRoute {
  constructor(protected client: Manager) {}

  main(fastify: Fastify.FastifyInstance) {
    const comments = new PlaylistComments(this.client)

    fastify.get('/v1/playlists/explore', (req, res) => new GetExplorePlaylists(this.client).main(req, res))
    fastify.get('/v1/playlists/user/:userId', (req, res) => getPlaylists(this.client, req, res))
    fastify.post('/v1/playlists', (req, res) => postCreatePlaylist(this.client, req, res))
    fastify.get('/v1/playlists/:id', (req, res) => getPlaylist(this.client, req, res))
    fastify.put('/v1/playlists/:id', (req, res) => putUpdatePlaylist(this.client, req, res))
    fastify.delete('/v1/playlists/:id', (req, res) => deletePlaylist(this.client, req, res))

    // Comments & Reports
    fastify.get('/v1/playlists/:id/comments', (req, res) => comments.getComments(req, res))
    fastify.post('/v1/playlists/:id/comments', (req, res) => comments.postComment(req, res))
    fastify.delete('/v1/comments/:commentId', (req, res) => comments.deleteComment(req, res))
    fastify.post('/v1/comments/:commentId/report', (req, res) => comments.reportComment(req, res))
  }
}
