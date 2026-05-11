import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Medal, Flame, Zap, UserMinus, UserPlus, History } from 'lucide-react'
import { formatPercent, formatRelativeTime, cn } from '@/lib/utils'

export function PlayerProfilePage() {
    const { id } = useParams()
    const { data: p, isLoading } = useQuery({
        queryKey: ['player-profile', id],
        queryFn: () => api.getPlayerProfile(id!),
    })

    if (isLoading || !p) return <div className="p-8 text-center text-[var(--color-muted)] font-mono">Wczytywanie profilu...</div>

    // Sortowanie dla "Najlepszy/Najgorszy" partner i rywal
    const bestPartner = [...p.partners].sort((a, b) => b.winrate - a.winrate || b.gamesTogether - a.gamesTogether)[0]
    const worstPartner = [...p.partners].sort((a, b) => a.winrate - b.winrate || b.gamesTogether - a.gamesTogether)[0]
    const toughestOpponent = [...p.opponents].sort((a, b) => a.winrate - b.winrate)[0]

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Hero Section */}
            <div className="flex flex-col md:flex-row gap-6 items-center bg-[var(--color-surface)] p-8 rounded-xl border border-[var(--color-border)] shadow-sm">
                <Avatar name={p.name} size="lg" className="size-24 text-2xl" />
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-3xl font-black tracking-tight leading-none">{p.name}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                        <div className="text-sm font-mono text-[var(--color-muted)]">
                            WINRATE: <span className="text-[var(--color-accent)] font-bold">{formatPercent(p.winrate)}</span>
                        </div>
                        <div className="text-sm font-mono text-[var(--color-muted)]">
                            MECZE: <span className="text-[var(--color-foreground)] font-bold">{p.gamesPlayed}</span>
                        </div>
                    </div>
                </div>

                {/* Serie zwycięstw */}
                <div className="flex gap-3">
                    <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg text-center min-w-[100px]">
                        <Flame className="size-5 text-orange-500 mx-auto mb-1" />
                        <div className="text-[10px] uppercase font-black text-orange-500/70 tracking-widest">Seria</div>
                        <div className="text-2xl font-black text-orange-500">{p.currentStreak}</div>
                    </div>
                    <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 p-4 rounded-lg text-center min-w-[100px]">
                        <Zap className="size-5 text-[var(--color-accent)] mx-auto mb-1" />
                        <div className="text-[10px] uppercase font-black text-[var(--color-accent)]/70 tracking-widest">Rekord</div>
                        <div className="text-2xl font-black text-[var(--color-accent)]">{p.longestStreak}</div>
                    </div>
                </div>
            </div>

            {/* Grid statystyk dodatkowych */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Najlepszy Partner"
                    icon={<UserPlus className="text-[var(--color-success)] size-4" />}
                    name={bestPartner?.name}
                    sub={`${Math.round((bestPartner?.winrate || 0) * 100)}% zwycięstw`}
                />
                <StatCard
                    title="Trudny Partner"
                    icon={<UserMinus className="text-[var(--color-danger)] size-4" />}
                    name={worstPartner?.name}
                    sub={`${Math.round((worstPartner?.winrate || 0) * 100)}% zwycięstw`}
                />
                <StatCard
                    title="Największy Rywal"
                    icon={<Medal className="text-purple-500 size-4" />}
                    name={toughestOpponent?.name}
                    sub={`Wygrywasz tylko ${Math.round((toughestOpponent?.winrate || 0) * 100)}% razy`}
                />
            </div>

            {/* Sekcja: Historia meczów na profilu */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="size-4 text-[var(--color-accent)]" />
                        Ostatnie sety zawodnika
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-[var(--color-border)]">
                        {p.recentGames && p.recentGames.length > 0 ? (
                            p.recentGames.map(game => (
                                <div key={game.id} className="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-surface-elevated)] transition-colors">
                                    <div className="flex items-center gap-6">
                                        <div className="text-lg font-black tabular min-w-[80px]">
                                            <span className={cn(game.teamAScore > game.teamBScore ? "text-[var(--color-success)]" : "text-[var(--color-muted)]")}>{game.teamAScore}</span>
                                            <span className="mx-1 text-[var(--color-subtle)]">:</span>
                                            <span className={cn(game.teamBScore > game.teamAScore ? "text-[var(--color-success)]" : "text-[var(--color-muted)]")}>{game.teamBScore}</span>
                                        </div>
                                        <div className="text-xs text-[var(--color-muted)] font-mono">
                                            {formatRelativeTime(game.playedAt)}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-[var(--color-subtle)] uppercase font-black tracking-widest">
                                        {game.teamA.some(x => x.id === p.id) ? "Drużyna A" : "Drużyna B"}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center text-sm text-[var(--color-muted)] font-mono">
                                Brak zarejestrowanych meczów dla tego zawodnika.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function StatCard({ title, name, sub, icon }: { title: string, name?: string, sub: string, icon: React.ReactNode }) {
    return (
        <Card className="p-5 border-dashed bg-transparent border-[var(--color-border)]">
            <div className="flex items-center gap-3 mb-3">
                {icon}
                <span className="text-[10px] uppercase font-black text-[var(--color-muted)] tracking-widest">{title}</span>
            </div>
            <div className="text-lg font-bold truncate">{name || 'Brak danych'}</div>
            <div className="text-xs text-[var(--color-muted)] font-mono mt-1">{sub}</div>
        </Card>
    )
}