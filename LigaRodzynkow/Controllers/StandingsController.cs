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
}