using LigaRodzynkow.Models;

namespace LigaRodzynkow.Dtos;

public record GamePlayerDto(Guid Id, string Name);

public record GameDto(
    Guid Id, 
    int TeamAScore, 
    int TeamBScore, 
    DateTime PlayedAt, 
    List<GamePlayerDto> TeamA, 
    List<GamePlayerDto> TeamB
);

public record CreateGameDto(
    int TeamAScore, 
    int TeamBScore, 
    List<Guid> TeamAPlayerIds, 
    List<Guid> TeamBPlayerIds
);