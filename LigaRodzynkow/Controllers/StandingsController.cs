using LigaRodzynkow.Data;
using LigaRodzynkow.Dtos;
using LigaRodzynkow.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LigaRodzynkow.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StandingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public StandingsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<StandingDto>>> GetStandings()
    {
        var players = await _context.Players
            .Include(p => p.GamePlayers)
            .ThenInclude(gp => gp.Game)
            .ToListAsync();

        var stats = players.Select(p =>
        {
            int played = p.GamePlayers.Count;
            int won = p.GamePlayers.Count(gp => 
                (gp.Team == Team.A && gp.Game.TeamAScore > gp.Game.TeamBScore) ||
                (gp.Team == Team.B && gp.Game.TeamBScore > gp.Game.TeamAScore)
            );

            // NOWE: Obliczanie małych punktów
            int pointsScored = p.GamePlayers.Sum(gp => gp.Team == Team.A ? gp.Game.TeamAScore : gp.Game.TeamBScore);
            int pointsConceded = p.GamePlayers.Sum(gp => gp.Team == Team.A ? gp.Game.TeamBScore : gp.Game.TeamAScore);

            var recentForm = p.GamePlayers
                .OrderByDescending(gp => gp.Game.PlayedAt)
                .Take(5)
                .Select(gp => (gp.Team == Team.A && gp.Game.TeamAScore > gp.Game.TeamBScore) ||
                              (gp.Team == Team.B && gp.Game.TeamBScore > gp.Game.TeamAScore))
                .ToList();
            recentForm.Reverse();

            return new StandingDto(
                p.Id, p.Name, played, won, played - won,
                played > 0 ? (double)won / played : 0,
                pointsScored, pointsConceded, // NOWE POLA
                0, recentForm
            );
        }).ToList();

        // NOWE: Sortowanie bierze pod uwagę bilans małych punktów przy remisach!
        var sorted = stats
            .OrderByDescending(s => s.Winrate)
            .ThenByDescending(s => s.PointsScored - s.PointsConceded) // Tie-breaker!
            .ThenByDescending(s => s.GamesWon)
            .ThenBy(s => s.PlayerName)
            .Select((s, index) => s with { Rank = index + 1 })
            .ToList();

        return Ok(sorted);
    }
    
    [HttpGet("duos")]
    public async Task<ActionResult<IEnumerable<DuoStandingDto>>> GetDuoStandings()
    {
        var games = await _context.Games
            .Include(g => g.GamePlayers)
            .ThenInclude(gp => gp.Player)
            .ToListAsync();

        var duoStats = new Dictionary<string, (int Played, int Won)>();

        foreach (var game in games)
        {
            // Analizujemy osobno Drużynę A i Drużynę B
            ProcessTeam(game.GamePlayers.Where(gp => gp.Team == Team.A).Select(gp => gp.Player).ToList(), 
                        game.TeamAScore > game.TeamBScore);
            ProcessTeam(game.GamePlayers.Where(gp => gp.Team == Team.B).Select(gp => gp.Player).ToList(), 
                        game.TeamBScore > game.TeamAScore);
        }

        void ProcessTeam(List<Player> teamPlayers, bool isWinner)
        {
            if (teamPlayers.Count < 2) return;

            // Tworzymy pary z zawodników w drużynie
            for (int i = 0; i < teamPlayers.Count; i++)
            {
                for (int j = i + 1; j < teamPlayers.Count; j++)
                {
                    // Sortujemy nazwy, żeby duet "Ania-Tomek" był tym samym co "Tomek-Ania"
                    var names = new List<string> { teamPlayers[i].Name, teamPlayers[j].Name }.OrderBy(n => n).ToList();
                    var key = $"{names[0]}|{names[1]}";

                    if (!duoStats.ContainsKey(key)) duoStats[key] = (0, 0);
                    
                    var current = duoStats[key];
                    duoStats[key] = (current.Played + 1, isWinner ? current.Won + 1 : current.Won);
                }
            }
        }

        var result = duoStats
            .Select(kvp => {
                var names = kvp.Key.Split('|');
                return new DuoStandingDto(
                    names[0],
                    names[1],
                    kvp.Value.Played,
                    kvp.Value.Won,
                    kvp.Value.Played > 0 ? (double)kvp.Value.Won / kvp.Value.Played : 0
                );
            })
            .Where(d => d.GamesPlayed >= 10) // Opcjonalnie: tylko duety, które grały min. 2 razy
            .OrderByDescending(d => d.Winrate)
            .ThenByDescending(d => d.GamesPlayed)
            .Take(5) // Top 5 duetów
            .ToList();

        return Ok(result);
    }
    
    
    [HttpGet("trios")]
    public async Task<ActionResult<IEnumerable<TrioStandingDto>>> GetTrioStandings()
    {
        var games = await _context.Games
            .Include(g => g.GamePlayers)
            .ThenInclude(gp => gp.Player)
            .ToListAsync();

        var trioStats = new Dictionary<string, (int Played, int Won)>();

        foreach (var game in games)
        {
            ProcessTeam(game.GamePlayers.Where(gp => gp.Team == Team.A).Select(gp => gp.Player).ToList(), 
                        game.TeamAScore > game.TeamBScore);
            ProcessTeam(game.GamePlayers.Where(gp => gp.Team == Team.B).Select(gp => gp.Player).ToList(), 
                        game.TeamBScore > game.TeamAScore);
        }

        void ProcessTeam(List<Player> teamPlayers, bool isWinner)
        {
            // Sprawdzamy czy drużyna miała co najmniej 3 graczy
            if (teamPlayers.Count < 3) return;

            // Tworzymy trójki z zawodników w drużynie
            for (int i = 0; i < teamPlayers.Count; i++)
            {
                for (int j = i + 1; j < teamPlayers.Count; j++)
                {
                    for (int k = j + 1; k < teamPlayers.Count; k++)
                    {
                        // Sortujemy alfabetycznie, żeby uniknąć duplikatów dla tych samych składów
                        var names = new List<string> { teamPlayers[i].Name, teamPlayers[j].Name, teamPlayers[k].Name }
                            .OrderBy(n => n).ToList();
                        var key = $"{names[0]}|{names[1]}|{names[2]}";

                        if (!trioStats.ContainsKey(key)) trioStats[key] = (0, 0);
                        
                        var current = trioStats[key];
                        trioStats[key] = (current.Played + 1, isWinner ? current.Won + 1 : current.Won);
                    }
                }
            }
        }

        var result = trioStats
            .Select(kvp => {
                var names = kvp.Key.Split('|');
                return new TrioStandingDto(
                    names[0],
                    names[1],
                    names[2],
                    kvp.Value.Played,
                    kvp.Value.Won,
                    kvp.Value.Played > 0 ? (double)kvp.Value.Won / kvp.Value.Played : 0
                );
            })
            .Where(t => t.GamesPlayed >= 5) // Tylko trójki, które zagrały min. 2 razy
            .OrderByDescending(t => t.Winrate)
            .ThenByDescending(t => t.GamesPlayed)
            .Take(5) // Top 5
            .ToList();

        return Ok(result);
    }
}