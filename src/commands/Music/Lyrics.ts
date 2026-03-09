import { ApplicationCommandOptionType, EmbedBuilder, Message } from 'discord.js'
import { Manager } from '../../manager.js'
import { Accessableby, Command } from '../../structures/Command.js'
import { CommandHandler } from '../../structures/CommandHandler.js'

// Main code
export default class implements Command {
  public name = ['lyrics']
  public description = 'Make the bot join the voice channel.'
  public category = 'Music'
  public accessableby = [Accessableby.Member]
  public usage = 'Display lyrics of the song'
  public aliases = ['ly']
  public lavalink = true
  public playerCheck = false
  public usingInteraction = true
  public sameVoiceCheck = false
  public permissions = []
  public options = [
    {
      name: 'search',
      description: 'The song name',
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ]

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply()

    const query = handler.args.join(' ').trim()
    const player = client.rainlink.players.get(String(handler.guild?.id))

    if (!player && query.length === 0)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, 'command.music', 'lyrics_notfound')}`
            )
            .setColor(client.color),
        ],
      })

    let track = player?.queue.current
    let title = track?.title ?? query

    if (query.length > 0) {
      const result = player
        ? await player.search(query, { requester: handler.user })
        : await client.rainlink.search(query, { requester: handler.user })

      if (!result?.tracks?.length)
        return handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.i18n.get(handler.language, 'command.music', 'lyrics_notfound')}`
              )
              .setColor(client.color),
          ],
        })

      track = result.tracks[0]
      title = track.title
    }

    if (!track?.encoded)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, 'command.music', 'lyrics_notfound')}`
            )
            .setColor(client.color),
        ],
      })

    const nodeOptions = player?.node?.options ?? client.config.player.NODES?.[0]
    const protocol = nodeOptions?.secure ? 'https' : 'http'
    const baseUrl = `${protocol}://${nodeOptions.host}:${nodeOptions.port}`
    const url = `${baseUrl}/v4/lyrics?track=${encodeURIComponent(track.encoded)}&skipTrackSource=true`

    const res = await fetch(url, {
      headers: {
        Authorization: nodeOptions.auth,
      },
    }).catch(() => null)

    if (!res || res.status === 204)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, 'command.music', 'lyrics_notfound')}`
            )
            .setColor(client.color),
        ],
      })

    if (res.status === 401 || res.status === 403)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription('Lavalink authorization failed.')
            .setColor(client.color),
        ],
      })

    if (!res.ok)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, 'command.music', 'lyrics_notfound')}`
            )
            .setColor(client.color),
        ],
      })

    const data = (await res.json().catch(() => null)) as any
    const text =
      typeof data?.text === 'string'
        ? data.text
        : Array.isArray(data?.lines)
          ? data.lines
              .map((l: any) => String(l?.line ?? '').trimEnd())
              .filter((l: string) => l.length > 0)
              .join('\n')
          : ''

    if (!text)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, 'command.music', 'lyrics_notfound')}`
            )
            .setColor(client.color),
        ],
      })

    const embed = new EmbedBuilder()
      .setColor(client.color)
      .setTitle(
        `${client.i18n.get(handler.language, 'command.music', 'lyrics_title', {
          song: title,
        })}`
      )
      .setDescription(text.length > 4096 ? text.slice(0, 4000) + '\n…' : text)
      .setTimestamp()

    return handler.editReply({ embeds: [embed] })
  }
}
