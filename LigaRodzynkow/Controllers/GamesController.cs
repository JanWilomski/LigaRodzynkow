using LigaRodzynkow.Data;
using LigaRodzynkow.Dtos;
using LigaRodzynkow.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LigaRodzynkow.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GamesController : ControllerBase
{
    private readonly AppDbContext _context;

    public GamesController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/games
    [HttpGet]
    public async Task<ActionResult<IEnumerable<GameDto>>> GetGames([FromQuery] int limit = 20)
    {
        var maxLimit = Math.Min(limit, 100);

        var games = await _context.Games
            .Include(g => g.GamePlayers)
                .ThenInclude(gp => gp.Player)
            .OrderByDescending(g => g.PlayedAt)
            .Take(maxLimit)
            .ToListAsync();

        var result = games.Select(g => new GameDto(
            g.Id,
            g.TeamAScore,
            g.TeamBScore,
            g.PlayedAt,
            g.GamePlayers.Where(gp => gp.Team == Team.A).Select(gp => new GamePlayerDto(gp.PlayerId, gp.Player.Name)).ToList(),
            g.GamePlayers.Where(gp => gp.Team == Team.B).Select(gp => new GamePlayerDto(gp.PlayerId, gp.Player.Name)).ToList()
        ));

        return Ok(result);
    }

    // POST /api/games
    [HttpPost]
    public async Task<ActionResult<GameDto>> CreateGame([FromBody] CreateGameDto request)
    {
        // 1. Walidacja wyników (zgodnie z Constraintami w DB)
        if (request.TeamAScore < 0 || request.TeamBScore < 0)
            return BadRequest(new ProblemDetails { Title = "Błąd walidacji", Detail = "Wyniki nie mogą być ujemne." });

        if (request.TeamAScore == request.TeamBScore)
            return BadRequest(new ProblemDetails { Title = "Błąd walidacji", Detail = "Siatkówka nie zna remisów. Musi być zwycięzca." });

        // 2. Walidacja składów
        if (!request.TeamAPlayerIds.Any() || !request.TeamBPlayerIds.Any())
            return BadRequest(new ProblemDetails { Title = "Błąd walidacji", Detail = "Każda drużyna musi mieć co najmniej jednego gracza." });

        // 3. Sprawdzenie duplikatów i konfliktów drużyn
        if (request.TeamAPlayerIds.Intersect(request.TeamBPlayerIds).Any())
            return BadRequest(new ProblemDetails { Title = "Błąd walidacji", Detail = "Gracz nie może grać w obu drużynach jednocześnie." });

        // 4. Weryfikacja istnienia graczy w bazie
        var allIds = request.TeamAPlayerIds.Concat(request.TeamBPlayerIds).Distinct().ToList();
        var players = await _context.Players.Where(p => allIds.Contains(p.Id)).ToListAsync();

        if (players.Count != allIds.Count)
            return NotFound(new ProblemDetails { Title = "Nie znaleziono", Detail = "Jeden lub więcej graczy nie istnieje." });

        // Tworzenie gry
        var game = new Game
        {
            Id = Guid.NewGuid(),
            TeamAScore = request.TeamAScore,
            TeamBScore = request.TeamBScore,
            PlayedAt = DateTime.UtcNow
        };

        foreach (var id in request.TeamAPlayerIds)
            game.GamePlayers.Add(new GamePlayer { GameId = game.Id, PlayerId = id, Team = Team.A });

        foreach (var id in request.TeamBPlayerIds)
            game.GamePlayers.Add(new GamePlayer { GameId = game.Id, PlayerId = id, Team = Team.B });

        _context.Games.Add(game);
        await _context.SaveChangesAsync();

        // Mapowanie do odpowiedzi
        var response = new GameDto(
            game.Id,
            game.TeamAScore,
            game.TeamBScore,
            game.PlayedAt,
            players.Where(p => request.TeamAPlayerIds.Contains(p.Id)).Select(p => new GamePlayerDto(p.Id, p.Name)).ToList(),
            players.Where(p => request.TeamBPlayerIds.Contains(p.Id)).Select(p => new GamePlayerDto(p.Id, p.Name)).ToList()
        );

        return CreatedAtAction(nameof(GetGames), new { id = game.Id }, response);
    }

    // DELETE /api/games/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGame(Guid id)
    {
        var game = await _context.Games.FindAsync(id);
        if (game == null) return NotFound();

        _context.Games.Remove(game);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}