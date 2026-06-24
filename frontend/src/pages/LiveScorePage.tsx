import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { Plus, Minus, Save, RotateCcw, UserCheck, Edit2, Lock, Unlock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LiveScorePage() {
    const location = useLocation()
    const navigate = useNavigate()
    const { show } = useToast()
    const queryClient = useQueryClient()

    const { data: players } = useQuery({ queryKey: ['players'], queryFn: api.getPlayers })

    // Stany dla składów i trybu
    const [teamAIds, setTeamAIds] = useState<string[]>([])
    const [teamBIds, setTeamBIds] = useState<string[]>([])
    const [matchStarted, setMatchStarted] = useState(false)

    // Stan meczu
    const [scoreA, setScoreA] = useState(0)
    const [scoreB, setScoreB] = useState(0)
    const [targetScore, setTargetScore] = useState(25)

    // Odbieranie wylosowanych składów
    useEffect(() => {
        const state = location.state as { teamAIds?: string[], teamBIds?: string[] } | null
        if (state?.teamAIds && state?.teamBIds && state.teamAIds.length > 0 && state.teamBIds.length > 0) {
            setTeamAIds(state.teamAIds)
            setTeamBIds(state.teamBIds)
            setMatchStarted(true)
            window.history.replaceState({}, document.title)
        }
    }, [location.state])

    const createMutation = useMutation({
        mutationFn: api.createGame,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['games'] })
            queryClient.invalidateQueries({ queryKey: ['standings'] })
            queryClient.invalidateQueries({ queryKey: ['standings-duos'] })
            show({ title: 'Mecz zapisany!', variant: 'success' })

            setScoreA(0)
            setScoreB(0)
            setMatchStarted(false)
            setTeamAIds([])
            setTeamBIds([])
            navigate('/history')
        },
        onError: (err: Error) => show({ title: 'Błąd', description: err.message, variant: 'error' }),
    })

    const isFinished = (scoreA >= targetScore || scoreB >= targetScore) && Math.abs(scoreA - scoreB) >= 2
    const winner = isFinished ? (scoreA > scoreB ? 'A' : 'B') : null

    // --- LOGIKA BLOKADY EKRANU ---
    const [isLocked, setIsLocked] = useState(false)

    useEffect(() => {
        if (isFinished) setIsLocked(false)
    }, [isFinished])

    useEffect(() => {
        if (isLocked) {
            document.body.style.overflow = 'hidden'
            document.body.style.overscrollBehavior = 'none'

            const preventScroll = (e: TouchEvent) => {
                if ((e.target as HTMLElement).tagName !== 'INPUT') {
                    e.preventDefault()
                }
            }
            document.addEventListener('touchmove', preventScroll, { passive: false })

            return () => {
                document.body.style.overflow = ''
                document.body.style.overscrollBehavior = ''
                document.removeEventListener('touchmove', preventScroll)
            }
        }
    }, [isLocked])

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

    const toggleTeamA = (id: string) => {
        setTeamAIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
        setTeamBIds((prev) => prev.filter((i) => i !== id))
    }

    const toggleTeamB = (id: string) => {
        setTeamBIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
        setTeamAIds((prev) => prev.filter((i) => i !== id))
    }

    // --- OBSŁUGA PILOTA (PRZYCISKI GŁOŚNOŚCI + STRZAŁKI) ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isFinished) return;

            // Głośność w dół / Strzałka w lewo -> Punkty dla Drużyny A
            if (e.key === 'VolumeDown' || e.key === 'AudioVolumeDown' || e.key === 'ArrowLeft') {
                e.preventDefault(); // Próba zablokowania systemowego wyskakiwania paska głośności
                setScoreA(s => s + 1);
            } 
            
            // Głośność w górę / Strzałka w prawo -> Punkty dla Drużyny B
            else if (e.key === 'VolumeUp' || e.key === 'AudioVolumeUp' || e.key === 'ArrowRight') {
                e.preventDefault(); // Próba zablokowania systemowego wyskakiwania paska głośności
                setScoreB(s => s + 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });

        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
        };
    }, [isFinished]);


    // WIDOK 1: WYBÓR SKŁADÓW
    if (!matchStarted) {
        return (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <UserCheck className="size-4 text-[var(--color-accent)]" />
                            Kto gra w tym secie?
                        </h2>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">
                            Skonfiguruj składy ręcznie lub wróć do zakładki "Losowanie".
                        </p>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-wrap justify-center gap-2 mb-8">
                            {players?.map((p) => {
                                const inA = teamAIds.includes(p.id)
                                const inB = teamBIds.includes(p.id)
                                return (
                                    <div key={p.id} className="flex rounded-md overflow-hidden border border-[var(--color-border)] shadow-sm">
                                        <button onClick={() => toggleTeamA(p.id)} className={cn('px-3 py-2 text-xs font-bold transition-colors', inA ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)]')}>A</button>
                                        <div className="px-3 py-2 text-xs font-medium border-x border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex items-center">{p.name}</div>
                                        <button onClick={() => toggleTeamB(p.id)} className={cn('px-3 py-2 text-xs font-bold transition-colors', inB ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)]')}>B</button>
                                    </div>
                                )
                            })}
                        </div>
                        <Button
                            className="w-full h-12 text-base font-bold gap-2"
                            disabled={teamAIds.length === 0 || teamBIds.length === 0}
                            onClick={() => setMatchStarted(true)}
                        >
                            <Plus className="size-5" /> Rozpocznij sędziowanie
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // WIDOK 2: TABLICA WYNIKÓW
    return (
        <div className={cn(
            "flex flex-col gap-2 sm:gap-4 animate-fade-in max-w-3xl mx-auto",
            !isFinished && "h-[calc(100dvh-130px)] sm:h-auto min-h-[250px]"
        )}>
            <div className="flex flex-wrap gap-2 sm:gap-4 justify-between items-center bg-[var(--color-surface)] p-2 sm:p-4 rounded-lg border border-[var(--color-border)] shrink-0">
                <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-widest hidden sm:block">Live Score</div>
                    <Button variant="ghost" size="sm" onClick={() => setMatchStarted(false)} className="text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 h-8">
                        <Edit2 className="size-3 mr-2" /> Zmień składy
                    </Button>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onPointerDown={(e) => {
                            e.preventDefault();
                            setIsLocked(prev => !prev);
                        }}
                        title={isLocked ? "Odblokuj ekran" : "Zablokuj ekran"}
                        className={cn("h-8 w-8 p-0 transition-colors touch-none cursor-pointer", isLocked ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 hover:text-[var(--color-danger)]" : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]")}
                    >
                        {isLocked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                    </Button>
                    <span className="text-xs font-bold text-[var(--color-muted)] uppercase ml-1 sm:ml-2 hidden sm:inline">Gramy do:</span>
                    <Input
                        type="number"
                        value={targetScore}
                        onChange={e => setTargetScore(Number(e.target.value))}
                        disabled={isLocked}
                        className="w-14 sm:w-16 h-8 text-center font-bold"
                    />
                </div>
            </div>

            <div className={cn("grid grid-cols-2 gap-2 sm:gap-4", !isFinished && "flex-1 min-h-0")}>
                {/* Drużyna A */}
                <div className={cn("relative flex flex-col rounded-2xl border-2 overflow-hidden transition-colors", winner === 'A' ? "border-[var(--color-success)] bg-[var(--color-success)]/5" : "border-[var(--color-border)] bg-[var(--color-surface)]")}>
                    <div className="p-1 sm:p-4 text-center border-b border-[var(--color-border)]/50 shrink-0">
                        <h3 className="text-[10px] sm:text-sm font-black uppercase tracking-widest text-[var(--color-muted)] mb-1 sm:mb-2">Drużyna A</h3>
                        <div className="flex flex-wrap justify-center gap-1">
                            {teamAIds.map(id => (
                                <span key={id} className="text-[9px] sm:text-[10px] bg-[var(--color-background)] px-1.5 sm:px-2 py-0.5 rounded border border-[var(--color-border)] truncate max-w-full">
                                    {players?.find(p => p.id === id)?.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => !isFinished && setScoreA(s => s + 1)}
                        disabled={isFinished}
                        className={cn(
                            "flex items-center justify-center hover:bg-[var(--color-surface-elevated)] active:bg-[var(--color-border)] transition-colors disabled:opacity-50 touch-manipulation",
                            !isFinished ? "flex-1 min-h-0 py-2" : "py-16 sm:py-24"
                        )}
                    >
                        <span className="text-6xl sm:text-8xl md:text-9xl font-black tabular-nums tracking-tighter leading-none">{scoreA}</span>
                    </button>

                    <div className="p-1 sm:p-2 border-t border-[var(--color-border)]/50 shrink-0">
                        <Button variant="ghost" size="sm" className="w-full h-8 sm:h-10 text-[var(--color-muted)] hover:text-red-500 hover:bg-red-500/10" onClick={() => setScoreA(s => Math.max(0, s - 1))} disabled={isFinished || scoreA === 0}>
                            <Minus className="size-4 sm:mr-1" /> <span className="hidden sm:inline">Cofnij punkt</span>
                        </Button>
                    </div>
                </div>

                {/* Drużyna B */}
                <div className={cn("relative flex flex-col rounded-2xl border-2 overflow-hidden transition-colors", winner === 'B' ? "border-[var(--color-success)] bg-[var(--color-success)]/5" : "border-[var(--color-border)] bg-[var(--color-surface)]")}>
                    <div className="p-1 sm:p-4 text-center border-b border-[var(--color-border)]/50 shrink-0">
                        <h3 className="text-[10px] sm:text-sm font-black uppercase tracking-widest text-[var(--color-muted)] mb-1 sm:mb-2">Drużyna B</h3>
                        <div className="flex flex-wrap justify-center gap-1">
                            {teamBIds.map(id => (
                                <span key={id} className="text-[9px] sm:text-[10px] bg-[var(--color-background)] px-1.5 sm:px-2 py-0.5 rounded border border-[var(--color-border)] truncate max-w-full">
                                    {players?.find(p => p.id === id)?.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => !isFinished && setScoreB(s => s + 1)}
                        disabled={isFinished}
                        className={cn(
                            "flex items-center justify-center hover:bg-[var(--color-surface-elevated)] active:bg-[var(--color-border)] transition-colors disabled:opacity-50 touch-manipulation",
                            !isFinished ? "flex-1 min-h-0 py-2" : "py-16 sm:py-24"
                        )}
                    >
                        <span className="text-6xl sm:text-8xl md:text-9xl font-black tabular-nums tracking-tighter leading-none">{scoreB}</span>
                    </button>

                    <div className="p-1 sm:p-2 border-t border-[var(--color-border)]/50 shrink-0">
                        <Button variant="ghost" size="sm" className="w-full h-8 sm:h-10 text-[var(--color-muted)] hover:text-red-500 hover:bg-red-500/10" onClick={() => setScoreB(s => Math.max(0, s - 1))} disabled={isFinished || scoreB === 0}>
                            <Minus className="size-4 sm:mr-1" /> <span className="hidden sm:inline">Cofnij punkt</span>
                        </Button>
                    </div>
                </div>
            </div>

            {isFinished && (
                <div className="bg-[var(--color-surface)] border-2 border-[var(--color-accent)] p-4 sm:p-6 rounded-xl text-center animate-in slide-in-from-bottom-4 zoom-in-95 mt-2 sm:mt-4 shrink-0">
                    <h2 className="text-xl sm:text-2xl font-black text-[var(--color-accent)] mb-2">Mecz zakończony!</h2>
                    <p className="text-[var(--color-muted)] mb-4 sm:mb-6">Drużyna {winner} wygrywa {scoreA} : {scoreB}.</p>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                        <Button variant="secondary" className="bg-transparent border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)]" onClick={() => { setScoreA(0); setScoreB(0); }}>
                            <RotateCcw className="size-4 mr-2" /> Jeszcze raz
                        </Button>
                        <Button onClick={handleSave} disabled={createMutation.isPending} className="bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 text-white font-bold">
                            <Save className="size-5 mr-2" />
                            {createMutation.isPending ? 'Zapisywanie...' : 'Zapisz wynik'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
