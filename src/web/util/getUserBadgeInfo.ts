
import { Manager } from '../../manager.js'

export async function getUserBadgeInfo(client: Manager, userId: string) {
    // Check Roles (Owner & Admin)
    // Ensure config.bot.ADMIN is treated as an array
    const admins = Array.isArray(client.config.bot.ADMIN) ? client.config.bot.ADMIN : []
    const isOwner = client.config.bot.OWNER_ID === userId
    const isAdmin = admins.includes(userId)

    // Check Premium
    const premium = await client.db.premium.get(userId)
    // Owner and Admin are automatically Premium
    const isPremium = premium ? true : (isOwner || isAdmin)

    return {
        isOwner,
        isAdmin,
        isPremium
    }
}
