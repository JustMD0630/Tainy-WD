import { FastifyReply, FastifyRequest } from 'fastify'
import { Manager } from '../../../manager.js'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export const postUpload = async (
  client: Manager,
  req: FastifyRequest<{ Body: { image: string } }>,
  res: FastifyReply
) => {
  const { image } = req.body

  if (!image) {
    return res.status(400).send({ error: 'No image provided' })
  }

  // Remove header if present (e.g., "data:image/png;base64,")
  const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
  
  if (!matches || matches.length !== 3) {
    return res.status(400).send({ error: 'Invalid base64 string' })
  }

  const type = matches[1]
  const buffer = Buffer.from(matches[2], 'base64')
  
  // Validate file type (basic check)
  if (!type.startsWith('image/')) {
    return res.status(400).send({ error: 'Only images are allowed' })
  }

  // Generate unique filename
  const ext = type.split('/')[1]
  const filename = `${crypto.randomUUID()}.${ext}`
  
  // Ensure uploads directory exists
  const uploadDir = path.join(process.cwd(), 'uploads')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const filePath = path.join(uploadDir, filename)

  try {
    await fs.promises.writeFile(filePath, buffer)
    
    // Return the public URL
    // We will serve 'uploads' directory at /uploads route
    // Use relative URL so it works with any domain
    const url = `/uploads/${filename}`
    
    return res.send({ url })
  } catch (err) {
    client.logger.error('Upload', `Failed to save file: ${err}`)
    return res.status(500).send({ error: 'Failed to save file' })
  }
}
