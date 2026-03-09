
import { Crown, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type UserBadgeProps = {
    isOwner?: boolean
    isAdmin?: boolean
    isPremium?: boolean
    className?: string
}

export function UserBadge({ isOwner, isAdmin, isPremium, className = '' }: UserBadgeProps) {
    const { t } = useTranslation()

    if (isOwner) {
        return (
            <div className={`flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-red-500 border border-red-500/20 ${className}`} title={t('badge.owner') || 'Dueño'}>
                <ShieldCheck size={14} />
                <span>{t('badge.owner') || 'Dueño'}</span>
            </div>
        )
    }
    if (isAdmin) {
        return (
            <div className={`flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-500 border border-blue-500/20 ${className}`} title={t('badge.admin') || 'Admin'}>
                <ShieldCheck size={14} />
                <span>{t('badge.admin') || 'Admin'}</span>
            </div>
        )
    }
    if (isPremium) {
        return (
            <div className={`flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-500 border border-amber-500/20 ${className}`} title={t('badge.premium') || 'Premium'}>
                <Crown size={14} />
                <span>{t('badge.premium') || 'Premium'}</span>
            </div>
        )
    }
    
    // Default User Badge
    return (
        <div className={`flex items-center gap-1 rounded-md bg-gray-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-gray-500 border border-gray-500/20 ${className}`} title={t('badge.user') || 'Usuario'}>
            <span>{t('badge.user') || 'Usuario'}</span>
        </div>
    )
}
