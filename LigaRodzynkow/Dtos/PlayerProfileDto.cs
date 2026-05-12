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
    List<EntityStatDto> Opponents
);

public record EntityStatDto(
    Guid PlayerId,
    string Name,
    int GamesTogether,
    int GamesWon,
    double Winrate
);