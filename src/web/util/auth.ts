import { FastifyRequest } from 'fastify'

// Simple in-memory cache for auth tokens
// Map<token, { userId: string, exp: number }>
const authCache = new Map<string, { userId: string; exp: number }>()

// Clean up expired cache entries every 5 minutes
setInterval(() => {
    const now = Date.now()
    for (const [token, data] of authCache.entries()) {
        if (data.exp < now) {
            authCache.delete(token)
        }
    }
}, 5 * 60 * 1000).unref() // unref to not prevent process exit

/**
 * Helper to get the authenticated user ID from the request Authorization header.
 * Validates the token against Discord API.
 * Uses an in-memory cache to reduce Discord API calls.
 */
export async function getAuthedUserId(req: FastifyRequest): Promise<string | null> {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }
    const token = authHeader.split(' ')[1]

    // Check cache
    const now = Date.now()
    const cached = authCache.get(token)
    if (cached) {
        if (cached.exp > now) {
            return cached.userId
        } else {
            authCache.delete(token)
        }
    }

    // Check if fetch is available (Node 18+)
    if (typeof fetch === 'undefined') {
        console.warn('[Auth] global.fetch is not defined. Please use Node.js 18+ or provide a polyfill.')
        return null
    }

    try {
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${token}` }
        })
        
        if (!userRes.ok) return null
        
        const discordUser = await userRes.json() as { id: string }
        
        // Cache success result for 60 seconds
        authCache.set(token, {
            userId: discordUser.id,
            exp: now + 60 * 1000
        })

        return discordUser.id
    } catch (err) {
        return null
    }
}
