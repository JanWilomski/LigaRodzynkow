import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Medal, Flame, Zap, UserMinus, UserPlus } from 'lucide-react'
import { formatPercent } from '@/lib/utils'

export function PlayerProfilePage() {
    const { id } = useParams()
    const { data: p, isLoading } = useQuery({
        queryKey: ['player-profile', id],
        queryFn: () => api.getPlayerProfile(id!),
    })

    if (isLoading || !p) return <div className="p-8 text-center">Wczytywanie profilu...</div>

    // Sortowanie dla "Najlepszy/Najgorszy"
    const bestPartner = [...p.partners].sort((a, b) => b.winrate - a.winrate || b.gamesTogether - a.gamesTogether)[0]
    const worstPartner = [...p.partners].sort((a, b) => a.winrate - b.winrate || b.gamesTogether - a.gamesTogether)[0]
    const toughestOpponent = [...p.opponents].sort((a, b) => a.winrate - b.winrate)[0]

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Hero */}
            <div className="flex flex-col md:flex-row gap-6 items-center bg-[var(--color-surface)] p-8 rounded-xl border border-[var(--color-border)]">
                <Avatar name={p.name} size="lg" className="size-24 text-2xl" />
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-3xl font-black">{p.name}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
                        <div className="text-sm font-mono text-[var(--color-muted)]">
                            WINRATE: <span className="text-[var(--color-accent)] font-bold">{formatPercent(p.winrate)}</span>
                        </div>
                        <div className="text-sm font-mono text-[var(--color-muted)]">
                            MECZE: <span className="text-[var(--color-foreground)] font-bold">{p.gamesPlayed}</span>
                        </div>
                    </div>
                </div>
                {/* Streaks */}
                <div className="flex gap-3">
                    <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg text-center min-w-[100px]">
                        <Flame className="size-5 text-orange-500 mx-auto mb-1" />
                        <div className="text-xs uppercase font-black text-orange-500/70">Seria</div>
                        <div className="text-2xl font-black text-orange-500">{p.currentStreak}</div>
                    </div>
                    <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 p-4 rounded-lg text-center min-w-[100px]">
                        <Zap className="size-5 text-[var(--color-accent)] mx-auto mb-1" />
                        <div className="text-xs uppercase font-black text-[var(--color-accent)]/70">Rekord</div>
                        <div className="text-2xl font-black text-[var(--color-accent)]">{p.longestStreak}</div>
                    </div>
                </div>
            </div>

            {/* Analiza Chemia/Rywalizacja */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Najlepszy Partner"
                    icon={<UserPlus className="text-[var(--color-success)]" />}
                    name={bestPartner?.name}
                    sub={`${Math.round(bestPartner?.winrate * 100)}% zwycięstw`}
                />
                <StatCard
                    title="Trudny Partner"
                    icon={<UserMinus className="text-[var(--color-danger)]" />}
                    name={worstPartner?.name}
                    sub={`${Math.round(worstPartner?.winrate * 100)}% zwycięstw`}
                />
                <StatCard
                    title="Największy Rywal"
                    icon={<Medal className="text-purple-500" />}
                    name={toughestOpponent?.name}
                    sub={`Wygrywasz tylko ${Math.round(toughestOpponent?.winrate * 100)}% razy`}
                />
            </div>
        </div>
    )
}

function StatCard({ title, name, sub, icon }: { title: string, name?: string, sub: string, icon: React.ReactNode }) {
    return (
        <Card className="p-4 border-dashed">
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="text-[10px] uppercase font-black text-[var(--color-muted)] tracking-widest">{title}</span>
            </div>
            <div className="text-lg font-bold">{name || 'Brak danych'}</div>
            <div className="text-xs text-[var(--color-muted)] font-mono">{sub}</div>
        </Card>
    )
}