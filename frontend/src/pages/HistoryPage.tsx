import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { Plus, Trash2, History as HistoryIcon, Edit2, X } from 'lucide-react'
import { formatRelativeTime, cn } from '@/lib/utils'

export function HistoryPage() {
    const { show } = useToast()
    const queryClient = useQueryClient()
    const location = useLocation()

    const { data: games, isLoading } = useQuery({
        queryKey: ['games', 50],
        queryFn: () => api.getGames(50),
    })

    const { data: players } = useQuery({
        queryKey: ['players'],
        queryFn: api.getPlayers,
    })

    // Stany formularza
    const [teamAScore, setTeamAScore] = useState<number | ''>('')
    const [teamBScore, setTeamBScore] = useState<number | ''>('')
    const [teamAIds, setTeamAIds] = useState<string[]>([])
    const [teamBIds, setTeamBIds] = useState<string[]>([])
    const [editingGameId, setEditingGameId] = useState<string | null>(null) // NOWOŚĆ: Stan edycji

    useEffect(() => {
        const state = location.state as { teamAIds?: string[], teamBIds?: string[] } | null;
        if (state?.teamAIds && state?.teamBIds) {
            setTeamAIds(state.teamAIds);
            setTeamBIds(state.teamBIds);
            show({ title: 'Składy wczytane', variant: 'success' });
            window.history.replaceState({}, document.title);
        }
    }, [location.state, show]);

    const resetForm = () => {
        setTeamAScore('')
        setTeamBScore('')
        setTeamAIds([])
        setTeamBIds([])
        setEditingGameId(null)
    }

    const createMutation = useMutation({
        mutationFn: api.createGame,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] })
            queryClient.invalidateQueries({ queryKey: ['standings'] })
            queryClient.invalidateQueries({ queryKey: ['standings-duos'] })
            resetForm()
            show({ title: 'Mecz został zapisany', variant: 'success' })
        },
        onError: (err: Error) => show({ title: 'Błąd zapisu', description: err.message, variant: 'error' }),
    })

    const updateMutation = useMutation({
        mutationFn: api.updateGame,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] })
            queryClient.invalidateQueries({ queryKey: ['standings'] })
            queryClient.invalidateQueries({ queryKey: ['standings-duos'] })
            resetForm()
            show({ title: 'Mecz zaktualizowany', variant: 'success' })
        },
        onError: (err: Error) => show({ title: 'Błąd edycji', description: err.message, variant: 'error' }),
    })

    const deleteMutation = useMutation({
        mutationFn: api.deleteGame,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] })
            queryClient.invalidateQueries({ queryKey: ['standings'] })
            queryClient.invalidateQueries({ queryKey: ['standings-duos'] })
            show({ title: 'Usunięto mecz', variant: 'success' })
        },
    })

    const canSubmit =
        typeof teamAScore === 'number' && typeof teamBScore === 'number' &&
        teamAScore >= 0 && teamBScore >= 0 && teamAScore !== teamBScore &&
        teamAIds.length > 0 && teamBIds.length > 0

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit) return

        const payload = {
            teamAScore: Number(teamAScore),
            teamBScore: Number(teamBScore),
            teamAPlayerIds: teamAIds,
            teamBPlayerIds: teamBIds,
        }

        if (editingGameId) {
            updateMutation.mutate({ id: editingGameId, data: payload })
        } else {
            createMutation.mutate(payload)
        }
    }

    // Funkcja wczytująca mecz do edycji
    const handleEditGame = (game: NonNullable<ReturnType<typeof useGamesData>>[number]) => {
        setEditingGameId(game.id)
        setTeamAScore(game.teamAScore)
        setTeamBScore(game.teamBScore)
        setTeamAIds(game.teamA.map(p => p.id))
        setTeamBIds(game.teamB.map(p => p.id))
        window.scrollTo({ top: 0, behavior: 'smooth' })
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
            {/* Formularz meczu */}
            <div className={cn("rounded-lg border bg-[var(--color-surface)] overflow-hidden transition-colors", editingGameId ? "border-amber-500 shadow-md" : "border-[var(--color-border)]")}>
                <div className={cn("px-6 py-4 border-b flex justify-between items-center", editingGameId ? "bg-amber-50/50 border-amber-200" : "border-[var(--color-border)]")}>
                    <div>
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            {editingGameId ? <Edit2 className="size-4 text-amber-600" /> : <Plus className="size-4 text-[var(--color-accent)]" />}
                            {editingGameId ? 'Edytujesz zapisany mecz' : 'Zarejestruj wynik seta'}
                        </h2>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">
                            {editingGameId ? 'Popraw błędy i zapisz ponownie.' : 'Wprowadź punkty i przypisz zawodników do drużyn.'}
                        </p>
                    </div>
                    {editingGameId && (
                        <Button size="sm" onClick={resetForm} className="bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 shadow-none border-none">
                            <X className="size-4 mr-1" /> Anuluj
                        </Button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {(!players || players.length < 2) ? (
                        <p className="text-sm text-[var(--color-muted)] text-center py-2">Brak zawodników w bazie.</p>
                    ) : (
                        <div className="space-y-6">
                            {/* Wyniki */}
                            <div className="flex items-center justify-center gap-6">
                                <div className="text-center">
                                    <label className="text-xs font-semibold text-[var(--color-muted)] uppercase mb-2 block tracking-wider">Punkty Drużyny A</label>
                                    <Input type="number" min="0" value={teamAScore} onChange={(e) => setTeamAScore(e.target.value === '' ? '' : Number(e.target.value))} className="w-24 text-center text-xl font-bold mx-auto" />
                                </div>
                                <div className="text-2xl font-black text-[var(--color-subtle)] pt-6">:</div>
                                <div className="text-center">
                                    <label className="text-xs font-semibold text-[var(--color-muted)] uppercase mb-2 block tracking-wider">Punkty Drużyny B</label>
                                    <Input type="number" min="0" value={teamBScore} onChange={(e) => setTeamBScore(e.target.value === '' ? '' : Number(e.target.value))} className="w-24 text-center text-xl font-bold mx-auto" />
                                </div>
                            </div>

                            {/* Wybór składów */}
                            <div>
                                <label className="text-xs font-semibold text-[var(--color-muted)] uppercase mb-3 block tracking-wider text-center">Przydział graczy</label>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {players?.map((p) => {
                                        const inA = teamAIds.includes(p.id)
                                        const inB = teamBIds.includes(p.id)
                                        return (
                                            <div key={p.id} className="flex rounded-md overflow-hidden border border-[var(--color-border)] shadow-sm">
                                                <button type="button" onClick={() => toggleTeamA(p.id)} className={cn('px-3 py-1.5 text-xs font-bold transition-colors', inA ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)]')}>A</button>
                                                <div className="px-3 py-1.5 text-xs font-medium border-x border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex items-center">{p.name}</div>
                                                <button type="button" onClick={() => toggleTeamB(p.id)} className={cn('px-3 py-1.5 text-xs font-bold transition-colors', inB ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)]')}>B</button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 border-t border-[var(--color-border)]">
                                <Button type="submit" disabled={!canSubmit || createMutation.isPending || updateMutation.isPending} className={editingGameId ? "bg-amber-600 hover:bg-amber-700" : ""}>
                                    {(createMutation.isPending || updateMutation.isPending) ? 'Przetwarzanie...' : (editingGameId ? 'Aktualizuj wynik' : 'Zapisz wynik seta')}
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
                                onEdit={() => handleEditGame(game)}
                                onDelete={() => { if (confirm('Usunąć bezpowrotnie ten set?')) deleteMutation.mutate(game.id) }}
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
    onEdit: () => void
    onDelete: () => void
}

function GameRow({ game, onEdit, onDelete }: GameRowProps) {
    const teamAWon = game.teamAScore > game.teamBScore
    const teamBWon = game.teamBScore > game.teamAScore

    return (
        <div className="group flex items-center gap-4 px-6 py-4 hover:bg-[var(--color-surface-elevated)] transition-colors">
            <div className="flex-1 flex flex-col items-start min-w-0">
                <div className={cn("text-2xl font-black tabular mb-1", teamAWon ? "text-[var(--color-success)]" : "text-[var(--color-muted)]")}>{game.teamAScore}</div>
                <div className="flex flex-wrap gap-1.5">
                    {game.teamA.map(p => (
                        <Link key={p.id} to={`/players/${p.id}`} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)]">{p.name}</Link>
                    ))}
                </div>
            </div>

            <div className="shrink-0 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-[var(--color-background)] text-[var(--color-subtle)] border border-[var(--color-border)]">vs</div>

            <div className="flex-1 flex flex-col items-end min-w-0">
                <div className={cn("text-2xl font-black tabular mb-1", teamBWon ? "text-[var(--color-success)]" : "text-[var(--color-muted)]")}>{game.teamBScore}</div>
                <div className="flex flex-wrap justify-end gap-1.5">
                    {game.teamB.map(p => (
                        <Link key={p.id} to={`/players/${p.id}`} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)]">{p.name}</Link>
                    ))}
                </div>
            </div>

            <div className="shrink-0 flex items-center gap-1 pl-4 border-l border-[var(--color-border)]">
                <div className="text-xs text-[var(--color-muted)] tabular min-w-[7ch] text-right mr-1 sm:mr-2">
                    {formatRelativeTime(game.playedAt)}
                </div>

                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onEdit}
                    className="opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity text-amber-600 bg-amber-100/50 md:bg-transparent hover:bg-amber-100 h-8 w-8 p-0"
                >
                    <Edit2 className="size-4" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDelete}
                    className="opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-danger)] bg-red-100/50 md:bg-transparent hover:bg-red-100 h-8 w-8 p-0"
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