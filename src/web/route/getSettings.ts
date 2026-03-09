import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../manager.js'

export const getSettings = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
  const { guildId } = req.params as { guildId: string }

  if (!guildId) {
    return res.code(400).send({ error: 'Missing guildId' })
  }

  // Fetch from specific tables defined in TableSetup (src/database/table.ts)
  const prefixData = (await client.db.prefix.get(guildId)) as { prefix: string } | null
  const languageData = (await client.db.language.get(guildId)) as { language: string } | null

  return res.send({
    prefix: prefixData?.prefix || client.config.utilities.MESSAGE_CONTENT.commands.prefix || '!',
    language: languageData?.language || client.config.bot.LANGUAGE || 'en',
  })
}
