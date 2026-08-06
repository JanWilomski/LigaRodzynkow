import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { Bluetooth, Keyboard, MousePointer2, Gamepad2, Trash2, Copy, AlertTriangle } from 'lucide-react'

interface CapturedEvent {
    n: number
    type: 'keydown' | 'keyup'
    key: string
    code: string
    keyCode: number
    which: number
    mods: string
    t: number
}

interface DistinctKey {
    key: string
    code: string
    keyCode: number
    count: number
}

interface CapturedPointer {
    n: number
    type: string
    x: number
    y: number
    dx: number
    dy: number
    button: number
    t: number
}

const NEUTRALIZE = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    ' ', 'Spacebar', 'PageUp', 'PageDown', 'Home', 'End', 'Enter', 'Tab',
])

const POINTER_TYPES = [
    'pointerdown', 'pointerup', 'pointermove',
    'mousedown', 'mouseup', 'mousemove',
    'click', 'dblclick', 'contextmenu', 'wheel',
    'touchstart', 'touchmove', 'touchend',
]

export function RemoteTestPage() {
    const { show } = useToast()

    // --- Klawiatura ---
    const [events, setEvents] = useState<CapturedEvent[]>([])
    const [distinct, setDistinct] = useState<Record<string, DistinctKey>>({})

    // --- Wskaźnik / mysz / dotyk ---
    const [pointerEvents, setPointerEvents] = useState<CapturedPointer[]>([])
    const [pointerTypes, setPointerTypes] = useState<Record<string, number>>({})
    const [lastPointer, setLastPointer] = useState<CapturedPointer | null>(null)

    // --- Gamepad ---
    const [gamepads, setGamepads] = useState<string[]>([])

    const [armed, setArmed] = useState(false)
    const counter = useRef(0)
    const pcounter = useRef(0)
    const startTime = useRef(0)
    const lastPos = useRef<{ x: number; y: number } | null>(null)
    const lastMoveLog = useRef(0)

    const stamp = () => {
        if (startTime.current === 0) startTime.current = performance.now()
        return Math.round(performance.now() - startTime.current)
    }

    const handleKey = useCallback((e: KeyboardEvent, type: 'keydown' | 'keyup') => {
        if (NEUTRALIZE.has(e.key)) e.preventDefault()
        const mods = [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Meta']
            .filter(Boolean).join('+')
        const prettyKey = e.key === ' ' ? 'Space' : e.key
        const ev: CapturedEvent = {
            n: ++counter.current, type, key: prettyKey, code: e.code || '(brak)',
            keyCode: e.keyCode, which: e.which, mods, t: stamp(),
        }
        if (type === 'keydown') {
            setDistinct((prev) => {
                const id = `${prettyKey} · ${ev.code}`
                const cur = prev[id]
                return { ...prev, [id]: { key: prettyKey, code: ev.code, keyCode: ev.keyCode, count: (cur?.count ?? 0) + 1 } }
            })
        }
        setEvents((prev) => [ev, ...prev].slice(0, 250))
    }, [])

    const handlePointer = useCallback((e: Event, type: string) => {
        if (type === 'contextmenu') e.preventDefault()
        const any = e as any
        const pt = any.touches?.[0] ?? any.changedTouches?.[0] ?? any
        const x = Math.round(pt.clientX ?? 0)
        const y = Math.round(pt.clientY ?? 0)

        let dx = 0
        let dy = 0
        if (type === 'wheel') {
            dx = Math.round(any.deltaX ?? 0)
            dy = Math.round(any.deltaY ?? 0)
        } else if (typeof any.movementX === 'number' && (any.movementX || any.movementY)) {
            dx = any.movementX
            dy = any.movementY
        } else if (lastPos.current) {
            dx = x - lastPos.current.x
            dy = y - lastPos.current.y
        }
        lastPos.current = { x, y }

        const isMove = type === 'pointermove' || type === 'mousemove' || type === 'touchmove'
        const now = performance.now()
        if (isMove) {
            if (now - lastMoveLog.current < 90) return
            lastMoveLog.current = now
            if (dx === 0 && dy === 0) return
        }

        const pe: CapturedPointer = {
            n: ++pcounter.current, type, x, y,
            dx: Math.round(dx), dy: Math.round(dy),
            button: typeof any.button === 'number' ? any.button : -1,
            t: stamp(),
        }
        setPointerTypes((prev) => ({ ...prev, [type]: (prev[type] ?? 0) + 1 }))
        setLastPointer(pe)
        setPointerEvents((prev) => [pe, ...prev].slice(0, 250))
    }, [])

    useEffect(() => {
        const kd = (e: KeyboardEvent) => handleKey(e, 'keydown')
        const ku = (e: KeyboardEvent) => handleKey(e, 'keyup')
        window.addEventListener('keydown', kd, { passive: false })
        window.addEventListener('keyup', ku, { passive: false })

        const handlers = POINTER_TYPES.map((t) => {
            const h = (e: Event) => handlePointer(e, t)
            window.addEventListener(t, h, { passive: false })
            return [t, h] as const
        })

        return () => {
            window.removeEventListener('keydown', kd)
            window.removeEventListener('keyup', ku)
            handlers.forEach(([t, h]) => window.removeEventListener(t, h))
        }
    }, [handleKey, handlePointer])

    useEffect(() => {
        let raf = 0
        const poll = () => {
            const pads = navigator.getGamepads ? navigator.getGamepads() : []
            const active: string[] = []
            for (const p of pads) {
                if (!p) continue
                const pressed = p.buttons.map((b, i) => (b.pressed ? `B${i}` : null)).filter(Boolean).join(' ')
                const axes = p.axes.map((a) => a.toFixed(2)).join(', ')
                active.push(`${p.id}${pressed ? ' → ' + pressed : ''}${axes ? ' | osie: ' + axes : ''}`)
            }
            setGamepads(active)
            raf = requestAnimationFrame(poll)
        }
        raf = requestAnimationFrame(poll)
        return () => cancelAnimationFrame(raf)
    }, [])

    const clear = () => {
        setEvents([]); setDistinct({})
        setPointerEvents([]); setPointerTypes({}); setLastPointer(null)
        counter.current = 0; pcounter.current = 0; startTime.current = 0
    }

    const buildText = () => JSON.stringify({
        userAgent: navigator.userAgent,
        distinctKeys: Object.values(distinct),
        pointerTypes,
        gamepads,
        keyEvents: [...events].reverse(),
        pointerEvents: [...pointerEvents].reverse(),
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
    const pointerTypeList = Object.entries(pointerTypes)
    const lastKey = events.find((e) => e.type === 'keydown')

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
                        Łapie klawiaturę <strong>oraz</strong> ruch wskaźnika/myszy — bo Twój pilot działa jak urządzenie wskazujące.
                    </p>
                </div>
                <div className="p-6 space-y-4 text-sm text-[var(--color-muted)]">
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Zrób test dwa razy: raz z <strong>wyłączonym</strong>, raz z <strong>włączonym</strong> AssistiveTouch.</li>
                        <li>Dotknij raz ekranu, potem klikaj po kolei każdy przycisk pilota (góra/dół/lewo/prawo/środek).</li>
                        <li>Patrz na sekcję <strong>„Wskaźnik / mysz / dotyk"</strong> — czy coś się rusza i jakie są przyrosty dx/dy.</li>
                        <li>Kliknij „Kopiuj log" i wklej mi wynik z obu prób.</li>
                    </ol>
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
                        <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                        <p className="text-xs">
                            Skoro pilot rusza kursorem AssistiveTouch, prawdopodobnie wysyła ruch wskaźnika, a nie klawisze.
                            Ta wersja testu sprawdza, czy ten ruch dociera do strony — jeśli tak, damy radę zmapować kierunki na punkty.
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

            {/* Ostatni wskaźnik */}
            <div className="rounded-lg border-2 border-[var(--color-accent)] bg-[var(--color-surface)] p-6 text-center">
                <div className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--color-muted)] mb-3">
                    Ostatnie zdarzenie wskaźnika
                </div>
                {lastPointer ? (
                    <div className="space-y-1">
                        <div className="text-3xl font-black tracking-tight break-all">{lastPointer.type}</div>
                        <div className="text-sm text-[var(--color-muted)] font-mono">
                            pozycja: {lastPointer.x}, {lastPointer.y} &nbsp;·&nbsp; ruch dx: <strong>{lastPointer.dx}</strong>, dy: <strong>{lastPointer.dy}</strong>
                            {lastPointer.button >= 0 && ` · przycisk: ${lastPointer.button}`}
                        </div>
                    </div>
                ) : (
                    <div className="text-2xl font-bold text-[var(--color-subtle)]">— brak ruchu wskaźnika —</div>
                )}
            </div>

            {/* Typy zdarzeń wskaźnika */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <MousePointer2 className="size-4 text-[var(--color-accent)]" />
                        Wskaźnik / mysz / dotyk ({pointerTypeList.length} typów)
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
                    {pointerTypeList.length === 0 ? (
                        <p className="text-sm text-[var(--color-muted)] text-center py-4">
                            Brak zdarzeń wskaźnika. Kliknij przyciski pilota.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {pointerTypeList.map(([type, count]) => (
                                <div key={type} className="px-3 py-2 rounded-md bg-[var(--color-background)] border border-[var(--color-border)]">
                                    <div className="text-sm font-bold font-mono">{type}</div>
                                    <div className="text-[10px] text-[var(--color-muted)]">×{count}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {pointerEvents.length > 0 && (
                        <div className="mt-4 max-h-64 overflow-y-auto divide-y divide-[var(--color-border)] font-mono text-xs">
                            {pointerEvents.map((e) => (
                                <div key={e.n} className="flex items-center gap-3 px-1 py-1.5">
                                    <span className="text-[var(--color-subtle)] w-10 shrink-0">#{e.n}</span>
                                    <span className="font-bold w-28 shrink-0 truncate">{e.type}</span>
                                    <span className="text-[var(--color-muted)] shrink-0">dx:{e.dx} dy:{e.dy}</span>
                                    <span className="text-[var(--color-subtle)] truncate">@{e.x},{e.y}{e.button >= 0 ? ` b${e.button}` : ''}</span>
                                    <span className="text-[var(--color-subtle)] ml-auto shrink-0">{e.t}ms</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Klawiatura */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--color-border)]">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Keyboard className="size-4 text-[var(--color-accent)]" />
                        Klawiatura ({distinctList.length} klawiszy)
                        {lastKey && <span className="text-xs font-normal text-[var(--color-muted)] font-mono ml-1">ostatni: {lastKey.key} ({lastKey.keyCode})</span>}
                    </h3>
                </div>
                <div className="p-4">
                    {distinctList.length === 0 ? (
                        <p className="text-sm text-[var(--color-muted)] text-center py-2">
                            Brak klawiszy (to spodziewane, jeśli pilot działa jako wskaźnik).
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {distinctList.map((d) => (
                                <div key={`${d.key}-${d.code}`} className="px-3 py-2 rounded-md bg-[var(--color-background)] border border-[var(--color-border)]">
                                    <div className="text-sm font-bold">{d.key}</div>
                                    <div className="text-[10px] text-[var(--color-muted)] font-mono">{d.code} · {d.keyCode} · ×{d.count}</div>
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
                        <p className="text-[var(--color-muted)] text-center py-2">Żaden kontroler nie jest widoczny.</p>
                    ) : (
                        <ul className="space-y-1 font-mono text-xs">
                            {gamepads.map((g, i) => <li key={i} className="break-all">{g}</li>)}
                        </ul>
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
