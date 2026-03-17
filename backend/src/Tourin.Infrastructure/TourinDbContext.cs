using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Tourin.Domain;

namespace Tourin.Infrastructure;

public sealed class TourinDbContext : DbContext
{
  public TourinDbContext(DbContextOptions<TourinDbContext> options)
    : base(options)
  {
  }

  public DbSet<UserProfile> Users => Set<UserProfile>();
  public DbSet<UserStats> UserStats => Set<UserStats>();
  public DbSet<HeritageSite> HeritageSites => Set<HeritageSite>();
  public DbSet<MetroStation> MetroStations => Set<MetroStation>();
  public DbSet<Achievement> Achievements => Set<Achievement>();
  public DbSet<UserAchievement> UserAchievements => Set<UserAchievement>();
  public DbSet<Visit> Visits => Set<Visit>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    modelBuilder.Entity<UserProfile>(entity =>
    {
      entity.ToTable("users");
      entity.HasKey(item => item.Id);
      entity.Property(item => item.Id).HasMaxLength(128);
      entity.Property(item => item.Email).HasMaxLength(320).IsRequired();
      entity.Property(item => item.DisplayName).HasMaxLength(200).IsRequired();
      entity.Property(item => item.AvatarKey).HasMaxLength(500);
      entity.Property(item => item.AvatarUrl).HasMaxLength(1000);
      entity.HasIndex(item => item.Email);

      entity.HasOne(item => item.Stats)
        .WithOne(item => item.User)
        .HasForeignKey<UserStats>(item => item.UserId)
        .OnDelete(DeleteBehavior.Cascade);
    });

    modelBuilder.Entity<UserStats>(entity =>
    {
      entity.ToTable("user_stats");
      entity.HasKey(item => item.UserId);
      entity.Property(item => item.UserId).HasMaxLength(128);
    });

    modelBuilder.Entity<HeritageSite>(entity =>
    {
      entity.ToTable("heritage_sites");
      entity.HasKey(item => item.Id);
      entity.Property(item => item.Id).HasMaxLength(128);
      entity.Property(item => item.Name).HasMaxLength(200).IsRequired();
      entity.Property(item => item.Description).HasMaxLength(4000);
      entity.Property(item => item.StampUrl).HasMaxLength(1000);
      entity.Property(item => item.CoverPhotoUrl).HasMaxLength(1000);
      entity.Property(item => item.Type).HasMaxLength(100);
      entity.Property(item => item.SubType).HasMaxLength(100);
      entity.Property(item => item.Location).HasMaxLength(300);
      entity.Property(item => item.LegalStatus).HasMaxLength(200);
      entity.Property(item => item.Comuna).HasMaxLength(100);
      entity.Property(item => item.Region).HasMaxLength(100);
      entity.Property(item => item.Route).HasMaxLength(100);
      entity.Property(item => item.Website).HasMaxLength(500);
      entity.Property(item => item.Price).HasColumnType("numeric(10,2)");
    });

    modelBuilder.Entity<MetroStation>(entity =>
    {
      entity.ToTable("metro_stations");
      entity.HasKey(item => item.Id);
      entity.Property(item => item.Id).HasMaxLength(128);
      entity.Property(item => item.StationName).HasMaxLength(200).IsRequired();
      entity.Property(item => item.Line).HasMaxLength(50).IsRequired();
    });

    modelBuilder.Entity<Achievement>(entity =>
    {
      entity.ToTable("achievements");
      entity.HasKey(item => item.Id);
      entity.Property(item => item.Code).HasMaxLength(100).IsRequired();
      entity.Property(item => item.Name).HasMaxLength(200).IsRequired();
      entity.Property(item => item.Description).HasMaxLength(2000).IsRequired();
      entity.Property(item => item.Criteria).HasMaxLength(500).IsRequired();
      entity.Property(item => item.BadgeUrl).HasMaxLength(1000).IsRequired();
      entity.HasIndex(item => item.Code).IsUnique();
      entity.Property(item => item.RuleType).HasConversion<string>().HasMaxLength(50);
    });

    modelBuilder.Entity<UserAchievement>(entity =>
    {
      entity.ToTable("user_achievements");
      entity.HasKey(item => item.Id);
      entity.Property(item => item.UserId).HasMaxLength(128).IsRequired();
      entity.HasIndex(item => new { item.UserId, item.AchievementId }).IsUnique();

      entity.HasOne(item => item.User)
        .WithMany(item => item.UserAchievements)
        .HasForeignKey(item => item.UserId)
        .OnDelete(DeleteBehavior.Cascade);

      entity.HasOne(item => item.Achievement)
        .WithMany(item => item.UserAchievements)
        .HasForeignKey(item => item.AchievementId)
        .OnDelete(DeleteBehavior.Cascade);
    });

    modelBuilder.Entity<Visit>(entity =>
    {
      entity.ToTable("visits");
      entity.HasKey(item => item.Id);
      entity.Property(item => item.UserId).HasMaxLength(128).IsRequired();
      entity.Property(item => item.SiteId).HasMaxLength(128).IsRequired();
      entity.HasIndex(item => new { item.UserId, item.SiteId }).IsUnique();

      entity.HasOne(item => item.User)
        .WithMany(item => item.Visits)
        .HasForeignKey(item => item.UserId)
        .OnDelete(DeleteBehavior.Cascade);

      entity.HasOne(item => item.Site)
        .WithMany(item => item.Visits)
        .HasForeignKey(item => item.SiteId)
        .OnDelete(DeleteBehavior.Cascade);
    });
  }
}

public sealed class TourinDbContextFactory : IDesignTimeDbContextFactory<TourinDbContext>
{
  public TourinDbContext CreateDbContext(string[] args)
  {
    var connectionString =
      Environment.GetEnvironmentVariable("TOURIN_DATABASE_CONNECTION_STRING") ??
      "Host=localhost;Port=5432;Database=tourin;Username=postgres;Password=postgres";

    var optionsBuilder = new DbContextOptionsBuilder<TourinDbContext>();
    optionsBuilder.UseNpgsql(connectionString);

    return new TourinDbContext(optionsBuilder.Options);
  }
}
