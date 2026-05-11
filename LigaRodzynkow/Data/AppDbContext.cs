using LigaRodzynkow.Models;
using Microsoft.EntityFrameworkCore;

namespace LigaRodzynkow.Data;

public class AppDbContext : DbContext
{
    public DbSet<Player> Players { get; set;}
    public DbSet<Game> Games { get; set;}
    public DbSet<GamePlayer> GamePlayers { get; set;}

    
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
    
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Player>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(50);
            entity.HasIndex(p => p.Name).IsUnique();
        });

        modelBuilder.Entity<Game>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(g => g.PlayedAt).HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Game_NonNegativeScores",
                    "\"TeamAScore\" >= 0 AND \"TeamBScore\" >= 0");
                t.HasCheckConstraint("CK_Game_DifferentScores",
                    "\"TeamAScore\" <> \"TeamBScore\"");
            });
            
        });

        modelBuilder.Entity<GamePlayer>(entity =>
        {

            entity.HasKey(gp => new { gp.GameId, gp.PlayerId });

            entity.Property(gp => gp.Team)
                .HasConversion<string>()
                .HasMaxLength(1);

            entity.HasOne(gp => gp.Game)
                .WithMany(g => g.GamePlayers)
                .HasForeignKey(gp => gp.GameId)
                .OnDelete(DeleteBehavior.Cascade);


            entity.HasOne(gp => gp.Player)
                .WithMany(p => p.GamePlayers)
                .HasForeignKey(gp => gp.PlayerId)
                .OnDelete(DeleteBehavior.Restrict);
        });
        
    }
    
}