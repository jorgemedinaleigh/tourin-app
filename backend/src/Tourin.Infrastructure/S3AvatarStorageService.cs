using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using Tourin.Application;

namespace Tourin.Infrastructure;

public sealed class S3AvatarStorageService : IAvatarStorageService
{
  private readonly IAmazonS3 _amazonS3;
  private readonly IOptions<StorageOptions> _options;
  private readonly ISystemClock _clock;

  public S3AvatarStorageService(IAmazonS3 amazonS3, IOptions<StorageOptions> options, ISystemClock clock)
  {
    _amazonS3 = amazonS3;
    _options = options;
    _clock = clock;
  }

  public Task<AvatarUploadResponse> CreateAvatarUploadAsync(
    string userId,
    string? contentType,
    string? fileExtension,
    CancellationToken cancellationToken)
  {
    var bucketName = _options.Value.AvatarBucketName?.Trim();
    if (string.IsNullOrWhiteSpace(bucketName))
    {
      throw new TourinAppException(500, "storage_not_configured", "Avatar storage is not configured.");
    }

    var safeExtension = NormalizeExtension(fileExtension, contentType);
    var key = $"avatars/{userId}/{Guid.NewGuid():N}.{safeExtension}";
    var expiresAt = _clock.UtcNow.AddMinutes(Math.Max(1, _options.Value.UploadUrlExpiryMinutes));
    var resolvedContentType = string.IsNullOrWhiteSpace(contentType) ? "image/jpeg" : contentType.Trim();

    var request = new GetPreSignedUrlRequest
    {
      BucketName = bucketName,
      Key = key,
      Verb = HttpVerb.PUT,
      Expires = expiresAt.UtcDateTime,
      ContentType = resolvedContentType,
    };

    var uploadUrl = _amazonS3.GetPreSignedURL(request);
    var publicUrl = BuildPublicUrl(key);

    return Task.FromResult(new AvatarUploadResponse(
      key,
      uploadUrl,
      publicUrl,
      expiresAt));
  }

  private string? BuildPublicUrl(string key)
  {
    var publicBaseUrl = _options.Value.PublicBaseUrl?.Trim();
    if (string.IsNullOrWhiteSpace(publicBaseUrl))
    {
      return null;
    }

    return $"{publicBaseUrl.TrimEnd('/')}/{key}";
  }

  private static string NormalizeExtension(string? fileExtension, string? contentType)
  {
    if (!string.IsNullOrWhiteSpace(fileExtension))
    {
      return fileExtension.Trim().TrimStart('.').ToLowerInvariant();
    }

    return contentType?.Trim().ToLowerInvariant() switch
    {
      "image/png" => "png",
      "image/webp" => "webp",
      _ => "jpg",
    };
  }
}
