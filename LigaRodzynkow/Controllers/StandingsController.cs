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
    public async Task<ActionResult<IEnumerable<StandingDto>>> GetStandings()
    {
        // Pobieramy graczy z ich meczami (Eager Loading)
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

            return new StandingDto(
                p.Id,
                p.Name,
                played,
                won,
                played - won,
                played > 0 ? (double)won / played : 0,
                0 // Rank przypiszemy po sortowaniu
            );
        }).ToList();

        // Sortowanie zgodnie z kontraktem: winrate -> wygrane -> nazwa
        var sorted = stats
            .OrderByDescending(s => s.Winrate)
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
            .Where(d => d.GamesPlayed >= 2) // Opcjonalnie: tylko duety, które grały min. 2 razy
            .OrderByDescending(d => d.Winrate)
            .ThenByDescending(d => d.GamesPlayed)
            .Take(5) // Top 5 duetów
            .ToList();

        return Ok(result);
    }
}