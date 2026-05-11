import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSets, getPlayers, createSet, deleteSet } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { Plus, Trash2, ChevronRight, History as HistoryIcon } from 'lucide-react'
import { formatRelativeTime, cn } from '@/lib/utils'

export function HistoryPage() {
  const { show } = useToast()
  const queryClient = useQueryClient()

  const { data: sets, isLoading } = useQuery({
    queryKey: ['sets', 50],
    queryFn: () => getSets(50),
  })

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: getPlayers,
  })

  const [winnerId, setWinnerId] = useState('')
  const [loserId, setLoserId] = useState('')

  const createMutation = useMutation({
    mutationFn: createSet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sets'] })
      queryClient.invalidateQueries({ queryKey: ['standings'] })
      setWinnerId('')
      setLoserId('')
      show({ title: 'Set zapisany', variant: 'success' })
    },
    onError: (err: Error) => {
      show({ title: 'Nie udało się zapisać', description: err.message, variant: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sets'] })
      queryClient.invalidateQueries({ queryKey: ['standings'] })
      show({ title: 'Usunięto set', variant: 'success' })
    },
  })

  const canSubmit = winnerId && loserId && winnerId !== loserId
  const needsPlayers = !players || players.length < 2

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    createMutation.mutate({ winnerId, loserId })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Add set form */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Plus className="size-4 text-[var(--color-accent)]" />
            Dodaj wynik setu
          </h2>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Wybierz zwycięzcę i przegranego. Wynik zostanie zapisany z aktualną datą.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {needsPlayers ? (
            <p className="text-sm text-[var(--color-muted)] text-center py-2">
              Potrzebujesz co najmniej 2 zawodników żeby dodać set.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-3 md:items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">
                  Zwycięzca
                </label>
                <Select value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
                  <option value="">Wybierz zawodnika</option>
                  {players?.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === loserId}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="hidden md:flex items-center justify-center pb-2.5 text-[var(--color-subtle)]">
                <ChevronRight className="size-4" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">
                  Przegrany
                </label>
                <Select value={loserId} onChange={(e) => setLoserId(e.target.value)}>
                  <option value="">Wybierz zawodnika</option>
                  {players?.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === winnerId}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>

              <Button type="submit" disabled={!canSubmit || createMutation.isPending}>
                {createMutation.isPending ? 'Zapisywanie...' : 'Zapisz set'}
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* History list */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold">Ostatnie sety</h2>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Pokazane do 50 ostatnich
          </p>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded skeleton" />
            ))}
          </div>
        ) : !sets || sets.length === 0 ? (
          <div className="py-16 text-center">
            <HistoryIcon className="mx-auto size-12 text-[var(--color-subtle)] mb-4" />
            <p className="text-sm text-[var(--color-muted)]">
              Brak rozegranych setów. Dodaj pierwszy powyżej.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {sets.map((set) => (
              <SetRow
                key={set.id}
                set={set}
                onDelete={() => {
                  if (confirm('Usunąć ten set?')) {
                    deleteMutation.mutate(set.id)
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

interface SetRowProps {
  set: NonNullable<ReturnType<typeof useSetsData>>[number]
  onDelete: () => void
}

function SetRow({ set, onDelete }: SetRowProps) {
  return (
    <div className="group flex items-center gap-4 px-6 py-3 hover:bg-[var(--color-surface-elevated)] transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar name={set.winnerName} size="md" />
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{set.winnerName}</div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-success)] font-medium">
            Wygrana
          </div>
        </div>
      </div>

      <div
        className={cn(
          'shrink-0 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider',
          'bg-[var(--color-background)] text-[var(--color-subtle)] border border-[var(--color-border)]',
        )}
      >
        vs
      </div>

      <div className="flex items-center gap-3 flex-1 min-w-0 justify-end text-right">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate text-[var(--color-muted)]">
            {set.loserName}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-subtle)] font-medium">
            Przegrana
          </div>
        </div>
        <Avatar name={set.loserName} size="md" className="opacity-60" />
      </div>

      <div className="shrink-0 flex items-center gap-3 pl-2 border-l border-[var(--color-border)]">
        <div className="text-xs text-[var(--color-muted)] tabular min-w-[7ch] text-right">
          {formatRelativeTime(set.playedAt)}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// helper for type inference
function useSetsData() {
  const { data } = useQuery({ queryKey: ['sets', 50], queryFn: () => getSets(50) })
  return data
}
