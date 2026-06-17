namespace LigaRodzynkow.Dtos;

public record TrioStandingDto(
    string Player1Name,
    string Player2Name,
    string Player3Name,
    int GamesPlayed,
    int GamesWon,
    double Winrate
);