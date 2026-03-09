import { FastifyReply, FastifyRequest } from 'fastify'
import { Manager } from '../../../manager.js'
import fs from 'node:fs'
import path from 'node:path'

export const postDeleteUpload = async (
  client: Manager,
  req: FastifyRequest<{ Body: { url: string } }>,
  res: FastifyReply
) => {
  const { url } = req.body

  if (!url) {
    return res.status(400).send({ error: 'No URL provided' })
  }

  // Security check: ensure URL starts with /uploads/ and doesn't contain traversal
  if (!url.startsWith('/uploads/') || url.includes('..')) {
    return res.status(400).send({ error: 'Invalid file path' })
  }

  const filename = url.replace('/uploads/', '')
  const filePath = path.join(process.cwd(), 'uploads', filename)

  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath)
      return res.send({ success: true })
    } else {
      return res.status(404).send({ error: 'File not found' })
    }
  } catch (err) {
    client.logger.error('Upload', `Failed to delete file: ${err}`)
    return res.status(500).send({ error: 'Failed to delete file' })
  }
}
