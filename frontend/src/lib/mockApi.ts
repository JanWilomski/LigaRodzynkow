// Mock API w localStorage.
// Zachowuje się jak prawdziwy backend (te same kontrakty, te same błędy).
// Gdy backend będzie gotowy, w api.ts wystarczy zmienić import z mockApi na realApi.

import type {
  Player,
  CreatePlayerRequest,
  Set as VolleyballSet,
  CreateSetRequest,
  Standing,
} from '@/types/api'

const STORAGE_KEYS = {
  players: 'volleyball:players',
  sets: 'volleyball:sets',
} as const

// --- Storage helpers ---

function readPlayers(): Player[] {
  const raw = localStorage.getItem(STORAGE_KEYS.players)
  return raw ? JSON.parse(raw) : []
}

function writePlayers(players: Player[]) {
  localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(players))
}

interface StoredSet {
  id: string
  winnerId: string
  loserId: string
  playedAt: string
}

function readSets(): StoredSet[] {
  const raw = localStorage.getItem(STORAGE_KEYS.sets)
  return raw ? JSON.parse(raw) : []
}

function writeSets(sets: StoredSet[]) {
  localStorage.setItem(STORAGE_KEYS.sets, JSON.stringify(sets))
}

// Symulacja opóźnienia sieciowego, żeby UI loading states były widoczne
function delay(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class MockApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail)
  }
}

// --- Players ---

export async function getPlayers(): Promise<Player[]> {
  await delay()
  return readPlayers().sort((a, b) => a.name.localeCompare(b.name, 'pl'))
}

export async function createPlayer(request: CreatePlayerRequest): Promise<Player> {
  await delay()
  const name = request.name.trim()

  if (name.length < 2 || name.length > 50) {
    throw new MockApiError(400, 'Nazwa musi mieć 2-50 znaków.')
  }

  const players = readPlayers()
  if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    throw new MockApiError(409, 'Zawodnik o takiej nazwie już istnieje.')
  }

  const newPlayer: Player = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  }
  writePlayers([...players, newPlayer])
  return newPlayer
}

export async function deletePlayer(id: string): Promise<void> {
  await delay()
  const players = readPlayers()
  const player = players.find((p) => p.id === id)
  if (!player) throw new MockApiError(404, 'Zawodnik nie istnieje.')

  const sets = readSets()
  if (sets.some((s) => s.winnerId === id || s.loserId === id)) {
    throw new MockApiError(409, 'Zawodnik ma rozegrane sety i nie może zostać usunięty.')
  }

  writePlayers(players.filter((p) => p.id !== id))
}

// --- Sets ---

export async function getSets(limit = 20): Promise<VolleyballSet[]> {
  await delay()
  const sets = readSets()
  const players = readPlayers()
  const playerMap = new Map(players.map((p) => [p.id, p.name]))

  return sets
    .slice()
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
    .slice(0, Math.min(limit, 100))
    .map((s) => ({
      id: s.id,
      winnerId: s.winnerId,
      winnerName: playerMap.get(s.winnerId) ?? 'Nieznany',
      loserId: s.loserId,
      loserName: playerMap.get(s.loserId) ?? 'Nieznany',
      playedAt: s.playedAt,
    }))
}

export async function createSet(request: CreateSetRequest): Promise<VolleyballSet> {
  await delay()

  if (request.winnerId === request.loserId) {
    throw new MockApiError(400, 'Zwycięzca i przegrany muszą być różnymi zawodnikami.')
  }

  const players = readPlayers()
  const winner = players.find((p) => p.id === request.winnerId)
  const loser = players.find((p) => p.id === request.loserId)

  if (!winner || !loser) {
    throw new MockApiError(404, 'Jeden z zawodników nie istnieje.')
  }

  const newSet: StoredSet = {
    id: crypto.randomUUID(),
    winnerId: request.winnerId,
    loserId: request.loserId,
    playedAt: new Date().toISOString(),
  }
  writeSets([...readSets(), newSet])

  return {
    id: newSet.id,
    winnerId: winner.id,
    winnerName: winner.name,
    loserId: loser.id,
    loserName: loser.name,
    playedAt: newSet.playedAt,
  }
}

export async function deleteSet(id: string): Promise<void> {
  await delay()
  const sets = readSets()
  if (!sets.some((s) => s.id === id)) {
    throw new MockApiError(404, 'Set nie istnieje.')
  }
  writeSets(sets.filter((s) => s.id !== id))
}

// --- Standings ---

export async function getStandings(): Promise<Standing[]> {
  await delay()
  const players = readPlayers()
  const sets = readSets()

  const standings = players
    .map((p) => {
      const won = sets.filter((s) => s.winnerId === p.id).length
      const lost = sets.filter((s) => s.loserId === p.id).length
      const played = won + lost
      const winrate = played > 0 ? won / played : 0
      return { player: p, played, won, lost, winrate }
    })
    .sort((a, b) => {
      if (b.winrate !== a.winrate) return b.winrate - a.winrate
      if (b.won !== a.won) return b.won - a.won
      return a.player.name.localeCompare(b.player.name, 'pl')
    })
    .map((x, idx) => ({
      playerId: x.player.id,
      playerName: x.player.name,
      setsPlayed: x.played,
      setsWon: x.won,
      setsLost: x.lost,
      winrate: x.winrate,
      rank: idx + 1,
    }))

  return standings
}

// Pomocna funkcja deweloperska — wyczyść wszystko
export function _resetMockData() {
  localStorage.removeItem(STORAGE_KEYS.players)
  localStorage.removeItem(STORAGE_KEYS.sets)
}

// Seed danych testowych jeśli pusto
export function seedIfEmpty() {
  if (readPlayers().length > 0) return

  const names = ['Kamil', 'Marta', 'Ola', 'Tomek', 'Janek', 'Ewa', 'Piotr']
  const players: Player[] = names.map((name) => ({
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
  }))
  writePlayers(players)

  // Wygeneruj losowe sety między graczami
  const sets: StoredSet[] = []
  for (let i = 0; i < 35; i++) {
    const [a, b] = players
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
    sets.push({
      id: crypto.randomUUID(),
      winnerId: Math.random() > 0.5 ? a.id : b.id,
      loserId: Math.random() > 0.5 ? b.id : a.id,
      playedAt: new Date(Date.now() - i * 3600 * 1000).toISOString(),
    })
    // Upewnij się że winner != loser
    if (sets[i].winnerId === sets[i].loserId) {
      sets[i].loserId = sets[i].winnerId === a.id ? b.id : a.id
    }
  }
  writeSets(sets)
}
