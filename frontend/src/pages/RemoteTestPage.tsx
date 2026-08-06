import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { Bluetooth, Keyboard, Gamepad2, Trash2, Copy, AlertTriangle } from 'lucide-react'

interface CapturedEvent {
    n: number
    type: 'keydown' | 'keyup'
    key: string
    code: string
    keyCode: number
    which: number
    mods: string
    t: number // ms od startu
}

interface DistinctKey {
    key: string
    code: string
    keyCode: number
    count: number
}

// Klawisze, które przewijają stronę / aktywują elementy — blokujemy, żeby test był stabilny
const NEUTRALIZE = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    ' ', 'Spacebar', 'PageUp', 'PageDown', 'Home', 'End', 'Enter', 'Tab',
])

export function RemoteTestPage() {
    const { show } = useToast()
    const [events, setEvents] = useState<CapturedEvent[]>([])
    const [distinct, setDistinct] = useState<Record<string, DistinctKey>>({})
    const [gamepads, setGamepads] = useState<string[]>([])
    const [armed, setArmed] = useState(false)
    const counter = useRef(0)
    const startTime = useRef(0)

    const handleKey = useCallback((e: KeyboardEvent, type: 'keydown' | 'keyup') => {
        if (NEUTRALIZE.has(e.key)) e.preventDefault()

        if (startTime.current === 0) startTime.current = performance.now()

        const mods = [
            e.ctrlKey && 'Ctrl',
            e.altKey && 'Alt',
            e.shiftKey && 'Shift',
            e.metaKey && 'Meta',
        ].filter(Boolean).join('+')

        const prettyKey = e.key === ' ' ? 'Space' : e.key

        const ev: CapturedEvent = {
            n: ++counter.current,
            type,
            key: prettyKey,
            code: e.code || '(brak)',
            keyCode: e.keyCode,
            which: e.which,
            mods,
            t: Math.round(performance.now() - startTime.current),
        }

        if (type === 'keydown') {
            setDistinct((prev) => {
                const id = `${prettyKey} · ${ev.code}`
                const cur = prev[id]
                return {
                    ...prev,
                    [id]: {
                        key: prettyKey,
                        code: ev.code,
                        keyCode: ev.keyCode,
                        count: (cur?.count ?? 0) + 1,
                    },
                }
            })
        }

        setEvents((prev) => [ev, ...prev].slice(0, 250))
    }, [])

    useEffect(() => {
        const kd = (e: KeyboardEvent) => handleKey(e, 'keydown')
        const ku = (e: KeyboardEvent) => handleKey(e, 'keyup')
        window.addEventListener('keydown', kd, { passive: false })
        window.addEventListener('keyup', ku, { passive: false })
        return () => {
            window.removeEventListener('keydown', kd)
            window.removeEventListener('keyup', ku)
        }
    }, [handleKey])

    // Niektóre piloty widoczne są jako kontroler (Gamepad API działa w Safari iOS)
    useEffect(() => {
        let raf = 0
        const poll = () => {
            const pads = navigator.getGamepads ? navigator.getGamepads() : []
            const active: string[] = []
            for (const p of pads) {
                if (!p) continue
                const pressed = p.buttons
                    .map((b, i) => (b.pressed ? `B${i}` : null))
                    .filter(Boolean)
                    .join(' ')
                active.push(`${p.id}${pressed ? ' → ' + pressed : ''}`)
            }
            setGamepads(active)
            raf = requestAnimationFrame(poll)
        }
        raf = requestAnimationFrame(poll)
        return () => cancelAnimationFrame(raf)
    }, [])

    const clear = () => {
        setEvents([])
        setDistinct({})
        counter.current = 0
        startTime.current = 0
    }

    const buildText = () => JSON.stringify({
        userAgent: navigator.userAgent,
        distinctKeys: Object.values(distinct),
        gamepads,
        events: [...events].reverse(),
    }, null, 2)

    const copyLog = async () => {
        try {
            await navigator.clipboard.writeText(buildText())
            show({ title: 'Skopiowano log', description: 'Wklej mi go w czacie.', variant: 'success' })
        } catch {
            show({ title: 'Skopiuj ręcznie', description: 'Zaznacz tekst na dole i skopiuj.', variant: 'error' })
        }
    }

    const distinctList = Object.values(distinct)
    const last = events.find((e) => e.type === 'keydown')

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
            {/* Instrukcja */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <Bluetooth className="size-4 text-[var(--color-accent)]" />
                        Diagnostyka pilota Bluetooth
                    </h2>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                        Sprawdza, co Twój pilot wysyła do przeglądarki na iPhonie.
                    </p>
                </div>
                <div className="p-6 space-y-4 text-sm text-[var(--color-muted)]">
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Sparuj pilota z iPhonem w Ustawieniach → Bluetooth.</li>
                        <li>Jeśli ma tryby, przełącz go w tryb „ebook / klawiatura" (nie „aparat").</li>
                        <li>Dotknij raz tego ekranu, żeby strona miała fokus, potem klikaj przyciski pilota.</li>
                        <li>Kliknij „Kopiuj log" i wklej mi wynik w czacie.</li>
                    </ol>
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
                        <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                        <p className="text-xs">
                            Jeśli po klikaniu <strong>nic się tu nie pojawia</strong>, pilot najpewniej wysyła
                            klawisze głośności (tryb aparatu) — tych Safari nie widzi i wtedy się nie da.
                            Poszukaj kombinacji przełączającej tryb.
                        </p>
                    </div>
                    <button
                        onClick={() => setArmed(true)}
                        className="w-full py-3 rounded-lg border border-dashed border-[var(--color-border-strong)] text-[var(--color-foreground)] text-sm font-medium active:bg-[var(--color-surface-elevated)]"
                    >
                        {armed ? '✓ Aktywne — klikaj przyciski pilota' : 'Dotknij tu, aby aktywować przechwytywanie'}
                    </button>
                </div>
            </div>

            {/* Ostatnie zdarzenie */}
            <div className="rounded-lg border-2 border-[var(--color-accent)] bg-[var(--color-surface)] p-6 text-center">
                <div className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--color-muted)] mb-3">
                    Ostatni klawisz
                </div>
                {last ? (
                    <div className="space-y-1">
                        <div className="text-4xl font-black tabular-nums tracking-tight break-all">{last.key}</div>
                        <div className="text-xs text-[var(--color-muted)] font-mono">
                            code: {last.code} · keyCode: {last.keyCode}{last.mods && ` · ${last.mods}`}
                        </div>
                    </div>
                ) : (
                    <div className="text-2xl font-bold text-[var(--color-subtle)]">— czekam —</div>
                )}
            </div>

            {/* Wykryte klawisze */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Keyboard className="size-4 text-[var(--color-accent)]" />
                        Wykryte klawisze ({distinctList.length})
                    </h3>
                    <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={clear} className="h-8">
                            <Trash2 className="size-4 sm:mr-1" /> <span className="hidden sm:inline">Wyczyść</span>
                        </Button>
                        <Button size="sm" onClick={copyLog} className="h-8">
                            <Copy className="size-4 sm:mr-1" /> <span className="hidden sm:inline">Kopiuj log</span>
                        </Button>
                    </div>
                </div>
                <div className="p-4">
                    {distinctList.length === 0 ? (
                        <p className="text-sm text-[var(--color-muted)] text-center py-4">
                            Brak wykrytych klawiszy. Kliknij przycisk na pilocie.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {distinctList.map((d) => (
                                <div key={`${d.key}-${d.code}`} className="px-3 py-2 rounded-md bg-[var(--color-background)] border border-[var(--color-border)]">
                                    <div className="text-sm font-bold">{d.key}</div>
                                    <div className="text-[10px] text-[var(--color-muted)] font-mono">
                                        {d.code} · {d.keyCode} · ×{d.count}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Gamepad */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)]">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Gamepad2 className="size-4 text-[var(--color-accent)]" />
                        Kontrolery (Gamepad API)
                    </h3>
                </div>
                <div className="p-4 text-sm">
                    {gamepads.length === 0 ? (
                        <p className="text-[var(--color-muted)] text-center py-2">
                            Żaden kontroler nie jest widoczny. (To normalne, jeśli pilot działa jako klawiatura.)
                        </p>
                    ) : (
                        <ul className="space-y-1 font-mono text-xs">
                            {gamepads.map((g, i) => <li key={i} className="break-all">{g}</li>)}
                        </ul>
                    )}
                </div>
            </div>

            {/* Log zdarzeń */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)]">
                    <h3 className="text-sm font-semibold">Log zdarzeń ({events.length})</h3>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-[var(--color-border)] font-mono text-xs">
                    {events.length === 0 ? (
                        <p className="text-sm text-[var(--color-muted)] text-center py-6 font-sans">Brak zdarzeń.</p>
                    ) : (
                        events.map((e) => (
                            <div key={e.n} className="flex items-center gap-3 px-4 py-2">
                                <span className="text-[var(--color-subtle)] w-10 shrink-0">#{e.n}</span>
                                <span className={e.type === 'keydown' ? 'text-[var(--color-success)] w-16 shrink-0' : 'text-[var(--color-subtle)] w-16 shrink-0'}>
                                    {e.type === 'keydown' ? '▼ down' : '▲ up'}
                                </span>
                                <span className="font-bold w-24 shrink-0 truncate">{e.key}</span>
                                <span className="text-[var(--color-muted)] truncate">{e.code} · {e.keyCode}{e.mods && ` · ${e.mods}`}</span>
                                <span className="text-[var(--color-subtle)] ml-auto shrink-0">{e.t}ms</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Fallback: ręczne kopiowanie */}
            <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                <summary className="px-6 py-4 text-sm font-semibold cursor-pointer select-none">
                    Log jako tekst (jeśli „Kopiuj" nie działa — zaznacz i skopiuj)
                </summary>
                <div className="p-4">
                    <textarea
                        readOnly
                        value={buildText()}
                        onFocus={(e) => e.currentTarget.select()}
                        className="w-full h-48 text-[10px] font-mono p-3 rounded border border-[var(--color-border)] bg-[var(--color-background)] resize-y"
                    />
                </div>
            </details>
        </div>
    )
}
