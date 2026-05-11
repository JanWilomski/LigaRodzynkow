namespace LigaRodzynkow.Models;

public enum Team
{
    A,
    B
}
public class GamePlayer
{
    public Guid GameId { get; set; }
    public Guid PlayerId { get; set; }
    public Team Team { get; set; }

    public Player Player { get; set; } = null!;
    public Game Game { get; set; } = null!;
}