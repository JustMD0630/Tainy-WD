import { FastifyRequest } from 'fastify'

/**
 * Helper to get the authenticated user ID from the request Authorization header.
 * Validates the token against Discord API.
 */
export async function getAuthedUserId(req: FastifyRequest): Promise<string | null> {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }
    const token = authHeader.split(' ')[1]

    try {
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${token}` }
        })
        if (!userRes.ok) return null
        const discordUser = await userRes.json() as { id: string }
        return discordUser.id
    } catch (err) {
        return null
    }
}
