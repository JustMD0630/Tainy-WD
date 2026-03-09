import { Manager } from '../../manager.js'
import { RainlinkPlayer } from 'rainlink'

export default class {
  async execute(client: Manager, player: RainlinkPlayer, data: unknown) {
    // client.logger.info('PlayerUpdate', `[DEBUG] Base event triggered for guild: ${player.guildId}`)
    client.emit('playerUpdate', player)
  }
}
