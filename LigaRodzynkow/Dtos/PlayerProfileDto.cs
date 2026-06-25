namespace LigaRodzynkow.Dtos;

public record PlayerProfileDto(
    Guid Id,
    string Name,
    int GamesPlayed,
    int GamesWon,
    double Winrate,
    int PointsScored,
    int PointsConceded,
    int CurrentStreak,
    int LongestStreak,
    List<GameDto> RecentGames,
    List<EntityStatDto> Partners,
    List<EntityStatDto> Opponents,
    List<WinrateHistoryDto> WinrateHistory,
    List<string> Achievements,
    List<DailyWinrateChangeDto> RecentWinrateChanges
);

public record EntityStatDto(
    Guid PlayerId,
    string Name,
    int GamesTogether,
    int GamesWon,
    double Winrate
);

public record WinrateHistoryDto(
    int GameNumber,
    double Winrate
);

public record DailyWinrateChangeDto(DateTime Date, double Change);

// Pamiętaj o dodaniu List<DailyWinrateChangeDto> RecentWinrateChanges na końcu konstruktora PlayerProfileDto!
