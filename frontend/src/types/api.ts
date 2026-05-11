// Typy zgodne z docs/API_CONTRACT.md
// Jeśli backend zmieni cokolwiek, te typy też muszą się zmienić.

export interface Player {
  id: string
  name: string
  createdAt: string // ISO 8601 UTC
}

export interface CreatePlayerRequest {
  name: string
}

export interface Set {
  id: string
  winnerId: string
  winnerName: string
  loserId: string
  loserName: string
  playedAt: string // ISO 8601 UTC
}

export interface CreateSetRequest {
  winnerId: string
  loserId: string
}

export interface Standing {
  playerId: string
  playerName: string
  setsPlayed: number
  setsWon: number
  setsLost: number
  winrate: number // 0.0 - 1.0
  rank: number
}

export interface ApiError {
  type?: string
  title?: string
  status?: number
  errors?: Record<string, string[]>
  error?: string
}
export interface DuoStanding {
    player1Name: string;
    player2Name: string;
    gamesPlayed: number;
    gamesWon: number;
    winrate: number;
}
