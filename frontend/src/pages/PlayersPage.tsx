import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { Plus, Trash2, Users, Calendar } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export function PlayersPage() {
    const { show } = useToast()
    const queryClient = useQueryClient()

    const { data: players, isLoading } = useQuery({
        queryKey: ['players'],
        queryFn: api.getPlayers,
    })

    const { data: standings } = useQuery({
        queryKey: ['standings'],
        queryFn: api.getStandings,
    })

    const standingsMap = new Map(standings?.map((s) => [s.playerId, s]) ?? [])

    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [error, setError] = useState<string | null>(null)

    const createMutation = useMutation({
        mutationFn: api.createPlayer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['players'] })
            queryClient.invalidateQueries({ queryKey: ['standings'] })
            setName('')
            setOpen(false)
            show({ title: 'Dodano zawodnika', variant: 'success' })
        },
        onError: (err: Error) => {
            setError(err.message)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: api.deletePlayer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['players'] })
            queryClient.invalidateQueries({ queryKey: ['standings'] })
            show({ title: 'Usunięto zawodnika', variant: 'success' })
        },
        onError: (err: Error) => {
            show({ title: 'Nie udało się usunąć', description: err.message, variant: 'error' })
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        createMutation.mutate({ name })
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold">Zawodnicy</h2>
                    <p className="text-sm text-[var(--color-muted)] mt-0.5">
                        {players?.length ?? 0} {players?.length === 1 ? 'zapisany' : 'zapisanych'}
                    </p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="size-4" />
                            Dodaj zawodnika
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nowy zawodnik</DialogTitle>
                            <DialogDescription>
                                Wpisz imię lub ksywkę. Nazwa musi być unikalna.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                autoFocus
                                placeholder="np. Kamil"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value)
                                    setError(null)
                                }}
                                error={!!error}
                            />
                            {error && (
                                <p className="text-xs text-[var(--color-danger)]">{error}</p>
                            )}
                            <div className="flex justify-end gap-2 pt-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Anuluj
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={createMutation.isPending || name.trim().length < 2}>
                                    {createMutation.isPending ? 'Dodawanie...' : 'Dodaj'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-24 rounded-lg skeleton" />
                    ))}
                </div>
            ) : !players || players.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--color-border-strong)] py-16 text-center">
                    <Users className="mx-auto size-12 text-[var(--color-subtle)] mb-4" />
                    <h3 className="text-lg font-semibold mb-1">Brak zawodników</h3>
                    <p className="text-sm text-[var(--color-muted)]">
                        Dodaj pierwszego zawodnika żeby zacząć ligę.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {players.map((player) => {
                        const stats = standingsMap.get(player.id)
                        const hasGames = stats && stats.gamesPlayed > 0

                        return (
                            <div
                                key={player.id}
                                className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-border-strong)] transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar name={player.name} size="lg" />
                                        <div className="min-w-0">
                                            <div className="font-semibold truncate">{player.name}</div>
                                            <div className="text-xs text-[var(--color-muted)] flex items-center gap-1 mt-0.5">
                                                <Calendar className="size-3" />
                                                {formatRelativeTime(player.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            if (confirm(`Usunąć zawodnika ${player.name}?`)) {
                                                deleteMutation.mutate(player.id)
                                            }
                                        }}
                                        disabled={hasGames || deleteMutation.isPending}
                                        title={hasGames ? 'Nie można usunąć - zawodnik ma rozegrane sety' : 'Usuń'}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-danger)]"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>

                                {stats && stats.gamesPlayed > 0 && (
                                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--color-border)]">
                                        <Stat label="Rozegrane" value={stats.gamesPlayed} />
                                        <Stat label="W—P" value={`${stats.gamesWon}—${stats.gamesLost}`} />
                                        <Stat
                                            label="Winrate"
                                            value={`${Math.round(stats.winrate * 100)}%`}
                                            accent
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
    return (
        <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-subtle)] mb-0.5">
                {label}
            </div>
            <div
                className={`text-sm font-semibold tabular ${accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-foreground)]'}`}
            >
                {value}
            </div>
        </div>
    )
}