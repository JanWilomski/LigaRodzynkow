import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import {Minus, Save, RotateCcw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LiveScorePage() {
    const location = useLocation()
    const navigate = useNavigate()
    const { show } = useToast()
    const queryClient = useQueryClient()

    const { data: players } = useQuery({ queryKey: ['players'], queryFn: api.getPlayers })

    // Stan z routera (z DrawPage)
    const [teamAIds, setTeamAIds] = useState<string[]>([])
    const [teamBIds, setTeamBIds] = useState<string[]>([])

    // Stan meczu
    const [scoreA, setScoreA] = useState(0)
    const [scoreB, setScoreB] = useState(0)
    const [targetScore, setTargetScore] = useState(25) // Domyślnie gramy do 25

    useEffect(() => {
        const state = location.state as { teamAIds?: string[], teamBIds?: string[] } | null
        if (state?.teamAIds && state?.teamBIds) {
            setTeamAIds(state.teamAIds)
            setTeamBIds(state.teamBIds)
        }
    }, [location.state])

    const createMutation = useMutation({
        mutationFn: api.createGame,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] })
            queryClient.invalidateQueries({ queryKey: ['standings'] })
            show({ title: 'Mecz zapisany!', variant: 'success' })
            // Po zapisaniu czyścimy i wracamy do rankingu lub historii
            setScoreA(0)
            setScoreB(0)
            navigate('/history')
        },
        onError: (err: Error) => show({ title: 'Błąd', description: err.message, variant: 'error' }),
    })

    // Logika wygranej w siatkówce (wymagane min. targetScore punktów ORAZ 2 punkty przewagi)
    const isFinished = (scoreA >= targetScore || scoreB >= targetScore) && Math.abs(scoreA - scoreB) >= 2
    const winner = isFinished ? (scoreA > scoreB ? 'A' : 'B') : null

    const handleSave = () => {
        if (!isFinished) {
            if (!confirm("Mecz jeszcze się nie skończył (brak przewagi lub limitu). Na pewno chcesz zapisać?")) return;
        }
        createMutation.mutate({
            teamAScore: scoreA,
            teamBScore: scoreB,
            teamAPlayerIds: teamAIds,
            teamBPlayerIds: teamBIds,
        })
    }

    if (teamAIds.length === 0 || teamBIds.length === 0) {
        return (
            <div className="py-20 text-center animate-fade-in">
                <AlertCircle className="size-16 text-[var(--color-muted)] mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Brak wczytanych składów</h2>
                <p className="text-[var(--color-muted)] mb-6">Przejdź do zakładki Losowanie, aby wylosować drużyny i rozpocząć sędziowanie.</p>
                <Button onClick={() => navigate('/draw')}>Przejdź do losowania</Button>
            </div>
        )
    }

    return (
        <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
            {/* Ustawienia meczu */}
            <div className="flex justify-between items-center bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)]">
                <div className="text-sm font-bold text-[var(--color-muted)] uppercase">Tablica Wyników</div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[var(--color-muted)] uppercase">Gramy do:</span>
                    <Input
                        type="number"
                        value={targetScore}
                        onChange={e => setTargetScore(Number(e.target.value))}
                        className="w-16 h-8 text-center font-bold"
                    />
                </div>
            </div>

            {/* GŁÓWNA TABLICA */}
            <div className="grid grid-cols-2 gap-4">
                {/* Drużyna A */}
                <div className={cn("relative flex flex-col rounded-2xl border-2 overflow-hidden transition-colors", winner === 'A' ? "border-[var(--color-success)] bg-[var(--color-success)]/5" : "border-[var(--color-border)] bg-[var(--color-surface)]")}>
                    <div className="p-4 text-center border-b border-[var(--color-border)]/50">
                        <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-muted)] mb-2">Drużyna A</h3>
                        <div className="flex flex-wrap justify-center gap-1">
                            {teamAIds.map(id => (
                                <span key={id} className="text-[10px] bg-[var(--color-background)] px-2 py-0.5 rounded border border-[var(--color-border)] truncate max-w-full">
                                    {players?.find(p => p.id === id)?.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Główny przycisk +1 */}
                    <button
                        onClick={() => !isFinished && setScoreA(s => s + 1)}
                        disabled={isFinished}
                        className="flex-1 min-h-[200px] flex items-center justify-center hover:bg-[var(--color-surface-elevated)] active:bg-[var(--color-border)] transition-colors disabled:opacity-50"
                    >
                        <span className="text-8xl md:text-9xl font-black tabular-nums tracking-tighter">{scoreA}</span>
                    </button>

                    <div className="p-2 border-t border-[var(--color-border)]/50">
                        <Button variant="ghost" className="w-full text-[var(--color-muted)] hover:text-red-500" onClick={() => setScoreA(s => Math.max(0, s - 1))} disabled={isFinished || scoreA === 0}>
                            <Minus className="size-4 mr-1" /> Cofnij punkt
                        </Button>
                    </div>
                </div>

                {/* Drużyna B */}
                <div className={cn("relative flex flex-col rounded-2xl border-2 overflow-hidden transition-colors", winner === 'B' ? "border-[var(--color-success)] bg-[var(--color-success)]/5" : "border-[var(--color-border)] bg-[var(--color-surface)]")}>
                    <div className="p-4 text-center border-b border-[var(--color-border)]/50">
                        <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-muted)] mb-2">Drużyna B</h3>
                        <div className="flex flex-wrap justify-center gap-1">
                            {teamBIds.map(id => (
                                <span key={id} className="text-[10px] bg-[var(--color-background)] px-2 py-0.5 rounded border border-[var(--color-border)] truncate max-w-full">
                                    {players?.find(p => p.id === id)?.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Główny przycisk +1 */}
                    <button
                        onClick={() => !isFinished && setScoreB(s => s + 1)}
                        disabled={isFinished}
                        className="flex-1 min-h-[200px] flex items-center justify-center hover:bg-[var(--color-surface-elevated)] active:bg-[var(--color-border)] transition-colors disabled:opacity-50"
                    >
                        <span className="text-8xl md:text-9xl font-black tabular-nums tracking-tighter">{scoreB}</span>
                    </button>

                    <div className="p-2 border-t border-[var(--color-border)]/50">
                        <Button variant="ghost" className="w-full text-[var(--color-muted)] hover:text-red-500" onClick={() => setScoreB(s => Math.max(0, s - 1))} disabled={isFinished || scoreB === 0}>
                            <Minus className="size-4 mr-1" /> Cofnij punkt
                        </Button>
                    </div>
                </div>
            </div>

            {/* Panel zapisu (pojawia się gdy jest zwycięzca) */}
            {isFinished && (
                <div className="bg-[var(--color-surface)] border-2 border-[var(--color-accent)] p-6 rounded-xl text-center animate-in slide-in-from-bottom-4 zoom-in-95">
                    <h2 className="text-2xl font-black text-[var(--color-accent)] mb-2">Mecz zakończony!</h2>
                    <p className="text-[var(--color-muted)] mb-6">Drużyna {winner} wygrywa {scoreA} : {scoreB}.</p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button variant="secondary" onClick={() => { setScoreA(0); setScoreB(0); }}>
                            <RotateCcw className="size-4 mr-2" /> Grajcie jeszcze raz
                        </Button>
                        <Button onClick={handleSave} disabled={createMutation.isPending} className="bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 text-white font-bold">
                            <Save className="size-5 mr-2" />
                            {createMutation.isPending ? 'Zapisywanie...' : 'Zapisz wynik w historii'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}