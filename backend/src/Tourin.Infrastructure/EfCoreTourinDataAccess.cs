using Microsoft.EntityFrameworkCore;
using Tourin.Application;
using Tourin.Domain;

namespace Tourin.Infrastructure;

public sealed class EfCoreTourinDataAccess : ITourinDataAccess
{
  private readonly TourinDbContext _dbContext;

  public EfCoreTourinDataAccess(TourinDbContext dbContext)
  {
    _dbContext = dbContext;
  }

  public async Task<UserProfile?> FindUserAsync(string userId, CancellationToken cancellationToken)
  {
    return await _dbContext.Users
      .Include(item => item.Stats)
      .FirstOrDefaultAsync(item => item.Id == userId, cancellationToken);
  }

  public Task AddUserAsync(UserProfile user, CancellationToken cancellationToken)
  {
    _dbContext.Users.Add(user);
    return Task.CompletedTask;
  }

  public async Task<HeritageSite?> FindSiteAsync(string siteId, CancellationToken cancellationToken)
  {
    return await _dbContext.HeritageSites
      .FirstOrDefaultAsync(item => item.Id == siteId, cancellationToken);
  }

  public async Task<IReadOnlyList<HeritageSite>> ListSitesAsync(CancellationToken cancellationToken)
  {
    return await _dbContext.HeritageSites
      .AsNoTracking()
      .ToArrayAsync(cancellationToken);
  }

  public async Task<IReadOnlyDictionary<string, HeritageSite>> GetSitesByIdsAsync(IEnumerable<string> siteIds, CancellationToken cancellationToken)
  {
    var ids = siteIds.Where(item => !string.IsNullOrWhiteSpace(item)).Distinct().ToArray();
    if (ids.Length == 0)
    {
      return new Dictionary<string, HeritageSite>();
    }

    return await _dbContext.HeritageSites
      .AsNoTracking()
      .Where(item => ids.Contains(item.Id))
      .ToDictionaryAsync(item => item.Id, cancellationToken);
  }

  public async Task<IReadOnlyList<MetroStation>> ListMetroStationsAsync(CancellationToken cancellationToken)
  {
    return await _dbContext.MetroStations
      .AsNoTracking()
      .ToArrayAsync(cancellationToken);
  }

  public async Task<Visit?> FindVisitAsync(string userId, string siteId, CancellationToken cancellationToken)
  {
    return await _dbContext.Visits
      .AsNoTracking()
      .FirstOrDefaultAsync(item => item.UserId == userId && item.SiteId == siteId, cancellationToken);
  }

  public async Task<IReadOnlyList<Visit>> ListVisitsAsync(string userId, CancellationToken cancellationToken)
  {
    return await _dbContext.Visits
      .AsNoTracking()
      .Where(item => item.UserId == userId)
      .OrderByDescending(item => item.CapturedAt)
      .ThenByDescending(item => item.CreatedAt)
      .ToArrayAsync(cancellationToken);
  }

  public Task AddVisitAsync(Visit visit, CancellationToken cancellationToken)
  {
    _dbContext.Visits.Add(visit);
    return Task.CompletedTask;
  }

  public async Task<IReadOnlyList<Achievement>> ListAchievementsAsync(CancellationToken cancellationToken)
  {
    return await _dbContext.Achievements
      .AsNoTracking()
      .ToArrayAsync(cancellationToken);
  }

  public async Task<IReadOnlyList<UserAchievement>> ListUserAchievementsAsync(string userId, CancellationToken cancellationToken)
  {
    return await _dbContext.UserAchievements
      .AsNoTracking()
      .Where(item => item.UserId == userId)
      .ToArrayAsync(cancellationToken);
  }

  public Task AddUserAchievementAsync(UserAchievement userAchievement, CancellationToken cancellationToken)
  {
    _dbContext.UserAchievements.Add(userAchievement);
    return Task.CompletedTask;
  }

  public async Task<IReadOnlyList<LeaderboardRow>> GetLeaderboardAsync(string sortBy, int limit, CancellationToken cancellationToken)
  {
    var query = _dbContext.Users
      .AsNoTracking()
      .Include(item => item.Stats)
      .AsQueryable();

    query = sortBy switch
    {
      "sitesVisited" => query.OrderByDescending(item => item.Stats.SitesVisited).ThenByDescending(item => item.Stats.Score),
      "eventsAttended" => query.OrderByDescending(item => item.Stats.EventsAttended).ThenByDescending(item => item.Stats.Score),
      _ => query.OrderByDescending(item => item.Stats.Score).ThenByDescending(item => item.Stats.SitesVisited),
    };

    return await query
      .Take(limit)
      .Select(item => new LeaderboardRow(
        item.Id,
        item.DisplayName,
        item.AvatarUrl,
        item.Stats.Score,
        item.Stats.SitesVisited,
        item.Stats.EventsAttended,
        item.Stats.AchievementsUnlocked))
      .ToArrayAsync(cancellationToken);
  }

  public async Task SaveChangesAsync(CancellationToken cancellationToken)
  {
    await _dbContext.SaveChangesAsync(cancellationToken);
  }
}
