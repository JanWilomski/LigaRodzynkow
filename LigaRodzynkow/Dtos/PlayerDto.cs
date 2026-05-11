namespace LigaRodzynkow.Dtos;

public record PlayerDto(Guid Id, string Name, DateTime CreatedAt);

public record CreatePlayerDto(string Name);