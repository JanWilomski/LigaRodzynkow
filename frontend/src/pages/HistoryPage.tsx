import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, Link } from 'react-router-dom' // Dodano useLocation i Link
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { Plus, Trash2, History as HistoryIcon } from 'lucide-react'
import { formatRelativeTime, cn } from '@/lib/utils'

export function HistoryPage() {
    const { show } = useToast()
    const queryClient = useQueryClient()
    const location = useLocation() // Pobieramy stan nawigacji

    const { data: games, isLoading } = useQuery({
        queryKey: ['games', 50],
        queryFn: () => api.getGames(50),
    })

    const { data: players } = useQuery({
        queryKey: ['players'],
        queryFn: api.getPlayers,
    })

    const [teamAScore, setTeamAScore] = useState<number | ''>('')
    const [teamBScore, setTeamBScore] = useState<number | ''>('')
    const [teamAIds, setTeamAIds] = useState<string[]>([])
    const [teamBIds, setTeamBIds] = useState<string[]>([])

    // EFEKT: Odbieranie wylosowanych składów z DrawPage
    useEffect(() => {
        const state = location.state as { teamAIds?: string[], teamBIds?: string[] } | null;

        if (state?.teamAIds && state?.teamBIds) {
            setTeamAIds(state.teamAIds);
            setTeamBIds(state.teamBIds);

            show({
                title: 'Składy wczytane',
                description: 'Wylosowane drużyny zostały uzupełnione w formularzu.',
                variant: 'success'
            });

            // Czyścimy stan, żeby po odświeżeniu nie pokazywało komunikatu ponownie
            window.history.replaceState({}, document.title);
        }
    }, [location.state, show]);

    const createMutation = useMutation({
        mutationFn: api.createGame,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] })
            queryClient.invalidateQueries({ queryKey: ['standings'] })
            queryClient.invalidateQueries({ queryKey: ['standings-duos'] })
            setTeamAScore('')
            setTeamBScore('')
            setTeamAIds([])
            setTeamBIds([])
            show({ title: 'Mecz został zapisany', variant: 'success' })
        },
        onError: (err: Error) => {
            show({ title: 'Błąd walidacji', description: err.message, variant: 'error' })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: api.deleteGame,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] })
            queryClient.invalidateQueries({ queryKey: ['standings'] })
            show({ title: 'Usunięto mecz', variant: 'success' })
        },
        onError: (err: Error) => {
            show({ title: 'Nie udało się usunąć', description: err.message, variant: 'error' })
        }
    })

    const canSubmit =
        typeof teamAScore === 'number' &&
        typeof teamBScore === 'number' &&
        teamAScore >= 0 &&
        teamBScore >= 0 &&
        teamAScore !== teamBScore &&
        teamAIds.length > 0 &&
        teamBIds.length > 0

    const needsPlayers = !players || players.length < 2

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit) return
        createMutation.mutate({
            teamAScore: Number(teamAScore),
            teamBScore: Number(teamBScore),
            teamAPlayerIds: teamAIds,
            teamBPlayerIds: teamBIds,
        })
    }

    const toggleTeamA = (id: string) => {
        setTeamAIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
        setTeamBIds((prev) => prev.filter((i) => i !== id))
    }

    const toggleTeamB = (id: string) => {
        setTeamBIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
        setTeamAIds((prev) => prev.filter((i) => i !== id))
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Dodawanie meczu */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)]">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <Plus className="size-4 text-[var(--color-accent)]" />
                        Zarejestruj wynik seta
                    </h2>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                        Wprowadź punkty i przypisz zawodników do drużyn.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {needsPlayers ? (
                        <p className="text-sm text-[var(--color-muted)] text-center py-2">
                            Potrzebujesz co najmniej 2 zawodników w bazie żeby dodać set.
                        </p>
                    ) : (
                        <div className="space-y-6">
                            {/* Wyniki */}
                            <div className="flex items-center justify-center gap-6">
                                <div className="text-center">
                                    <label className="text-xs font-semibold text-[var(--color-muted)] uppercase mb-2 block tracking-wider">
                                        Punkty Drużyny A
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={teamAScore}
                                        onChange={(e) => setTeamAScore(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-24 text-center text-xl font-bold mx-auto"
                                    />
                                </div>
                                <div className="text-2xl font-black text-[var(--color-subtle)] pt-6">:</div>
                                <div className="text-center">
                                    <label className="text-xs font-semibold text-[var(--color-muted)] uppercase mb-2 block tracking-wider">
                                        Punkty Drużyny B
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={teamBScore}
                                        onChange={(e) => setTeamBScore(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-24 text-center text-xl font-bold mx-auto"
                                    />
                                </div>
                            </div>

                            {/* Wybór składów */}
                            <div>
                                <label className="text-xs font-semibold text-[var(--color-muted)] uppercase mb-3 block tracking-wider text-center">
                                    Przypisz zawodników do drużyn
                                </label>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {players?.map((p) => {
                                        const inA = teamAIds.includes(p.id)
                                        const inB = teamBIds.includes(p.id)
                                        return (
                                            <div
                                                key={p.id}
                                                className="flex rounded-md overflow-hidden border border-[var(--color-border)] shadow-sm"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => toggleTeamA(p.id)}
                                                    className={cn(
                                                        'px-3 py-1.5 text-xs font-bold transition-colors',
                                                        inA ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)]'
                                                    )}
                                                >
                                                    A
                                                </button>
                                                <div className="px-3 py-1.5 text-xs font-medium border-x border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex items-center">
                                                    {p.name}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleTeamB(p.id)}
                                                    className={cn(
                                                        'px-3 py-1.5 text-xs font-bold transition-colors',
                                                        inB ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)]'
                                                    )}
                                                >
                                                    B
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 border-t border-[var(--color-border)]">
                                <Button type="submit" disabled={!canSubmit || createMutation.isPending}>
                                    {createMutation.isPending ? 'Zapisywanie...' : 'Zapisz wynik seta'}
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {/* Historia meczów */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)]">
                    <h2 className="text-base font-semibold">Ostatnie sety</h2>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">Pokazane do 50 ostatnich</p>
                </div>

                {isLoading ? (
                    <div className="p-4 space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-16 rounded skeleton" />
                        ))}
                    </div>
                ) : !games || games.length === 0 ? (
                    <div className="py-16 text-center">
                        <HistoryIcon className="mx-auto size-12 text-[var(--color-subtle)] mb-4" />
                        <p className="text-sm text-[var(--color-muted)]">Brak rozegranych setów. Dodaj pierwszy powyżej.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--color-border)]">
                        {games.map((game) => (
                            <GameRow
                                key={game.id}
                                game={game}
                                onDelete={() => {
                                    if (confirm('Usunąć bezpowrotnie ten set?')) {
                                        deleteMutation.mutate(game.id)
                                    }
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

interface GameRowProps {
    game: NonNullable<ReturnType<typeof useGamesData>>[number]
    onDelete: () => void
}

function GameRow({ game, onDelete }: GameRowProps) {
    const teamAWon = game.teamAScore > game.teamBScore
    const teamBWon = game.teamBScore > game.teamAScore

    return (
        <div className="group flex items-center gap-4 px-6 py-4 hover:bg-[var(--color-surface-elevated)] transition-colors">
            {/* Team A */}
            <div className="flex-1 flex flex-col items-start min-w-0">
                <div className={cn("text-2xl font-black tabular mb-1", teamAWon ? "text-[var(--color-success)]" : "text-[var(--color-muted)]")}>
                    {game.teamAScore}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {game.teamA.map(p => (
                        <Link
                            key={p.id}
                            to={`/players/${p.id}`}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
                        >
                            {p.name}
                        </Link>
                    ))}
                </div>
            </div>

            {/* VS Badge */}
            <div className="shrink-0 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-[var(--color-background)] text-[var(--color-subtle)] border border-[var(--color-border)]">
                vs
            </div>

            {/* Team B */}
            <div className="flex-1 flex flex-col items-end min-w-0">
                <div className={cn("text-2xl font-black tabular mb-1", teamBWon ? "text-[var(--color-success)]" : "text-[var(--color-muted)]")}>
                    {game.teamBScore}
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                    {game.teamB.map(p => (
                        <Link
                            key={p.id}
                            to={`/players/${p.id}`}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
                        >
                            {p.name}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Akcje i Data */}
            <div className="shrink-0 flex items-center gap-3 pl-4 border-l border-[var(--color-border)]">
                <div className="text-xs text-[var(--color-muted)] tabular min-w-[7ch] text-right">
                    {formatRelativeTime(game.playedAt)}
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDelete}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-danger)]"
                >
                    <Trash2 className="size-4" />
                </Button>
            </div>
        </div>
    )
}

function useGamesData() {
    const { data } = useQuery({ queryKey: ['games', 50], queryFn: () => api.getGames(50) })
    return data
}