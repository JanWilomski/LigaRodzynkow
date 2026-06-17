import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, Game, GamePlayer } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Medal, Flame, Zap, UserMinus, UserPlus, History, Target, TrendingUp, Star, Crown, Trophy, Shield, Pickaxe, RefreshCw, HeartPulse, Bomb, Lock, HeartCrack, Brain, Moon, Sun, Timer, Award, Cat, Magnet, Axe, Sparkles, Droplets, Bird, HeartHandshake, Coffee } from 'lucide-react'
import { formatPercent, formatRelativeTime, cn } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const ACHIEVEMENTS_DEF = [
    { id: 'ROOKIE', title: 'Debiutant', desc: '10 rozegranych setów', icon: Medal, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { id: 'REGULAR', title: 'Stały Bywalec', desc: '50 rozegranych setów', icon: Star, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { id: 'VETERAN', title: 'Weteran Parkietu', desc: '100 rozegranych setów', icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { id: 'COLLECTOR', title: 'Kolekcjoner', desc: '50 wygranych setów', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    // NOWE: Klub 3000
    { id: 'CLUB_3000', title: 'Klub 3000', desc: 'Zdobyto 3000 punktów', icon: Target, color: 'text-rose-600', bg: 'bg-rose-600/10', border: 'border-rose-600/20' },
    { id: 'ON_FIRE', title: 'On Fire', desc: '5 wygranych z rzędu', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    { id: 'UNTOUCHABLE', title: 'Nietykalny', desc: '10 wygranych z rzędu', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    // NOWE: Defensywa ze Stali
    { id: 'DEFENDER', title: 'Stalowa Obrona', desc: '3 wygrane do 25, tracąc <15 pkt', icon: Shield, color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
    { id: 'ICEBREAKER', title: 'Lodołamacz', desc: 'Wygrana po 5 porażkach', icon: Pickaxe, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { id: 'ROLLERCOASTER', title: 'Rollercoaster', desc: '6 razy na zmiane W/P', icon: RefreshCw, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { id: 'CLUTCH', title: 'Stalowe Nerwy', desc: 'Wygrana na przewagi powyżej 30 pkt', icon: HeartPulse, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    { id: 'DEMOLITION', title: 'Demolka', desc: 'Wygrana do jednocyfrówki', icon: Bomb, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    { id: 'WALL', title: 'Mur Berliński', desc: 'Wygrana +10 punktami', icon: Lock, color: 'text-stone-500', bg: 'bg-stone-500/10', border: 'border-stone-500/20' },
    // NOWE: Perfekcja
    { id: 'FLAWLESS', title: 'Perfekcja', desc: 'Wygrana do 25, tracąc ≤5 pkt', icon: Crown, color: 'text-amber-300', bg: 'bg-amber-300/10', border: 'border-amber-300/20' },
    { id: 'CLOSE_CALL', title: 'O Włos', desc: 'Porażka na przewagi powyżej 26 pkt', icon: HeartCrack, color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
    // ZMIANA: Czarny Kot za 7 przegranych
    { id: 'STOCKHOLM', title: 'Syndrom Sztokholmski', desc: '5 porażek z rzędu w duecie', icon: HeartHandshake, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20' },
    { id: 'PHOENIX', title: 'Feniks', desc: 'Wygrana +10 pkt po porażce -10 pkt', icon: Bird, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    
    // --- NOWE: Zaspał na mecz ---
    { id: 'AFK', title: 'Nie łam się', desc: 'Zdobyto mniej niż 5 punktów w secie', icon: Coffee, color: 'text-amber-700', bg: 'bg-amber-700/10', border: 'border-amber-700/20' },
    { id: 'BLACK_CAT', title: 'Czarny Kot', desc: '7 porażek z rzędu', icon: Cat, color: 'text-indigo-600', bg: 'bg-zinc-600/10', border: 'border-zinc-600/20' },
    { id: 'BANE', title: 'Prześladowca', desc: '5 wygranych z rzędu z tym samym rywalem', icon: Axe, color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/20' },
    { id: 'PERFECT_DAY', title: 'Król Dnia', desc: 'Wygraj wszystkie sety dnia', icon: Sparkles, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
    { id: 'WATER', title: 'Bądź jak woda', desc: 'WR ≥50% z min. 5 partnerami', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    { id: 'KRYPTONITE', title: 'Kryptonit', desc: '5 porażek z rzędu z tym samym rywalem', icon: Magnet, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
    { id: 'TELEPATHY', title: 'Telepatia', desc: 'WR z partnerem >75% po 10 grach', icon: Brain, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
    { id: 'NIGHT_OWL', title: 'Nocny Marek', desc: 'Wygrana po 22:00', icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' },
    { id: 'EARLY_BIRD', title: 'Ranny Ptaszek', desc: 'Wygrana przed 10:00', icon: Sun, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
    { id: 'MARATHON', title: 'Maratończyk', desc: '15 setów jednego dnia', icon: Timer, color: 'text-teal-500', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
];
export function PlayerProfilePage() {
    const { id } = useParams()
    const { data: p, isLoading } = useQuery({
        queryKey: ['player-profile', id],
        queryFn: () => api.getPlayerProfile(id!),
    })

    if (isLoading || !p) return <div className="p-8 text-center text-[var(--color-muted)] font-mono">Wczytywanie profilu...</div>

    // Obliczanie statystyk relacji
    const bestPartner = [...p.partners].sort((a, b) => b.winrate - a.winrate || b.gamesTogether - a.gamesTogether)[0]
    const worstPartner = [...p.partners].sort((a, b) => a.winrate - b.winrate || b.gamesTogether - a.gamesTogether)[0]

    // Najtrudniejszy przeciwnik (najniższy winrate gracza przeciwko niemu)
    const toughestOpponent = [...p.opponents].sort((a, b) => a.winrate - b.winrate || b.gamesTogether - a.gamesTogether)[0]

    // Najłatwiejszy przeciwnik (najwyższy winrate gracza przeciwko niemu)
    const easiestOpponent = [...p.opponents].sort((a, b) => b.winrate - a.winrate || b.gamesTogether - a.gamesTogether)[0]

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Hero Section */}
            <div className="flex flex-col md:flex-row gap-6 items-center bg-[var(--color-surface)] p-8 rounded-xl border border-[var(--color-border)] shadow-sm">
                <Avatar name={p.name} size="lg" className="size-24 text-2xl shrink-0" />
                <div className="text-center md:text-left flex-1 min-w-0">
                    <h1 className="text-3xl font-black tracking-tight leading-none truncate">{p.name}</h1>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                        <div className="text-sm font-mono text-[var(--color-muted)]">
                            WINRATE: <span className="text-[var(--color-accent)] font-bold">{formatPercent(p.winrate)}</span>
                        </div>
                        <div className="text-sm font-mono text-[var(--color-muted)]">
                            MECZE: <span className="text-[var(--color-foreground)] font-bold">{p.gamesPlayed}</span>
                        </div>

                        {/* NOWOŚĆ: Bilans małych punktów */}
                        <div className="text-sm font-mono flex items-center gap-1.5 border-l border-[var(--color-border)] pl-4">
                            <span className="text-[var(--color-muted)]">PUNKTY:</span>
                            <span className="font-bold text-[var(--color-foreground)] tabular-nums">{p.pointsScored}:{p.pointsConceded}</span>
                            <span className={cn(
                                "text-xs font-black px-1.5 py-0.5 rounded ml-1",
                                (p.pointsScored - p.pointsConceded) > 0 ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" :
                                    (p.pointsScored - p.pointsConceded) < 0 ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]" :
                                        "bg-[var(--color-border)] text-[var(--color-muted)]"
                            )}>
                                {(p.pointsScored - p.pointsConceded) > 0 ? '+' : ''}{p.pointsScored - p.pointsConceded}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Serie zwycięstw */}
                <div className="flex gap-3 shrink-0">
                    <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg text-center min-w-[90px]">
                        <Flame className="size-5 text-orange-500 mx-auto mb-1" />
                        <div className="text-[10px] uppercase font-black text-orange-500/70 tracking-widest">Seria</div>
                        <div className="text-2xl font-black text-orange-500">{p.currentStreak}</div>
                    </div>
                    <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 p-4 rounded-lg text-center min-w-[90px]">
                        <Zap className="size-5 text-[var(--color-accent)] mx-auto mb-1" />
                        <div className="text-[10px] uppercase font-black text-[var(--color-accent)]/70 tracking-widest">Rekord</div>
                        <div className="text-2xl font-black text-[var(--color-accent)]">{p.longestStreak}</div>
                    </div>
                </div>
            </div>

            {/* Grid statystyk dodatkowych - Teraz 4 karty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Najlepszy Partner"
                    icon={<UserPlus className="text-[var(--color-success)] size-4" />}
                    name={bestPartner?.name}
                    sub={`${Math.round((bestPartner?.winrate || 0) * 100)}% zwycięstw`}
                />
                <StatCard
                    title="Trudny Partner"
                    icon={<UserMinus className="text-[var(--color-danger)] size-4" />}
                    name={worstPartner?.name}
                    sub={`${Math.round((worstPartner?.winrate || 0) * 100)}% zwycięstw`}
                />
                <StatCard
                    title="Największy Rywal"
                    icon={<Medal className="text-purple-500 size-4" />}
                    name={toughestOpponent?.name}
                    sub={`Wygrywasz tylko ${Math.round((toughestOpponent?.winrate || 0) * 100)}% razy`}
                />
                <StatCard
                    title="Łatwy Cel"
                    icon={<Target className="text-amber-500 size-4" />}
                    name={easiestOpponent?.name}
                    sub={`Masz ${Math.round((easiestOpponent?.winrate || 0) * 100)}% zwycięstw`}
                />
            </div>
            {p.winrateHistory && p.winrateHistory.length > 0 && (
                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="size-4 text-[var(--color-accent)]" />
                            Historia Winrate
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] sm:h-[300px] pt-4 pb-2 px-2 sm:px-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={p.winrateHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                                <XAxis
                                    dataKey="gameNumber"
                                    stroke="var(--color-muted)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `#${val}`}
                                    minTickGap={20}
                                />
                                <YAxis
                                    stroke="var(--color-muted)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${Math.round(val * 100)}%`}
                                    domain={['auto', 'auto']}
                                    width={40}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        color: 'var(--color-foreground)'
                                    }}
                                    itemStyle={{ color: 'var(--color-accent)', fontWeight: 'bold' }}
                                    formatter={(value: any) => [`${(Number(value) * 100).toFixed(1)}%`, 'Winrate']}
                                    labelFormatter={(label) => `Mecz #${label}`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="winrate"
                                    stroke="var(--color-accent)"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 5, fill: 'var(--color-surface)', stroke: 'var(--color-accent)', strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Sekcja: Historia meczów (bez zmian) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="size-4 text-[var(--color-accent)]" />
                        Ostatnie sety zawodnika
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-[var(--color-border)]">
                        {p.recentGames && p.recentGames.length > 0 ? (
                            p.recentGames.map((game: Game) => {
                                // 1. Sprawdzamy w której drużynie grał zawodnik
                                const isTeamA = game.teamA.some((x: GamePlayer) => x.id === p.id);
                                // 2. Sprawdzamy czy drużyna A wygrała
                                const teamAWon = game.teamAScore > game.teamBScore;
                                // 3. Logika wygranej zawodnika
                                const playerWon = isTeamA ? teamAWon : !teamAWon;

                                return (
                                    <div
                                        key={game.id}
                                        className={cn(
                                            "flex items-center justify-between px-6 py-4 transition-colors border-l-4",
                                            playerWon
                                                ? "bg-[var(--color-success)]/5 hover:bg-[var(--color-success)]/10 border-l-[var(--color-success)]/70"
                                                : "bg-[var(--color-danger)]/5 hover:bg-[var(--color-danger)]/10 border-l-[var(--color-danger)]/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="text-lg font-black tabular min-w-[80px]">
                                                <span className={cn(game.teamAScore > game.teamBScore ? "text-[var(--color-success)]" : "text-[var(--color-muted)]")}>{game.teamAScore}</span>
                                                <span className="mx-1 text-[var(--color-subtle)]">:</span>
                                                <span className={cn(game.teamBScore > game.teamAScore ? "text-[var(--color-success)]" : "text-[var(--color-muted)]")}>{game.teamBScore}</span>
                                            </div>
                                            <div className="text-xs text-[var(--color-muted)] font-mono">
                                                {formatRelativeTime(game.playedAt)}
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-md",
                                            playerWon
                                                ? "text-[var(--color-success)] bg-[var(--color-success)]/10"
                                                : "text-[var(--color-danger)] bg-[var(--color-danger)]/10"
                                        )}>
                                            {playerWon ? "WYGRANA" : "PORAŻKA"}
                                            <span className="opacity-60 font-medium ml-1.5 hidden sm:inline">
                                                (Team {isTeamA ? "A" : "B"})
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="py-12 text-center text-sm text-[var(--color-muted)] font-mono">
                                Brak zarejestrowanych meczów.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <Award className="size-4 text-[var(--color-accent)]" />
                        Osiągnięcia
                        <span className="text-xs font-mono bg-[var(--color-surface-elevated)] px-2 py-0.5 rounded-full ml-2 text-[var(--color-muted)]">
                            {p.achievements?.length || 0} / {ACHIEVEMENTS_DEF.length}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {ACHIEVEMENTS_DEF.map(ach => {
                            // KLUCZOWE: Nowa logika sprawdzająca. Szukamy wersji z imieniem po separatorze '|'
                            const unlockedMatches = p.achievements?.filter(a => a === ach.id || a.startsWith(`${ach.id}|`)) || [];
                            const isUnlocked = unlockedMatches.length > 0;

                            // Wyciągamy same imiona (odrzucając przedrostek np. TELEPATHY|)
                            const payloads = unlockedMatches
                                .map(a => a.includes('|') ? a.split('|')[1] : null)
                                .filter(Boolean);

                            const Icon = ach.icon;

                            return (
                                <div
                                    key={ach.id}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all",
                                        isUnlocked
                                            ? `${ach.bg} ${ach.border}`
                                            : "bg-[var(--color-surface)] border-dashed border-[var(--color-border)] opacity-60 grayscale"
                                    )}
                                >
                                    <Icon className={cn("size-6 mb-2", isUnlocked ? ach.color : "text-[var(--color-subtle)]")} />
                                    <div className={cn("text-[11px] uppercase tracking-wider font-black mb-1", isUnlocked ? ach.color : "text-[var(--color-muted)]")}>
                                        {ach.title}
                                    </div>
                                    <div className="text-[10px] text-[var(--color-muted)] leading-tight">
                                        {ach.desc}

                                        {/* Wyświetlamy imiona tylko jeśli odznaka jest zdobyta */}
                                        {isUnlocked && payloads.length > 0 && (
                                            <div className="mt-1.5 font-bold text-[var(--color-foreground)]">
                                                {payloads.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function StatCard({ title, name, sub, icon }: { title: string, name?: string, sub: string, icon: React.ReactNode }) {
    return (
        <Card className="p-5 border-dashed bg-transparent border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors">
            <div className="flex items-center gap-3 mb-3">
                {icon}
                <span className="text-[10px] uppercase font-black text-[var(--color-muted)] tracking-widest">{title}</span>
            </div>
            <div className="text-lg font-bold truncate">{name || 'Brak danych'}</div>
            <div className="text-xs text-[var(--color-muted)] font-mono mt-1">{sub}</div>
        </Card>
    )
}