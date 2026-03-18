using System.Globalization;
using System.Text;
using System.Text.Json;
using Amazon;
using Amazon.RDSDataService;
using Amazon.RDSDataService.Model;
using CsvHelper;
using Microsoft.EntityFrameworkCore;
using Tourin.Domain;
using Tourin.Infrastructure;

try
{
  Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
  var options = ImporterOptions.Parse(args);
  if (options.ShowHelp)
  {
    PrintUsage();
    return 0;
  }

  if (!options.IsValid(out var validationError))
  {
    Console.Error.WriteLine(validationError);
    PrintUsage();
    return 1;
  }

  var connectionString = options.ConnectionString ?? Environment.GetEnvironmentVariable("TOURIN_DATABASE_CONNECTION_STRING");
  var dataApiResourceArn = options.DataApiResourceArn ?? Environment.GetEnvironmentVariable("TOURIN_DATABASE_RESOURCE_ARN");
  var dataApiSecretArn = options.DataApiSecretArn ?? Environment.GetEnvironmentVariable("TOURIN_DATABASE_SECRET_ARN");
  var dataApiDatabaseName = options.DataApiDatabaseName ?? Environment.GetEnvironmentVariable("TOURIN_DATABASE_NAME");

  var inputPath = Path.GetFullPath(options.InputPath!);
  if (!File.Exists(inputPath))
  {
    Console.Error.WriteLine($"Input file not found: {inputPath}");
    return 1;
  }

  var records = await HeritageSiteImportReader.ReadAsync(inputPath, options.Format);
  if (records.Count == 0)
  {
    Console.Error.WriteLine("No heritage site records were found in the input file.");
    return 1;
  }

  if (options.DryRun && string.IsNullOrWhiteSpace(connectionString))
  {
    var valid = 0;
    var dryRunSkipped = 0;

    foreach (var record in records)
    {
      if (record.TryNormalize(out _, out var error))
      {
        valid += 1;
      }
      else
      {
        dryRunSkipped += 1;
        Console.WriteLine($"Skipping record '{record.RawId ?? "<missing-id>"}': {error}");
      }
    }

    Console.WriteLine($"Dry run complete without database access. Parsed={records.Count}, Valid={valid}, Skipped={dryRunSkipped}");
    return 0;
  }

  var hasConnectionString = !string.IsNullOrWhiteSpace(connectionString);
  var hasDataApi = !string.IsNullOrWhiteSpace(dataApiResourceArn)
    && !string.IsNullOrWhiteSpace(dataApiSecretArn)
    && !string.IsNullOrWhiteSpace(dataApiDatabaseName);

  if (!hasConnectionString && !hasDataApi)
  {
    Console.Error.WriteLine(
      "A database target is required. Use --connection-string, or use --resource-arn, --secret-arn, and --database.");
    return 1;
  }

  if (hasConnectionString)
  {
    var dbOptions = new DbContextOptionsBuilder<TourinDbContext>()
      .UseNpgsql(connectionString)
      .Options;

    await using var dbContext = new TourinDbContext(dbOptions);
    await dbContext.Database.MigrateAsync();

    var existingSites = await dbContext.HeritageSites
      .ToDictionaryAsync(item => item.Id, StringComparer.OrdinalIgnoreCase);

    var inserted = 0;
    var updated = 0;
    var skipped = 0;

    foreach (var record in records)
    {
      if (!record.TryNormalize(out var normalized, out var error))
      {
        skipped += 1;
        Console.WriteLine($"Skipping record '{record.RawId ?? "<missing-id>"}': {error}");
        continue;
      }

      if (!existingSites.TryGetValue(normalized.Id, out var site))
      {
        site = new HeritageSite(
          normalized.Id,
          normalized.Name,
          normalized.Description,
          normalized.Latitude,
          normalized.Longitude,
          normalized.StampRadiusMeters);

        dbContext.HeritageSites.Add(site);
        existingSites[normalized.Id] = site;
        inserted += 1;
      }
      else
      {
        updated += 1;
      }

      site.UpdateCatalogDetails(
        normalized.Name,
        normalized.Description,
        normalized.Latitude,
        normalized.Longitude,
        normalized.StampRadiusMeters,
        normalized.IsFree,
        normalized.StampUrl,
        normalized.CoverPhotoUrl,
        normalized.Type,
        normalized.SubType,
        normalized.Location,
        normalized.LegalStatus,
        normalized.Comuna,
        normalized.Region,
        normalized.Route,
        normalized.Website);
    }

    if (options.DryRun)
    {
      Console.WriteLine($"Dry run complete. Parsed={records.Count}, Inserted={inserted}, Updated={updated}, Skipped={skipped}");
      return 0;
    }

    await dbContext.SaveChangesAsync();
    Console.WriteLine($"Import complete. Parsed={records.Count}, Inserted={inserted}, Updated={updated}, Skipped={skipped}");
    return 0;
  }

  var rowsToImport = new List<NormalizedHeritageSiteRecord>();
  var dataApiSkipped = 0;

  foreach (var record in records)
  {
    if (record.TryNormalize(out var normalized, out var error))
    {
      rowsToImport.Add(normalized);
    }
    else
    {
      dataApiSkipped += 1;
      Console.WriteLine($"Skipping record '{record.RawId ?? "<missing-id>"}': {error}");
    }
  }

  if (options.DryRun)
  {
    Console.WriteLine($"Dry run complete. Parsed={records.Count}, Valid={rowsToImport.Count}, Skipped={dataApiSkipped}");
    return 0;
  }

  var dataApiRegion = ImporterUtilities.ResolveAwsRegion(dataApiResourceArn!);
  using var dataApiClient = new AmazonRDSDataServiceClient(RegionEndpoint.GetBySystemName(dataApiRegion));
  var imported = await DataApiHeritageSiteImporter.ImportAsync(
    dataApiClient,
    dataApiResourceArn!,
    dataApiSecretArn!,
    dataApiDatabaseName!,
    rowsToImport,
    CancellationToken.None);

  Console.WriteLine($"Import complete via Data API. Parsed={records.Count}, Imported={imported}, Skipped={dataApiSkipped}");
  return 0;
}
catch (Exception ex)
{
  Console.Error.WriteLine(ex.Message);
  return 1;
}

static void PrintUsage()
{
  Console.WriteLine(
    """
    Tourin heritage site importer

    Required:
      --input <path>                 Path to an Appwrite JSON or CSV export file.

    Optional:
      --connection-string <value>    PostgreSQL connection string. Falls back to TOURIN_DATABASE_CONNECTION_STRING.
      --resource-arn <value>         Aurora cluster ARN for Data API imports.
      --secret-arn <value>           Secrets Manager ARN for Data API imports.
      --database <value>             Database name for Data API imports.
      --format <json|csv>            Input format. Defaults to auto-detect from file extension.
      --dry-run                      Parse and validate without saving changes.
      --help                         Show this help text.
    """);
}

internal sealed class ImporterOptions
{
  public string? InputPath { get; private init; }
  public string? ConnectionString { get; private init; }
  public string? DataApiResourceArn { get; private init; }
  public string? DataApiSecretArn { get; private init; }
  public string? DataApiDatabaseName { get; private init; }
  public string? Format { get; private init; }
  public bool DryRun { get; private init; }
  public bool ShowHelp { get; private init; }

  public bool IsValid(out string error)
  {
    if (ShowHelp)
    {
      error = string.Empty;
      return true;
    }

    if (string.IsNullOrWhiteSpace(InputPath))
    {
      error = "The --input argument is required.";
      return false;
    }

    if (!string.IsNullOrWhiteSpace(Format) &&
        !string.Equals(Format, "json", StringComparison.OrdinalIgnoreCase) &&
        !string.Equals(Format, "csv", StringComparison.OrdinalIgnoreCase))
    {
      error = "The --format argument must be either 'json' or 'csv'.";
      return false;
    }

    error = string.Empty;
    return true;
  }

  public static ImporterOptions Parse(string[] args)
  {
    string? inputPath = null;
    string? connectionString = null;
    string? dataApiResourceArn = null;
    string? dataApiSecretArn = null;
    string? dataApiDatabaseName = null;
    string? format = null;
    var dryRun = false;
    var showHelp = false;

    for (var index = 0; index < args.Length; index += 1)
    {
      switch (args[index])
      {
        case "--input":
          inputPath = ReadValue(args, ref index, "--input");
          break;
        case "--connection-string":
          connectionString = ReadValue(args, ref index, "--connection-string");
          break;
        case "--resource-arn":
          dataApiResourceArn = ReadValue(args, ref index, "--resource-arn");
          break;
        case "--secret-arn":
          dataApiSecretArn = ReadValue(args, ref index, "--secret-arn");
          break;
        case "--database":
          dataApiDatabaseName = ReadValue(args, ref index, "--database");
          break;
        case "--format":
          format = ReadValue(args, ref index, "--format");
          break;
        case "--dry-run":
          dryRun = true;
          break;
        case "--help":
        case "-h":
        case "/?":
          showHelp = true;
          break;
        default:
          throw new ArgumentException($"Unknown argument '{args[index]}'.");
      }
    }

    return new ImporterOptions
    {
      InputPath = inputPath,
      ConnectionString = connectionString,
      DataApiResourceArn = dataApiResourceArn,
      DataApiSecretArn = dataApiSecretArn,
      DataApiDatabaseName = dataApiDatabaseName,
      Format = format,
      DryRun = dryRun,
      ShowHelp = showHelp,
    };
  }

  private static string ReadValue(string[] args, ref int index, string optionName)
  {
    if (index + 1 >= args.Length)
    {
      throw new ArgumentException($"Missing value for {optionName}.");
    }

    index += 1;
    return args[index];
  }
}

internal static class HeritageSiteImportReader
{
  public static async Task<IReadOnlyList<HeritageSiteImportRecord>> ReadAsync(string inputPath, string? format)
  {
    var resolvedFormat = ResolveFormat(inputPath, format);
    return resolvedFormat switch
    {
      "csv" => await ReadCsvAsync(inputPath),
      _ => await ReadJsonAsync(inputPath),
    };
  }

  private static string ResolveFormat(string inputPath, string? explicitFormat)
  {
    if (!string.IsNullOrWhiteSpace(explicitFormat))
    {
      return explicitFormat.Trim().ToLowerInvariant();
    }

    return Path.GetExtension(inputPath).ToLowerInvariant() switch
    {
      ".csv" => "csv",
      _ => "json",
    };
  }

  private static async Task<IReadOnlyList<HeritageSiteImportRecord>> ReadJsonAsync(string inputPath)
  {
    await using var stream = File.OpenRead(inputPath);
    using var document = await JsonDocument.ParseAsync(stream);

    var rows = new List<HeritageSiteImportRecord>();
    foreach (var item in ResolveJsonItems(document.RootElement))
    {
      rows.Add(new HeritageSiteImportRecord(
        GetJsonString(item, "$id", "id"),
        GetJsonString(item, "name"),
        GetJsonString(item, "description"),
        GetJsonString(item, "latitude"),
        GetJsonString(item, "longitude"),
        GetJsonString(item, "stampRadius", "stamp_radius"),
        GetJsonString(item, "isFree", "is_free"),
        GetJsonString(item, "stamp", "stampUrl", "stamp_url"),
        GetJsonString(item, "coverPhoto", "coverPhotoUrl", "cover_photo", "cover_photo_url"),
        GetJsonString(item, "type"),
        GetJsonString(item, "subType", "sub_type"),
        GetJsonString(item, "location"),
        GetJsonString(item, "legalStatus", "legal_status"),
        GetJsonString(item, "comuna"),
        GetJsonString(item, "region"),
        GetJsonString(item, "route"),
        GetJsonString(item, "website")));
    }

    return rows;
  }

  private static IEnumerable<JsonElement> ResolveJsonItems(JsonElement root)
  {
    if (root.ValueKind == JsonValueKind.Array)
    {
      foreach (var item in root.EnumerateArray())
      {
        if (item.ValueKind == JsonValueKind.Object)
        {
          yield return item;
        }
      }

      yield break;
    }

    if (root.ValueKind != JsonValueKind.Object)
    {
      yield break;
    }

    foreach (var propertyName in new[] { "rows", "documents", "items", "data" })
    {
      if (TryGetJsonProperty(root, propertyName, out var property) && property.ValueKind == JsonValueKind.Array)
      {
        foreach (var item in property.EnumerateArray())
        {
          if (item.ValueKind == JsonValueKind.Object)
          {
            yield return item;
          }
        }

        yield break;
      }
    }

    yield return root;
  }

  private static string? GetJsonString(JsonElement element, params string[] propertyNames)
  {
    foreach (var propertyName in propertyNames)
    {
      if (!TryGetJsonProperty(element, propertyName, out var property))
      {
        continue;
      }

      return property.ValueKind switch
      {
        JsonValueKind.Null => null,
        JsonValueKind.String => property.GetString(),
        JsonValueKind.True => bool.TrueString,
        JsonValueKind.False => bool.FalseString,
        _ => property.GetRawText(),
      };
    }

    return null;
  }

  private static bool TryGetJsonProperty(JsonElement element, string propertyName, out JsonElement value)
  {
    foreach (var property in element.EnumerateObject())
    {
      if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
      {
        value = property.Value;
        return true;
      }
    }

    value = default;
    return false;
  }

  private static async Task<IReadOnlyList<HeritageSiteImportRecord>> ReadCsvAsync(string inputPath)
  {
    var records = new List<HeritageSiteImportRecord>();

    using var reader = CreateTextReader(inputPath);
    using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

    await csv.ReadAsync();
    csv.ReadHeader();
    var headers = csv.HeaderRecord ?? Array.Empty<string>();

    while (await csv.ReadAsync())
    {
      string? GetValue(params string[] names)
      {
        foreach (var name in names)
        {
          var header = headers.FirstOrDefault(item => string.Equals(item, name, StringComparison.OrdinalIgnoreCase));
          if (header is not null)
          {
            return csv.GetField(header);
          }
        }

        return null;
      }

      records.Add(new HeritageSiteImportRecord(
        GetValue("$id", "id"),
        GetValue("name"),
        GetValue("description"),
        GetValue("latitude"),
        GetValue("longitude"),
        GetValue("stampRadius", "stamp_radius"),
        GetValue("isFree", "is_free"),
        GetValue("stamp", "stampUrl", "stamp_url"),
        GetValue("coverPhoto", "coverPhotoUrl", "cover_photo", "cover_photo_url"),
        GetValue("type"),
        GetValue("subType", "sub_type"),
        GetValue("location"),
        GetValue("legalStatus", "legal_status"),
        GetValue("comuna"),
        GetValue("region"),
        GetValue("route"),
        GetValue("website")));
    }

    return records;
  }

  private static StreamReader CreateTextReader(string inputPath)
  {
    var bytes = File.ReadAllBytes(inputPath);
    var encoding = DetectEncoding(bytes);
    var stream = new MemoryStream(bytes, writable: false);
    return new StreamReader(stream, encoding, detectEncodingFromByteOrderMarks: true);
  }

  private static Encoding DetectEncoding(byte[] bytes)
  {
    try
    {
      _ = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true).GetString(bytes);
      return new UTF8Encoding(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);
    }
    catch (DecoderFallbackException)
    {
      return Encoding.GetEncoding(1252);
    }
  }
}

internal sealed record HeritageSiteImportRecord(
  string? RawId,
  string? RawName,
  string? RawDescription,
  string? RawLatitude,
  string? RawLongitude,
  string? RawStampRadius,
  string? RawIsFree,
  string? RawStamp,
  string? RawCoverPhoto,
  string? RawType,
  string? RawSubType,
  string? RawLocation,
  string? RawLegalStatus,
  string? RawComuna,
  string? RawRegion,
  string? RawRoute,
  string? RawWebsite)
{
  public bool TryNormalize(out NormalizedHeritageSiteRecord normalized, out string error)
  {
    normalized = default!;

    if (string.IsNullOrWhiteSpace(RawId))
    {
      error = "Missing site id.";
      return false;
    }

    if (string.IsNullOrWhiteSpace(RawName))
    {
      error = "Missing site name.";
      return false;
    }

    if (!TryParseDouble(RawLatitude, out var latitude))
    {
      error = "Invalid latitude.";
      return false;
    }

    if (!TryParseDouble(RawLongitude, out var longitude))
    {
      error = "Invalid longitude.";
      return false;
    }

    var stampRadius = TryParseInteger(RawStampRadius, out var parsedStampRadius) ? parsedStampRadius : 0;
    var isFree = TryParseBoolean(RawIsFree, out var parsedIsFree) ? parsedIsFree : false;

    normalized = new NormalizedHeritageSiteRecord(
      RawId.Trim(),
      RawName.Trim(),
      NormalizeText(RawDescription),
      latitude,
      longitude,
      stampRadius,
      isFree,
      NormalizeText(RawStamp),
      NormalizeText(RawCoverPhoto),
      NormalizeText(RawType),
      NormalizeText(RawSubType),
      NormalizeText(RawLocation),
      NormalizeText(RawLegalStatus),
      NormalizeText(RawComuna),
      NormalizeText(RawRegion),
      NormalizeText(RawRoute),
      NormalizeText(RawWebsite));

    error = string.Empty;
    return true;
  }

  private static string? NormalizeText(string? value)
  {
    return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
  }

  private static bool TryParseDouble(string? value, out double result)
  {
    return double.TryParse(value, NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out result) ||
      double.TryParse(value, NumberStyles.Float | NumberStyles.AllowThousands, CultureInfo.GetCultureInfo("es-CL"), out result);
  }

  private static bool TryParseInteger(string? value, out int result)
  {
    if (int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out result))
    {
      return true;
    }

    if (TryParseDouble(value, out var doubleValue))
    {
      result = Convert.ToInt32(Math.Round(doubleValue, MidpointRounding.AwayFromZero));
      return true;
    }

    result = 0;
    return false;
  }

  private static bool TryParseBoolean(string? value, out bool result)
  {
    if (bool.TryParse(value, out result))
    {
      return true;
    }

    if (string.Equals(value, "1", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(value, "yes", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(value, "si", StringComparison.OrdinalIgnoreCase))
    {
      result = true;
      return true;
    }

    if (string.Equals(value, "0", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(value, "no", StringComparison.OrdinalIgnoreCase))
    {
      result = false;
      return true;
    }

    result = false;
    return false;
  }
}

internal sealed record NormalizedHeritageSiteRecord(
  string Id,
  string Name,
  string? Description,
  double Latitude,
  double Longitude,
  int StampRadiusMeters,
  bool IsFree,
  string? StampUrl,
  string? CoverPhotoUrl,
  string? Type,
  string? SubType,
  string? Location,
  string? LegalStatus,
  string? Comuna,
  string? Region,
  string? Route,
  string? Website);

internal static class ImporterUtilities
{
  public static string ResolveAwsRegion(string resourceArn)
  {
    var parts = resourceArn.Split(':', StringSplitOptions.RemoveEmptyEntries);
    if (parts.Length >= 4 && !string.IsNullOrWhiteSpace(parts[3]))
    {
      return parts[3];
    }

    return Environment.GetEnvironmentVariable("AWS_REGION")
      ?? Environment.GetEnvironmentVariable("AWS_DEFAULT_REGION")
      ?? "us-east-1";
  }
}

internal static class DataApiHeritageSiteImporter
{
  private const string UpsertSql =
    """
    INSERT INTO heritage_sites
      ("Id","Name","Description","IsFree","StampUrl","CoverPhotoUrl","Type","SubType","Location","LegalStatus","Comuna","Region","StampRadiusMeters","Route","Website","Latitude","Longitude")
    VALUES
      (:id,:name,:description,:isFree,:stampUrl,:coverPhotoUrl,:type,:subType,:location,:legalStatus,:comuna,:region,:stampRadiusMeters,:route,:website,:latitude,:longitude)
    ON CONFLICT ("Id") DO UPDATE SET
      "Name" = EXCLUDED."Name",
      "Description" = EXCLUDED."Description",
      "IsFree" = EXCLUDED."IsFree",
      "StampUrl" = EXCLUDED."StampUrl",
      "CoverPhotoUrl" = EXCLUDED."CoverPhotoUrl",
      "Type" = EXCLUDED."Type",
      "SubType" = EXCLUDED."SubType",
      "Location" = EXCLUDED."Location",
      "LegalStatus" = EXCLUDED."LegalStatus",
      "Comuna" = EXCLUDED."Comuna",
      "Region" = EXCLUDED."Region",
      "StampRadiusMeters" = EXCLUDED."StampRadiusMeters",
      "Route" = EXCLUDED."Route",
      "Website" = EXCLUDED."Website",
      "Latitude" = EXCLUDED."Latitude",
      "Longitude" = EXCLUDED."Longitude";
    """;

  public static async Task<int> ImportAsync(
    IAmazonRDSDataService client,
    string resourceArn,
    string secretArn,
    string databaseName,
    IReadOnlyList<NormalizedHeritageSiteRecord> rows,
    CancellationToken cancellationToken)
  {
    if (rows.Count == 0)
    {
      return 0;
    }

    var transactionId = (await client.BeginTransactionAsync(new BeginTransactionRequest
    {
      ResourceArn = resourceArn,
      SecretArn = secretArn,
      Database = databaseName,
    }, cancellationToken)).TransactionId;

    try
    {
      foreach (var row in rows)
      {
        await client.ExecuteStatementAsync(new ExecuteStatementRequest
        {
          ResourceArn = resourceArn,
          SecretArn = secretArn,
          Database = databaseName,
          TransactionId = transactionId,
          Sql = UpsertSql,
          Parameters = BuildParameters(row),
        }, cancellationToken);
      }

      await client.CommitTransactionAsync(new CommitTransactionRequest
      {
        ResourceArn = resourceArn,
        SecretArn = secretArn,
        TransactionId = transactionId,
      }, cancellationToken);

      return rows.Count;
    }
    catch
    {
      await client.RollbackTransactionAsync(new RollbackTransactionRequest
      {
        ResourceArn = resourceArn,
        SecretArn = secretArn,
        TransactionId = transactionId,
      }, cancellationToken);

      throw;
    }
  }

  private static List<SqlParameter> BuildParameters(NormalizedHeritageSiteRecord row)
  {
    return new List<SqlParameter>
    {
      StringParameter("id", row.Id),
      StringParameter("name", row.Name),
      NullableStringParameter("description", row.Description),
      BooleanParameter("isFree", row.IsFree),
      NullableStringParameter("stampUrl", row.StampUrl),
      NullableStringParameter("coverPhotoUrl", row.CoverPhotoUrl),
      NullableStringParameter("type", row.Type),
      NullableStringParameter("subType", row.SubType),
      NullableStringParameter("location", row.Location),
      NullableStringParameter("legalStatus", row.LegalStatus),
      NullableStringParameter("comuna", row.Comuna),
      NullableStringParameter("region", row.Region),
      LongParameter("stampRadiusMeters", row.StampRadiusMeters),
      NullableStringParameter("route", row.Route),
      NullableStringParameter("website", row.Website),
      DoubleParameter("latitude", row.Latitude),
      DoubleParameter("longitude", row.Longitude),
    };
  }

  private static SqlParameter StringParameter(string name, string value)
    => new() { Name = name, Value = new Field { StringValue = value } };

  private static SqlParameter NullableStringParameter(string name, string? value)
    => new()
    {
      Name = name,
      Value = string.IsNullOrWhiteSpace(value)
        ? new Field { IsNull = true }
        : new Field { StringValue = value }
    };

  private static SqlParameter BooleanParameter(string name, bool value)
    => new() { Name = name, Value = new Field { BooleanValue = value } };

  private static SqlParameter LongParameter(string name, int value)
    => new() { Name = name, Value = new Field { LongValue = value } };

  private static SqlParameter DoubleParameter(string name, double value)
    => new() { Name = name, Value = new Field { DoubleValue = value } };
}
