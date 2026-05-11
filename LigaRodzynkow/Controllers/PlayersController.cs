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
}