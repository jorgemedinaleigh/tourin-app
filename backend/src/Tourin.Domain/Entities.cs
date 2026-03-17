namespace Tourin.Domain;

public enum AchievementRuleType
{
  SitesVisited = 0,
  Score = 1,
  EventsAttended = 2,
}

public sealed class UserProfile
{
  private UserProfile()
  {
  }

  public UserProfile(string id, string email, string displayName, DateTimeOffset now)
  {
    Id = id;
    Email = NormalizeEmail(email);
    DisplayName = NormalizeDisplayName(displayName, Email);
    CreatedAt = now;
    UpdatedAt = now;
    Stats = new UserStats(id, now);
  }

  public string Id { get; private set; } = string.Empty;
  public string Email { get; private set; } = string.Empty;
  public string DisplayName { get; private set; } = string.Empty;
  public string? AvatarKey { get; private set; }
  public string? AvatarUrl { get; private set; }
  public DateTimeOffset CreatedAt { get; private set; }
  public DateTimeOffset UpdatedAt { get; private set; }

  public UserStats Stats { get; private set; } = null!;
  public ICollection<Visit> Visits { get; } = new List<Visit>();
  public ICollection<UserAchievement> UserAchievements { get; } = new List<UserAchievement>();

  public void SyncIdentity(string? email, string? displayName, DateTimeOffset now)
  {
    var normalizedEmail = NormalizeEmail(email, Email);
    var normalizedDisplayName = NormalizeDisplayName(displayName, normalizedEmail);

    if (Email == normalizedEmail && DisplayName == normalizedDisplayName && Stats is not null)
    {
      return;
    }

    Email = normalizedEmail;
    DisplayName = normalizedDisplayName;
    Stats ??= new UserStats(Id, now);
    UpdatedAt = now;
  }

  public void UpdateAvatar(string? avatarKey, string? avatarUrl, DateTimeOffset now)
  {
    AvatarKey = string.IsNullOrWhiteSpace(avatarKey) ? null : avatarKey.Trim();
    AvatarUrl = string.IsNullOrWhiteSpace(avatarUrl) ? null : avatarUrl.Trim();
    UpdatedAt = now;
  }

  private static string NormalizeEmail(string? email, string fallback = "unknown@tourin.local")
  {
    return string.IsNullOrWhiteSpace(email) ? fallback : email.Trim().ToLowerInvariant();
  }

  private static string NormalizeDisplayName(string? displayName, string fallbackEmail)
  {
    if (!string.IsNullOrWhiteSpace(displayName))
    {
      return displayName.Trim();
    }

    var prefix = fallbackEmail.Split('@', StringSplitOptions.RemoveEmptyEntries)[0];
    return string.IsNullOrWhiteSpace(prefix) ? "Tourin User" : prefix;
  }
}

public sealed class UserStats
{
  private UserStats()
  {
  }

  public UserStats(string userId, DateTimeOffset now)
  {
    UserId = userId;
    UpdatedAt = now;
  }

  public string UserId { get; private set; } = string.Empty;
  public int Score { get; private set; }
  public int SitesVisited { get; private set; }
  public int EventsAttended { get; private set; }
  public int AchievementsUnlocked { get; private set; }
  public DateTimeOffset UpdatedAt { get; private set; }

  public UserProfile User { get; private set; } = null!;

  public void ApplySiteStamped(int awardedScore, DateTimeOffset now)
  {
    Score += Math.Max(0, awardedScore);
    SitesVisited += 1;
    UpdatedAt = now;
  }

  public void ApplyEventAttended(DateTimeOffset now)
  {
    EventsAttended += 1;
    UpdatedAt = now;
  }

  public void SetAchievementsUnlocked(int count, DateTimeOffset now)
  {
    AchievementsUnlocked = Math.Max(0, count);
    UpdatedAt = now;
  }
}

public sealed class HeritageSite
{
  private HeritageSite()
  {
  }

  public HeritageSite(
    string id,
    string name,
    string? description,
    double latitude,
    double longitude,
    int score,
    int stampRadiusMeters)
  {
    Id = id;
    Name = name;
    Description = description;
    Latitude = latitude;
    Longitude = longitude;
    Score = score;
    StampRadiusMeters = stampRadiusMeters;
  }

  public string Id { get; private set; } = string.Empty;
  public string Name { get; private set; } = string.Empty;
  public string? Description { get; private set; }
  public bool IsFree { get; private set; }
  public decimal? Price { get; private set; }
  public int Score { get; private set; }
  public string? StampUrl { get; private set; }
  public string? CoverPhotoUrl { get; private set; }
  public string? Type { get; private set; }
  public string? SubType { get; private set; }
  public string? Location { get; private set; }
  public string? LegalStatus { get; private set; }
  public string? Comuna { get; private set; }
  public string? Region { get; private set; }
  public int StampRadiusMeters { get; private set; }
  public string? Route { get; private set; }
  public string? Website { get; private set; }
  public double Latitude { get; private set; }
  public double Longitude { get; private set; }

  public ICollection<Visit> Visits { get; } = new List<Visit>();
}

public sealed class MetroStation
{
  private MetroStation()
  {
  }

  public MetroStation(string id, string stationName, string line, double latitude, double longitude, bool isOperational)
  {
    Id = id;
    StationName = stationName;
    Line = line;
    Latitude = latitude;
    Longitude = longitude;
    IsOperational = isOperational;
  }

  public string Id { get; private set; } = string.Empty;
  public string StationName { get; private set; } = string.Empty;
  public string Line { get; private set; } = string.Empty;
  public double Latitude { get; private set; }
  public double Longitude { get; private set; }
  public bool IsOperational { get; private set; }
}

public sealed class Achievement
{
  private Achievement()
  {
  }

  public Achievement(
    Guid id,
    string code,
    string name,
    string description,
    string criteria,
    string badgeUrl,
    AchievementRuleType ruleType,
    int threshold)
  {
    Id = id;
    Code = code;
    Name = name;
    Description = description;
    Criteria = criteria;
    BadgeUrl = badgeUrl;
    RuleType = ruleType;
    Threshold = threshold;
  }

  public Guid Id { get; private set; }
  public string Code { get; private set; } = string.Empty;
  public string Name { get; private set; } = string.Empty;
  public string Description { get; private set; } = string.Empty;
  public string Criteria { get; private set; } = string.Empty;
  public string BadgeUrl { get; private set; } = string.Empty;
  public AchievementRuleType RuleType { get; private set; }
  public int Threshold { get; private set; }

  public ICollection<UserAchievement> UserAchievements { get; } = new List<UserAchievement>();
}

public sealed class UserAchievement
{
  private UserAchievement()
  {
  }

  public UserAchievement(Guid id, string userId, Guid achievementId, DateTimeOffset unlockedAt)
  {
    Id = id;
    UserId = userId;
    AchievementId = achievementId;
    UnlockedAt = unlockedAt;
  }

  public Guid Id { get; private set; }
  public string UserId { get; private set; } = string.Empty;
  public Guid AchievementId { get; private set; }
  public DateTimeOffset UnlockedAt { get; private set; }

  public UserProfile User { get; private set; } = null!;
  public Achievement Achievement { get; private set; } = null!;
}

public sealed class Visit
{
  private Visit()
  {
  }

  public Visit(
    Guid id,
    string userId,
    string siteId,
    DateTimeOffset capturedAt,
    DateTimeOffset createdAt,
    double latitude,
    double longitude,
    int scoreAwarded)
  {
    Id = id;
    UserId = userId;
    SiteId = siteId;
    CapturedAt = capturedAt;
    CreatedAt = createdAt;
    Latitude = latitude;
    Longitude = longitude;
    ScoreAwarded = Math.Max(0, scoreAwarded);
  }

  public Guid Id { get; private set; }
  public string UserId { get; private set; } = string.Empty;
  public string SiteId { get; private set; } = string.Empty;
  public DateTimeOffset CapturedAt { get; private set; }
  public DateTimeOffset CreatedAt { get; private set; }
  public double Latitude { get; private set; }
  public double Longitude { get; private set; }
  public int ScoreAwarded { get; private set; }

  public UserProfile User { get; private set; } = null!;
  public HeritageSite Site { get; private set; } = null!;
}
