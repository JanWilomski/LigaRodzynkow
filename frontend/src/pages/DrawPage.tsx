import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useNavigate } from 'react-router-dom'
import { Activity, Dices, Save, UserCheck, RefreshCw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawnTeams {
    teamA: string[]
    teamB: string[]
}

export default function DrawPage() {
    const { show } = useToast()
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    const [startingTeam, setStartingTeam] = useState<'A' | 'B' | null>(null);

    // Pobieramy graczy
    const { data: players } = useQuery({
        queryKey: ['players'],
        queryFn: api.getPlayers,
    })

    // Pobieramy 5 ostatnich meczów do sprawdzenia powtórek
    const { data: recentGames } = useQuery({
        queryKey: ['games', 5],
        queryFn: () => api.getGames(5),
    })

    // Stan wyboru graczy i losowania
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [drawnTeams, setDrawnTeams] = useState<DrawnTeams | null>(null)

    // Stan wyniku
    const [scoreA, setScoreA] = useState<number | ''>('')
    const [scoreB, setScoreB] = useState<number | ''>('')

    // Mutacja do zapisu meczu
    const createMutation = useMutation({
        mutationFn: api.createGame,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] })
            queryClient.invalidateQueries({ queryKey: ['standings'] })
            queryClient.invalidateQueries({ queryKey: ['standings-duos'] })
            show({ title: 'Mecz zapisany!', variant: 'success' })
            setScoreA('')
            setScoreB('')
        },
        onError: (err: Error) => {
            show({ title: 'Błąd zapisu', description: err.message, variant: 'error' })
        },
    })

    const handleTogglePlayer = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        )
    }

    const handleDraw = () => {
        if (selectedIds.length < 2) return

        const shuffled = [...selectedIds].sort(() => Math.random() - 0.5)
        const mid = Math.ceil(shuffled.length / 2)

        setDrawnTeams({
            teamA: shuffled.slice(0, mid),
            teamB: shuffled.slice(mid),
        })
        setScoreA('')
        setScoreB('')

        const randomStart = Math.random() < 0.5 ? 'A' : 'B';
        setStartingTeam(randomStart);
    }

    const handleSaveMatch = () => {
        if (!drawnTeams || scoreA === '' || scoreB === '') return
        if (scoreA === scoreB) {
            show({ title: 'Remis?', description: 'W siatkówce nie ma remisów!', variant: 'error' })
            return
        }

        createMutation.mutate({
            teamAScore: Number(scoreA),
            teamBScore: Number(scoreB),
            teamAPlayerIds: drawnTeams.teamA,
            teamBPlayerIds: drawnTeams.teamB,
        })
    }

    // LOGIKA SPRAWDZANIA POWTÓREK
    const hasPlayedRecently = useMemo(() => {
        if (!drawnTeams || !recentGames) return false;

        // Sortujemy ID graczy i łączymy w stringa, aby łatwo porównać "zestawy" osób
        const drawnSetA = [...drawnTeams.teamA].sort().join(',');
        const drawnSetB = [...drawnTeams.teamB].sort().join(',');

        return recentGames.some(game => {
            const gameSetA = game.teamA.map(p => p.id).sort().join(',');
            const gameSetB = game.teamB.map(p => p.id).sort().join(',');

            // Sprawdzamy czy drużyny są identyczne (A vs A i B vs B) 
            // LUB czy są zamienione stronami (A vs B i B vs A)
            return (drawnSetA === gameSetA && drawnSetB === gameSetB) ||
                (drawnSetA === gameSetB && drawnSetB === gameSetA);
        });
    }, [drawnTeams, recentGames]);

    const canSave = drawnTeams && scoreA !== '' && scoreB !== '' && scoreA !== scoreB

    return (
        <div className="space-y-6 animate-fade-in">
            {/* KROK 1: Wybór obecnych osób */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <UserCheck className="size-4 text-[var(--color-accent)]" />
                        Kto dzisiaj gra?
                    </h2>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">Zaznacz osoby obecne na boisku.</p>
                </div>
                <div className="p-6">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {players?.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => handleTogglePlayer(p.id)}
                                className={cn(
                                    "px-4 py-2 rounded-full text-xs font-medium border transition-all",
                                    selectedIds.includes(p.id)
                                        ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-md scale-105"
                                        : "bg-[var(--color-surface-elevated)] border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-border-strong)]"
                                )}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                    <Button
                        onClick={handleDraw}
                        disabled={selectedIds.length < 2}
                        className="w-full mt-6 gap-2"
                    >
                        <Dices className="size-4" />
                        Losuj składy
                    </Button>
                </div>
            </div>

            {/* KROK 2: Wynik losowania i wpisywanie wyniku */}
            {drawnTeams && (
                <div className="rounded-lg border-2 border-[var(--color-accent)] bg-[var(--color-surface)] overflow-hidden animate-in zoom-in-95 duration-300">
                    <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center">
                        <h2 className="text-base font-semibold italic uppercase tracking-wider">Wylosowane składy</h2>
                        <Button variant="ghost" size="sm" onClick={handleDraw} className="h-8 gap-2 text-[var(--color-muted)]">
                            <RefreshCw className="size-3" /> Ponów losowanie
                        </Button>
                    </div>

                    <div className="p-6 space-y-6">
                        {startingTeam && (
                            <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] animate-in fade-in slide-in-from-top-2">
                                <span className="text-sm text-[var(--color-muted)] font-medium">Zaczyna:</span>
                                <span className={cn(
                                    "px-3 py-1 rounded text-xs font-black uppercase tracking-wider text-white shadow-sm",
                                    startingTeam === 'A' ? "bg-blue-500" : "bg-indigo-500" 
                                )}>
                                    Drużyna {startingTeam} 🏐
                                </span>
                            </div>
                        )}

                        {/* ALERT: Ostrzeżenie o powtórce */}
                        {hasPlayedRecently && (
                            <div className="flex items-start gap-3 p-4 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg animate-in slide-in-from-top-2">
                                <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold">Uwaga: Deja vu!</h4>
                                    <p className="text-xs mt-1">
                                        Dokładnie takie same składy grały już ze sobą w jednym z 5 ostatnich meczów.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                            {/* Team A */}
                            <div className="space-y-4 text-center">
                                <div className="text-xs font-black text-[var(--color-muted)] uppercase tracking-[0.2em]">Drużyna A</div>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {drawnTeams.teamA.map(id => (
                                        <span key={id} className="px-3 py-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm font-bold">
                      {players?.find(p => p.id === id)?.name}
                    </span>
                                    ))}
                                </div>
                                <Input
                                    type="number"
                                    placeholder="Punkty A"
                                    value={scoreA}
                                    onChange={(e) => setScoreA(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-24 text-center text-2xl font-black mx-auto h-14 border-2 focus:border-[var(--color-accent)]"
                                />
                            </div>

                            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-10 items-center justify-center rounded-full bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-subtle)] font-black italic shadow-sm">
                                VS
                            </div>

                            {/* Team B */}
                            <div className="space-y-4 text-center">
                                <div className="text-xs font-black text-[var(--color-muted)] uppercase tracking-[0.2em]">Drużyna B</div>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {drawnTeams.teamB.map(id => (
                                        <span key={id} className="px-3 py-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm font-bold">
                      {players?.find(p => p.id === id)?.name}
                    </span>
                                    ))}
                                </div>
                                <Input
                                    type="number"
                                    placeholder="Punkty B"
                                    value={scoreB}
                                    onChange={(e) => setScoreB(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-24 text-center text-2xl font-black mx-auto h-14 border-2 focus:border-[var(--color-accent)]"
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row gap-3">
                            {/* Przycisk przejścia do Tablicy na żywo */}
                            <Button
                                variant="secondary"
                                className="flex-1 h-12 gap-2 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
                                onClick={() => {
                                    // Nawigujemy do tablicy na żywo przekazując składy
                                    navigate('/live', { state: { teamAIds: drawnTeams.teamA, teamBIds: drawnTeams.teamB, startingTeam: startingTeam } })
                                }}
                            >
                                <Activity className="size-5" /> Sędziuj na żywo
                            </Button>

                            <Button
                                onClick={handleSaveMatch}
                                disabled={!canSave || createMutation.isPending}
                                className="flex-1 h-12 gap-2"
                            >
                                <Save className="size-5" />
                                Zapisz ręcznie z palca
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}