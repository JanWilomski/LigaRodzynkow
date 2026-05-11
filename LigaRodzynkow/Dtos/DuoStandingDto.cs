namespace LigaRodzynkow.Dtos;

public record DuoStandingDto(
    string Player1Name,
    string Player2Name,
    int GamesPlayed,
    int GamesWon,
    double Winrate
);