namespace LigaRodzynkow.Models;

public class Game
{
    public Guid Id { get; set; }

    public int TeamAScore { get; set; } = 0;
    public int TeamBScore { get; set; } = 0;
    
    public DateTime PlayedAt { get; set; }
    
    public ICollection<GamePlayer> GamePlayers { get; set; } = new List<GamePlayer>();
}