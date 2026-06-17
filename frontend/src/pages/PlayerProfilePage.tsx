import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, Game, GamePlayer } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Medal, Flame, Zap, UserMinus, UserPlus, History, Target, TrendingUp } from 'lucide-react'
import { formatPercent, formatRelativeTime, cn } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function PlayerProfilePage() {
    const { id } = useParams()
    const { data: p, isLoading } = useQuery({
        queryKey: ['player-profile', id],
        queryFn: () => api.getPlayerProfile(id!),
    })

    if (isLoading || !p) return <div className="p-8 text-center text-[var(--color-muted)] font-mono">Wczytywanie profilu...</div>

    // Obliczanie statystyk relacji
    const bestPartner = [...p.partners].sort((a, b) => b.winrate - a.winrate || b.gamesTogether - a.gamesTogether)[0]
    const worstPartner = [...p.partners].sort((a, b) => a.winrate - b.winrate || b.gamesTogether - a.gamesTogether)[0]

    // Najtrudniejszy przeciwnik (najniższy winrate gracza przeciwko niemu)
    const toughestOpponent = [...p.opponents].sort((a, b) => a.winrate - b.winrate || b.gamesTogether - a.gamesTogether)[0]

    // Najłatwiejszy przeciwnik (najwyższy winrate gracza przeciwko niemu)
    const easiestOpponent = [...p.opponents].sort((a, b) => b.winrate - a.winrate || b.gamesTogether - a.gamesTogether)[0]

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Hero Section */}
            <div className="flex flex-col md:flex-row gap-6 items-center bg-[var(--color-surface)] p-8 rounded-xl border border-[var(--color-border)] shadow-sm">
                <Avatar name={p.name} size="lg" className="size-24 text-2xl shrink-0" />
                <div className="text-center md:text-left flex-1 min-w-0">
                    <h1 className="text-3xl font-black tracking-tight leading-none truncate">{p.name}</h1>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                        <div className="text-sm font-mono text-[var(--color-muted)]">
                            WINRATE: <span className="text-[var(--color-accent)] font-bold">{formatPercent(p.winrate)}</span>
                        </div>
                        <div className="text-sm font-mono text-[var(--color-muted)]">
                            MECZE: <span className="text-[var(--color-foreground)] font-bold">{p.gamesPlayed}</span>
                        </div>

                        {/* NOWOŚĆ: Bilans małych punktów */}
                        <div className="text-sm font-mono flex items-center gap-1.5 border-l border-[var(--color-border)] pl-4">
                            <span className="text-[var(--color-muted)]">PUNKTY:</span>
                            <span className="font-bold text-[var(--color-foreground)] tabular-nums">{p.pointsScored}:{p.pointsConceded}</span>
                            <span className={cn(
                                "text-xs font-black px-1.5 py-0.5 rounded ml-1",
                                (p.pointsScored - p.pointsConceded) > 0 ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" :
                                    (p.pointsScored - p.pointsConceded) < 0 ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]" :
                                        "bg-[var(--color-border)] text-[var(--color-muted)]"
                            )}>
                                {(p.pointsScored - p.pointsConceded) > 0 ? '+' : ''}{p.pointsScored - p.pointsConceded}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Serie zwycięstw */}
                <div className="flex gap-3 shrink-0">
                    <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg text-center min-w-[90px]">
                        <Flame className="size-5 text-orange-500 mx-auto mb-1" />
                        <div className="text-[10px] uppercase font-black text-orange-500/70 tracking-widest">Seria</div>
                        <div className="text-2xl font-black text-orange-500">{p.currentStreak}</div>
                    </div>
                    <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 p-4 rounded-lg text-center min-w-[90px]">
                        <Zap className="size-5 text-[var(--color-accent)] mx-auto mb-1" />
                        <div className="text-[10px] uppercase font-black text-[var(--color-accent)]/70 tracking-widest">Rekord</div>
                        <div className="text-2xl font-black text-[var(--color-accent)]">{p.longestStreak}</div>
                    </div>
                </div>
            </div>

            {/* Grid statystyk dodatkowych - Teraz 4 karty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <StatCard
                    title="Łatwy Cel"
                    icon={<Target className="text-amber-500 size-4" />}
                    name={easiestOpponent?.name}
                    sub={`Masz ${Math.round((easiestOpponent?.winrate || 0) * 100)}% zwycięstw`}
                />
            </div>
            {p.winrateHistory && p.winrateHistory.length > 0 && (
                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="size-4 text-[var(--color-accent)]" />
                            Historia Winrate
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] sm:h-[300px] pt-4 pb-2 px-2 sm:px-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={p.winrateHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                                <XAxis
                                    dataKey="gameNumber"
                                    stroke="var(--color-muted)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `#${val}`}
                                    minTickGap={20}
                                />
                                <YAxis
                                    stroke="var(--color-muted)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${Math.round(val * 100)}%`}
                                    domain={['auto', 'auto']}
                                    width={40}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        color: 'var(--color-foreground)'
                                    }}
                                    itemStyle={{ color: 'var(--color-accent)', fontWeight: 'bold' }}
                                    formatter={(value: any) => [`${(Number(value) * 100).toFixed(1)}%`, 'Winrate']}
                                    labelFormatter={(label) => `Mecz #${label}`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="winrate"
                                    stroke="var(--color-accent)"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 5, fill: 'var(--color-surface)', stroke: 'var(--color-accent)', strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Sekcja: Historia meczów (bez zmian) */}
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
                            p.recentGames.map((game: Game) => {
                                // 1. Sprawdzamy w której drużynie grał zawodnik
                                const isTeamA = game.teamA.some((x: GamePlayer) => x.id === p.id);
                                // 2. Sprawdzamy czy drużyna A wygrała
                                const teamAWon = game.teamAScore > game.teamBScore;
                                // 3. Logika wygranej zawodnika
                                const playerWon = isTeamA ? teamAWon : !teamAWon;

                                return (
                                    <div
                                        key={game.id}
                                        className={cn(
                                            "flex items-center justify-between px-6 py-4 transition-colors border-l-4",
                                            playerWon
                                                ? "bg-[var(--color-success)]/5 hover:bg-[var(--color-success)]/10 border-l-[var(--color-success)]/70"
                                                : "bg-[var(--color-danger)]/5 hover:bg-[var(--color-danger)]/10 border-l-[var(--color-danger)]/50"
                                        )}
                                    >
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
                                        <div className={cn(
                                            "text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-md",
                                            playerWon
                                                ? "text-[var(--color-success)] bg-[var(--color-success)]/10"
                                                : "text-[var(--color-danger)] bg-[var(--color-danger)]/10"
                                        )}>
                                            {playerWon ? "WYGRANA" : "PORAŻKA"}
                                            <span className="opacity-60 font-medium ml-1.5 hidden sm:inline">
                                                (Team {isTeamA ? "A" : "B"})
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="py-12 text-center text-sm text-[var(--color-muted)] font-mono">
                                Brak zarejestrowanych meczów.
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
        <Card className="p-5 border-dashed bg-transparent border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors">
            <div className="flex items-center gap-3 mb-3">
                {icon}
                <span className="text-[10px] uppercase font-black text-[var(--color-muted)] tracking-widest">{title}</span>
            </div>
            <div className="text-lg font-bold truncate">{name || 'Brak danych'}</div>
            <div className="text-xs text-[var(--color-muted)] font-mono mt-1">{sub}</div>
        </Card>
    )
}