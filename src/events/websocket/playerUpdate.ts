import { Manager } from '../../manager.js'
import { RainlinkPlayer } from 'rainlink'

export default class {
  async execute(client: Manager, player: RainlinkPlayer) {
    const ws = client.wsl.get(player.guildId)
    // if (ws) {
    //   client.logger.info('WSPlayerUpdate', `[DEBUG] Sending update to guild: ${player.guildId}`)
    // } else {
    //   client.logger.info('WSPlayerUpdate', `[DEBUG] No WS connection found for guild: ${player.guildId}`)
    // }

    ws?.send({
      op: 'playerUpdate',
      guild: player.guildId,
      position: player.position,
    })
  }
}
