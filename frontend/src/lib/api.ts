// Jeśli masz zdefiniowane typy w innym pliku (np. src/types/api.ts), 
// możesz je zaimportować stamtąd. Dla pewności umieszczam je tutaj:

export interface Player {
    id: string;
    name: string;
    createdAt: string;
}

export interface GamePlayer {
    id: string;
    name: string;
}

export interface Game {
    id: string;
    teamAScore: number;
    teamBScore: number;
    playedAt: string;
    teamA: GamePlayer[];
    teamB: GamePlayer[];
}

export interface Standing {
    playerId: string;
    playerName: string;
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    winrate: number;
    rank: number;
    recentForm: boolean[];
    pointsScored: number;
    pointsConceded: number;
}

export interface CreatePlayerDto {
    name: string;
}

export interface CreateGameDto {
    teamAScore: number;
    teamBScore: number;
    teamAPlayerIds: string[];
    teamBPlayerIds: string[];
}

export interface DuoStanding {
    player1Name: string;
    player2Name: string;
    gamesPlayed: number;
    gamesWon: number;
    winrate: number;
}

export interface WinrateHistoryPoint {
    gameNumber: number;
    winrate: number;
}

export interface DailyWinrateChange {
    date: string;
    change: number;
}

export interface PlayerProfile {
    id: string;
    name: string;
    gamesPlayed: number;
    gamesWon: number;
    winrate: number;
    pointsScored: number;
    pointsConceded: number;
    currentStreak: number;
    longestStreak: number;
    partners: EntityStat[];
    opponents: EntityStat[];
    recentGames: Game[];
    winrateHistory: WinrateHistoryPoint[];
    achievements: string[];
    recentWinrateChanges: DailyWinrateChange[];
}

export interface EntityStat {
    playerId: string;
    name: string;
    gamesTogether: number;
    gamesWon: number;
    winrate: number;
}
export interface TrioStanding {
    player1Name: string;
    player2Name: string;
    player3Name: string;
    gamesPlayed: number;
    gamesWon: number;
    winrate: number;
}


// ==========================================
// KONFIGURACJA API
// ==========================================

// Używamy portu 5004 z launchSettings.json (lub 8080 z Dockera - podmień jeśli trzeba)
const BASE_URL = 'https://ligarodzynkow.azurewebsites.net/api';

/**
 * Pomocnicza funkcja do obsługi odpowiedzi.
 * Jeśli API rzuci błąd 400 (np. przez walidację), ta funkcja wyciągnie
 * dokładną treść błędu z formatu ProblemDetails ASP.NET Core.
 */
async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let errorMessage = `Błąd HTTP: ${response.status}`;
        try {
            const errorData = await response.json();

            // ASP.NET Core ProblemDetails ma pole 'detail' lub 'title'
            if (errorData.detail) {
                errorMessage = errorData.detail;
            } else if (errorData.title) {
                errorMessage = errorData.title;
            } else if (errorData.errors) {
                // Czasami błędy walidacji na poziomie modelu lądują w słowniku "errors"
                const firstErrorKey = Object.keys(errorData.errors)[0];
                errorMessage = errorData.errors[firstErrorKey][0];
            }
        } catch (e) {
            // Fallback, jeśli backend nie zwrócił prawidłowego JSONa z błędem
            console.error("Nie udało się sparsować błędu z API", e);
        }

        // Rzucamy błąd, żeby react-query (lub try/catch w komponencie) mogło go przechwycić i pokazać w Toast/Alert
        throw new Error(errorMessage);
    }

    // Endpointy DELETE zazwyczaj zwracają 204 No Content (pusty wynik)
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

// ==========================================
// KONTRAKT API (Funkcje do eksportu)
// ==========================================

export const api = {
    // -- GRACZE --
    getPlayers: (): Promise<Player[]> =>
        fetch(`${BASE_URL}/players`)
            .then(res => handleResponse<Player[]>(res)),

    createPlayer: (data: CreatePlayerDto): Promise<Player> =>
        fetch(`${BASE_URL}/players`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(res => handleResponse<Player>(res)),

    deletePlayer: (id: string): Promise<void> =>
        fetch(`${BASE_URL}/players/${id}`, {
            method: 'DELETE'
        }).then(res => handleResponse<void>(res)),

    // -- SETY (MECZE) --
    getGames: (limit: number = 20): Promise<Game[]> =>
        fetch(`${BASE_URL}/games?limit=${limit}`)
            .then(res => handleResponse<Game[]>(res)),

    createGame: (data: CreateGameDto): Promise<Game> =>
        fetch(`${BASE_URL}/games`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(res => handleResponse<Game>(res)),

    deleteGame: (id: string): Promise<void> =>
        fetch(`${BASE_URL}/games/${id}`, {
            method: 'DELETE'
        }).then(res => handleResponse<void>(res)),

    // -- RANKING --
    getStandings: (): Promise<Standing[]> =>
        fetch(`${BASE_URL}/standings`)
            .then(res => handleResponse<Standing[]>(res)),

    getDuoStandings: (): Promise<DuoStanding[]> =>
        fetch(`${BASE_URL}/standings/duos`)
            .then(res => handleResponse<DuoStanding[]>(res)),
    
    getTrioStandings: async (): Promise<TrioStanding[]> => 
        fetch(`${BASE_URL}/standings/trios`)
            .then(res => handleResponse<TrioStanding[]>(res)),
    
    getPlayerProfile: (id: string): Promise<PlayerProfile> =>
        fetch(`${BASE_URL}/players/${id}/profile`)
            .then(res => handleResponse<PlayerProfile>(res)),
    
    updateGame: (params: { id: string, data: CreateGameDto }): Promise<void> =>
        fetch(`${BASE_URL}/games/${params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params.data),
        }).then(res => handleResponse<void>(res)),
};