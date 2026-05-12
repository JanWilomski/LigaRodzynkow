namespace LigaRodzynkow.Dtos;

public record StandingDto(
    Guid PlayerId,
    string PlayerName,
    int GamesPlayed,
    int GamesWon,
    int GamesLost,
    double Winrate,
    int PointsScored,
    int PointsConceded,
    int Rank,
    List<bool> RecentForm
);