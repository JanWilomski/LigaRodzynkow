import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { formatPercent, cn } from '@/lib/utils'
import { Trophy, TrendingUp, Activity, Medal } from 'lucide-react'

export function RankingPage() {
    const { data: standings, isLoading } = useQuery({
        queryKey: ['standings'],
        queryFn: api.getStandings,
    })

    const { data: games } = useQuery({
        queryKey: ['games', 100],
        queryFn: () => api.getGames(100),
    })

    const totalGames = games?.length ?? 0
    const leader = standings?.[0]
    const mostActive = standings?.slice().sort((a, b) => b.gamesPlayed - a.gamesPlayed)[0]

    if (isLoading) {
        return <RankingSkeleton />
    }

    if (!standings || standings.length === 0) {
        return <EmptyState />
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Top stats - hero section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StatHero
                    label="Lider"
                    icon={<Trophy className="size-4" />}
                    accent
                >
                    {leader && (
                        <div className="flex items-center gap-3">
                            <Avatar name={leader.playerName} size="lg" />
                            <div className="min-w-0">
                                <div className="text-2xl font-bold text-[var(--color-foreground)] truncate">
                                    {leader.playerName}
                                </div>
                                <div className="text-sm text-[var(--color-muted)] tabular">
                                    {formatPercent(leader.winrate)} · {leader.gamesWon}W
                                </div>
                            </div>
                        </div>
                    )}
                </StatHero>

                <StatHero
                    label="Najwięcej setów"
                    icon={<Activity className="size-4" />}
                >
                    {mostActive && (
                        <div className="flex items-center gap-3">
                            <Avatar name={mostActive.playerName} size="lg" />
                            <div className="min-w-0">
                                <div className="text-2xl font-bold text-[var(--color-foreground)] truncate">
                                    {mostActive.playerName}
                                </div>
                                <div className="text-sm text-[var(--color-muted)] tabular">
                                    {mostActive.gamesPlayed} rozegranych
                                </div>
                            </div>
                        </div>
                    )}
                </StatHero>

                <StatHero
                    label="Łącznie"
                    icon={<TrendingUp className="size-4" />}
                >
                    <div>
                        <div className="text-3xl font-bold text-[var(--color-foreground)] tabular">
                            {totalGames}
                        </div>
                        <div className="text-sm text-[var(--color-muted)]">
                            setów · {standings.length} zawodników
                        </div>
                    </div>
                </StatHero>
            </div>

            {/* Ranking table */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold">Klasyfikacja generalna</h2>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">
                            Sortowane po procencie wygranych setów
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-[var(--color-subtle)] border-b border-[var(--color-border)]">
                            <th className="text-left font-medium px-6 py-3 w-12">#</th>
                            <th className="text-left font-medium px-3 py-3">Zawodnik</th>
                            <th className="text-right font-medium px-3 py-3 w-20">Rozegrane</th>
                            <th className="text-right font-medium px-3 py-3 w-24">W—P</th>
                            <th className="text-right font-medium px-6 py-3 w-32">Winrate</th>
                        </tr>
                        </thead>
                        <tbody>
                        {standings.map((s) => (
                            <RankingRow key={s.playerId} standing={s} />
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function RankingRow({ standing }: { standing: NonNullable<ReturnType<typeof useStandings>>[number] }) {
    const isTop3 = standing.rank <= 3
    const medalColor =
        standing.rank === 1
            ? 'text-[var(--color-accent)]'
            : standing.rank === 2
                ? 'text-[oklch(0.75_0.02_240)]'
                : standing.rank === 3
                    ? 'text-[oklch(0.65_0.10_55)]'
                    : 'text-[var(--color-subtle)]'

    return (
        <tr className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-elevated)] transition-colors">
            <td className="px-6 py-4">
                <div className="flex items-center justify-center w-6">
                    {isTop3 ? (
                        <Medal className={cn('size-4', medalColor)} />
                    ) : (
                        <span className="text-sm font-mono text-[var(--color-subtle)] tabular">
              {standing.rank}
            </span>
                    )}
                </div>
            </td>
            <td className="px-3 py-4">
                <div className="flex items-center gap-3">
                    <Avatar name={standing.playerName} size="sm" />
                    <span className={cn('text-sm', isTop3 ? 'font-semibold' : 'font-medium')}>
            {standing.playerName}
          </span>
                </div>
            </td>
            <td className="px-3 py-4 text-right text-sm text-[var(--color-muted)] tabular">
                {standing.gamesPlayed}
            </td>
            <td className="px-3 py-4 text-right text-sm tabular">
                <span className="text-[var(--color-success)] font-medium">{standing.gamesWon}</span>
                <span className="text-[var(--color-subtle)] mx-1">—</span>
                <span className="text-[var(--color-muted)]">{standing.gamesLost}</span>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-3">
                    <WinrateBar value={standing.winrate} />
                    <span className="text-sm font-semibold tabular min-w-[3ch] text-right">
            {formatPercent(standing.winrate)}
          </span>
                </div>
            </td>
        </tr>
    )
}

function WinrateBar({ value }: { value: number }) {
    return (
        <div className="hidden sm:block w-16 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div
                className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500"
                style={{ width: `${value * 100}%` }}
            />
        </div>
    )
}

function StatHero({
                      label,
                      icon,
                      children,
                      accent,
                  }: {
    label: string
    icon: React.ReactNode
    children: React.ReactNode
    accent?: boolean
}) {
    return (
        <div
            className={cn(
                'relative rounded-lg border bg-[var(--color-surface)] p-5 overflow-hidden',
                accent ? 'border-[var(--color-accent-dim)]/40' : 'border-[var(--color-border)]',
            )}
        >
            {accent && (
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)]/[0.06] via-transparent to-transparent pointer-events-none" />
            )}
            <div className="relative">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--color-muted)] mb-3">
                    <span className={cn(accent && 'text-[var(--color-accent)]')}>{icon}</span>
                    {label}
                </div>
                {children}
            </div>
        </div>
    )
}

function RankingSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 rounded-lg skeleton" />
                ))}
            </div>
            <div className="h-96 rounded-lg skeleton" />
        </div>
    )
}

function EmptyState() {
    return (
        <div className="rounded-lg border border-dashed border-[var(--color-border-strong)] py-16 text-center">
            <Trophy className="mx-auto size-12 text-[var(--color-subtle)] mb-4" />
            <h3 className="text-lg font-semibold mb-1">Brak danych do rankingu</h3>
            <p className="text-sm text-[var(--color-muted)] max-w-sm mx-auto">
                Dodaj zawodników i pierwsze sety, żeby zobaczyć tabelę klasyfikacji.
            </p>
        </div>
    )
}

function useStandings() {
    const { data } = useQuery({ queryKey: ['standings'], queryFn: api.getStandings })
    return data
}