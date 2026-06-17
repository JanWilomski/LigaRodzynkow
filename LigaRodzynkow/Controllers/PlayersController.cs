using LigaRodzynkow.Data;
using LigaRodzynkow.Dtos;
using LigaRodzynkow.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LigaRodzynkow.Controllers;


[ApiController]
[Route("api/[controller]")]
public class PlayersController : ControllerBase
{
    private readonly AppDbContext _context;

    public PlayersController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/players
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PlayerDto>>> GetPlayers()
    {
        var players = await _context.Players
            .OrderBy(p => p.Name)
            .Select(p => new PlayerDto(p.Id, p.Name, DateTime.UtcNow))
            .ToListAsync();

        return Ok(players);
    }

    // POST /api/players
    [HttpPost]
    public async Task<ActionResult<PlayerDto>> CreatePlayer([FromBody] CreatePlayerDto request)
    {
        var trimmedName = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(trimmedName) || trimmedName.Length < 2 || trimmedName.Length > 50)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Validation Error",
                Detail = "Name is required and must be between 2 and 50 characters."
            });
        }

        var nameExists = await _context.Players
            .AnyAsync(p => p.Name.ToLower() == trimmedName.ToLower());
        
        if (nameExists)
        {
             return Conflict(new ProblemDetails
             {
                 Title = "Conflict Error",
                 Detail = "A player with this name already exists."
             });
        }

        var player = new Player
        {
            Id = Guid.NewGuid(),
            Name = trimmedName
        };

        _context.Players.Add(player);
        await _context.SaveChangesAsync();
        
        var playerDto = new PlayerDto(player.Id, player.Name, DateTime.UtcNow);
        
        return Created($"/api/players/{player.Id}", playerDto);
    }

    // DELETE /api/players/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletePlayer(Guid id)
    {
        var player = await _context.Players
            .Include(p => p.GamePlayers)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (player == null)
        {
            return NotFound();
        }


        if (player.GamePlayers.Any())
        {
             return Conflict(new ProblemDetails
             {
                 Title = "Conflict Error",
                 Detail = "Cannot delete player with existing game history."
             });
        }

        _context.Players.Remove(player);
        await _context.SaveChangesAsync();

        return NoContent();
    }
    
    [HttpGet("{id:guid}/profile")]
    public async Task<ActionResult<PlayerProfileDto>> GetPlayerProfile(Guid id)
    {
        var player = await _context.Players
            .Include(p => p.GamePlayers)
            .ThenInclude(gp => gp.Game)
            .ThenInclude(g => g.GamePlayers)
            .ThenInclude(gp => gp.Player)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (player == null) return NotFound();

        var games = player.GamePlayers
            .OrderByDescending(gp => gp.Game.PlayedAt)
            .ToList();

        // 1. Obliczanie serii (Streaks)
        int currentStreak = 0;
        int longestStreak = 0;
        int tempStreak = 0;

        foreach (var gp in games.OrderBy(x => x.Game.PlayedAt))
        {
            bool won = (gp.Team == Team.A && gp.Game.TeamAScore > gp.Game.TeamBScore) ||
                       (gp.Team == Team.B && gp.Game.TeamBScore > gp.Game.TeamAScore);
            if (won) {
                tempStreak++;
                longestStreak = Math.Max(longestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        }
        
        // Aktulna seria (od końca)
        foreach (var gp in games) {
            bool won = (gp.Team == Team.A && gp.Game.TeamAScore > gp.Game.TeamBScore) ||
                       (gp.Team == Team.B && gp.Game.TeamBScore > gp.Game.TeamAScore);
            if (won) currentStreak++; else break;
        }

        // 2. Analiza partnerów i przeciwników
        var partnerStats = new Dictionary<Guid, (string Name, int Played, int Won)>();
        var opponentStats = new Dictionary<Guid, (string Name, int Played, int Won)>();

        foreach (var gp in games)
        {
            bool playerWon = (gp.Team == Team.A && gp.Game.TeamAScore > gp.Game.TeamBScore) ||
                             (gp.Team == Team.B && gp.Game.TeamBScore > gp.Game.TeamAScore);

            foreach (var otherGp in gp.Game.GamePlayers.Where(x => x.PlayerId != id))
            {
                var dict = (otherGp.Team == gp.Team) ? partnerStats : opponentStats;
                if (!dict.ContainsKey(otherGp.PlayerId)) 
                    dict[otherGp.PlayerId] = (otherGp.Player.Name, 0, 0);

                var s = dict[otherGp.PlayerId];
                dict[otherGp.PlayerId] = (s.Name, s.Played + 1, playerWon ? s.Won + 1 : s.Won);
            }
        }

        var recentGamesDto = games.Take(10).Select(gp => new GameDto(
            gp.Game.Id,
            gp.Game.TeamAScore,
            gp.Game.TeamBScore,
            gp.Game.PlayedAt,
            gp.Game.GamePlayers.Where(x => x.Team == Team.A).Select(x => new GamePlayerDto(x.PlayerId, x.Player.Name)).ToList(),
            gp.Game.GamePlayers.Where(x => x.Team == Team.B).Select(x => new GamePlayerDto(x.PlayerId, x.Player.Name)).ToList()
        )).ToList();
        
        int pointsScored = games.Sum(gp => gp.Team == Team.A ? gp.Game.TeamAScore : gp.Game.TeamBScore);
        int pointsConceded = games.Sum(gp => gp.Team == Team.A ? gp.Game.TeamBScore : gp.Game.TeamAScore);

        // NOWOŚĆ: Obliczanie historii winrate (chronologicznie)
        var chronologicalGames = games.OrderBy(gp => gp.Game.PlayedAt).ToList();
        var winrateHistory = new List<WinrateHistoryDto>();
        int historyWins = 0;

        for (int i = 0; i < chronologicalGames.Count; i++)
        {
            var gp = chronologicalGames[i];
            bool won = (gp.Team == Team.A && gp.Game.TeamAScore > gp.Game.TeamBScore) ||
                       (gp.Team == Team.B && gp.Game.TeamBScore > gp.Game.TeamAScore);

            if (won) historyWins++;

            int gameNumber = i + 1;
            // Dodajemy punkt na wykresie dopiero od 10. meczu
            if (gameNumber >= 10)
            {
                winrateHistory.Add(new WinrateHistoryDto(gameNumber, (double)historyWins / gameNumber));
            }
        }
        
        // ================= SILNIK OSIĄGNIĘĆ =================
        var achievements = new List<string>();

        // 1. Aktywność
        if (games.Count >= 10) achievements.Add("ROOKIE");
        if (games.Count >= 50) achievements.Add("REGULAR");
        if (games.Count >= 100) achievements.Add("VETERAN");
        if (historyWins >= 50) achievements.Add("COLLECTOR");

        // 2. Serie
        if (longestStreak >= 5) achievements.Add("ON_FIRE");
        if (longestStreak >= 10) achievements.Add("UNTOUCHABLE");

        int currentLossStreak = 0;
        int alternatingStreak = 1;
        bool? lastResult = null;
        var dailyGames = new Dictionary<DateTime, int>();

        foreach (var gp in chronologicalGames)
        {
            bool won = (gp.Team == Team.A && gp.Game.TeamAScore > gp.Game.TeamBScore) ||
                       (gp.Team == Team.B && gp.Game.TeamBScore > gp.Game.TeamAScore);

            int myScore = gp.Team == Team.A ? gp.Game.TeamAScore : gp.Game.TeamBScore;
            int enemyScore = gp.Team == Team.A ? gp.Game.TeamBScore : gp.Game.TeamAScore;

            // Maratończyk
            var date = gp.Game.PlayedAt.Date;
            if (!dailyGames.ContainsKey(date)) dailyGames[date] = 0;
            dailyGames[date]++;
            if (dailyGames[date] >= 15 && !achievements.Contains("MARATHON")) achievements.Add("MARATHON");

            // Lodołamacz
            if (won && currentLossStreak >= 5 && !achievements.Contains("ICEBREAKER")) achievements.Add("ICEBREAKER");

            if (won)
            {
                currentLossStreak = 0;
                
                // Zwycięstwa
                if (enemyScore >= 24 && !achievements.Contains("CLUTCH")) achievements.Add("CLUTCH");
                if (enemyScore < 10 && !achievements.Contains("DEMOLITION")) achievements.Add("DEMOLITION");
                if (myScore - enemyScore >= 10 && !achievements.Contains("WALL")) achievements.Add("WALL");

                // Czas (doliczamy +2h dla strefy czasowej Polski)
                int hour = gp.Game.PlayedAt.AddHours(2).Hour;
                if ((hour >= 22 || hour < 4) && !achievements.Contains("NIGHT_OWL")) achievements.Add("NIGHT_OWL");
                if ((hour >= 5 && hour < 10) && !achievements.Contains("EARLY_BIRD")) achievements.Add("EARLY_BIRD");
            }
            else
            {
                currentLossStreak++;
                // O włos
                if (myScore >= 24 && !achievements.Contains("CLOSE_CALL")) achievements.Add("CLOSE_CALL");
            }

            // Rollercoaster
            if (lastResult.HasValue)
            {
                if (lastResult.Value != won) alternatingStreak++;
                else alternatingStreak = 1;

                if (alternatingStreak >= 6 && !achievements.Contains("ROLLERCOASTER")) achievements.Add("ROLLERCOASTER");
            }
            lastResult = won;
        }

        // Telepatia
        if (partnerStats.Any(p => p.Value.Played >= 10 && (double)p.Value.Won / p.Value.Played >= 0.75))
        {
            achievements.Add("TELEPATHY");
        }

        // Unikamy duplikatów
        achievements = achievements.Distinct().ToList();

        var result = new PlayerProfileDto(
            player.Id,
            player.Name,
            games.Count,
            games.Count(gp => (gp.Team == Team.A && gp.Game.TeamAScore > gp.Game.TeamBScore) || (gp.Team == Team.B && gp.Game.TeamBScore > gp.Game.TeamAScore)),
            games.Count > 0 ? (double)games.Count(gp => (gp.Team == Team.A && gp.Game.TeamAScore > gp.Game.TeamBScore) || (gp.Team == Team.B && gp.Game.TeamBScore > gp.Game.TeamAScore)) / games.Count : 0,
            pointsScored,
            pointsConceded,
            currentStreak,
            longestStreak,
            recentGamesDto,
            partnerStats.Select(kvp => new EntityStatDto(kvp.Key, kvp.Value.Name, kvp.Value.Played, kvp.Value.Won, (double)kvp.Value.Won/kvp.Value.Played)).ToList(),
            opponentStats.Select(kvp => new EntityStatDto(kvp.Key, kvp.Value.Name, kvp.Value.Played, kvp.Value.Won, (double)kvp.Value.Won/kvp.Value.Played)).ToList(),
            winrateHistory,
            achievements
        );

        return Ok(result);
    }
}