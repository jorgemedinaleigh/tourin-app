using System.Globalization;
using Amazon.CDK;
using Amazon.CDK.AWS.Apigatewayv2;
using Amazon.CDK.AWS.CloudFront;
using Amazon.CDK.AWS.CloudFront.Origins;
using Amazon.CDK.AWS.CloudWatch;
using Amazon.CDK.AWS.Cognito;
using Amazon.CDK.AWS.EC2;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.RDS;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AwsApigatewayv2Authorizers;
using Amazon.CDK.AwsApigatewayv2Integrations;
using Constructs;
using ApiGatewayHttpMethod = Amazon.CDK.AWS.Apigatewayv2.HttpMethod;
using LambdaFunction = Amazon.CDK.AWS.Lambda.Function;
using LambdaFunctionProps = Amazon.CDK.AWS.Lambda.FunctionProps;

internal sealed class TourinInfrastructureStack : Stack
{
  public TourinInfrastructureStack(
    Construct scope,
    string id,
    TourinInfrastructureConfig configuration,
    StackProps? props = null)
    : base(scope, id, props)
  {
    var prefix = $"{configuration.ProjectSlug}-{configuration.EnvironmentSlug}";
    var databaseName = configuration.DatabaseName;

    var userPool = new UserPool(this, "UserPool", new UserPoolProps
    {
      UserPoolName = $"{prefix}-users",
      SelfSignUpEnabled = true,
      SignInAliases = new SignInAliases
      {
        Email = true,
      },
      SignInCaseSensitive = false,
      AutoVerify = new AutoVerifiedAttrs
      {
        Email = true,
      },
      AccountRecovery = AccountRecovery.EMAIL_ONLY,
      PasswordPolicy = new PasswordPolicy
      {
        MinLength = 8,
        RequireDigits = true,
        RequireLowercase = true,
        RequireUppercase = true,
        RequireSymbols = false,
      },
      StandardAttributes = new StandardAttributes
      {
        Email = new StandardAttribute
        {
          Required = true,
          Mutable = true,
        },
        Fullname = new StandardAttribute
        {
          Required = true,
          Mutable = true,
        },
      },
    });
    userPool.ApplyRemovalPolicy(configuration.IsProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY);

    var clientAttributes = new ClientAttributes()
      .WithStandardAttributes(new StandardAttributesMask
      {
        Email = true,
        Fullname = true,
      });

    var userPoolClient = new UserPoolClient(this, "UserPoolClient", new UserPoolClientProps
    {
      UserPool = userPool,
      UserPoolClientName = $"{prefix}-mobile",
      GenerateSecret = false,
      AuthFlows = new AuthFlow
      {
        UserPassword = true,
        UserSrp = true,
      },
      PreventUserExistenceErrors = true,
      EnableTokenRevocation = true,
      AccessTokenValidity = Duration.Hours(1),
      IdTokenValidity = Duration.Hours(1),
      RefreshTokenValidity = Duration.Days(30),
      ReadAttributes = clientAttributes,
      WriteAttributes = clientAttributes,
    });

    var vpc = new Vpc(this, "Vpc", new VpcProps
    {
      VpcName = $"{prefix}-vpc",
      MaxAzs = 2,
      NatGateways = 1,
      SubnetConfiguration = new[]
      {
        new SubnetConfiguration
        {
          Name = "public",
          CidrMask = 24,
          SubnetType = SubnetType.PUBLIC,
        },
        new SubnetConfiguration
        {
          Name = "application",
          CidrMask = 24,
          SubnetType = SubnetType.PRIVATE_WITH_EGRESS,
        },
        new SubnetConfiguration
        {
          Name = "data",
          CidrMask = 24,
          SubnetType = SubnetType.PRIVATE_ISOLATED,
        },
      },
    });

    var databaseSecurityGroup = new SecurityGroup(this, "DatabaseSecurityGroup", new SecurityGroupProps
    {
      Vpc = vpc,
      SecurityGroupName = $"{prefix}-database-sg",
      Description = "Security group for Aurora PostgreSQL.",
      AllowAllOutbound = true,
    });

    var proxySecurityGroup = new SecurityGroup(this, "ProxySecurityGroup", new SecurityGroupProps
    {
      Vpc = vpc,
      SecurityGroupName = $"{prefix}-proxy-sg",
      Description = "Security group for RDS Proxy.",
      AllowAllOutbound = true,
    });

    var lambdaSecurityGroup = new SecurityGroup(this, "LambdaSecurityGroup", new SecurityGroupProps
    {
      Vpc = vpc,
      SecurityGroupName = $"{prefix}-lambda-sg",
      Description = "Security group for the Tourin API Lambda function.",
      AllowAllOutbound = true,
    });

    databaseSecurityGroup.AddIngressRule(proxySecurityGroup, Port.Tcp(5432), "Allow proxy access to Aurora.");
    proxySecurityGroup.AddIngressRule(lambdaSecurityGroup, Port.Tcp(5432), "Allow Lambda access to the proxy.");
    databaseSecurityGroup.AddIngressRule(lambdaSecurityGroup, Port.Tcp(5432), "Allow Lambda direct access to Aurora.");

    var database = new DatabaseCluster(this, "Database", new DatabaseClusterProps
    {
      ClusterIdentifier = $"{prefix}-aurora",
      DefaultDatabaseName = databaseName,
      EnableDataApi = true,
      Engine = DatabaseClusterEngine.AuroraPostgres(new AuroraPostgresClusterEngineProps
      {
        Version = AuroraPostgresEngineVersion.VER_16_6,
      }),
      Credentials = Credentials.FromGeneratedSecret("tourin_app"),
      Writer = ClusterInstance.ServerlessV2("writer"),
      ServerlessV2MinCapacity = configuration.ServerlessMinCapacity,
      ServerlessV2MaxCapacity = configuration.ServerlessMaxCapacity,
      DeletionProtection = configuration.IsProduction,
      RemovalPolicy = configuration.IsProduction ? RemovalPolicy.SNAPSHOT : RemovalPolicy.DESTROY,
      StorageEncrypted = true,
      Vpc = vpc,
      VpcSubnets = new SubnetSelection
      {
        SubnetType = SubnetType.PRIVATE_ISOLATED,
      },
      SecurityGroups = new[] { databaseSecurityGroup },
    });

    var databaseSecret = database.Secret
      ?? throw new InvalidOperationException("The generated Aurora secret was not created.");

    var databaseProxy = database.AddProxy("DatabaseProxy", new DatabaseProxyOptions
    {
      DbProxyName = $"{prefix}-proxy",
      Vpc = vpc,
      Secrets = new[] { databaseSecret },
      RequireTLS = true,
      DebugLogging = !configuration.IsProduction,
      IamAuth = false,
      MaxConnectionsPercent = 100,
      MaxIdleConnectionsPercent = 50,
      BorrowTimeout = Duration.Seconds(30),
      SecurityGroups = new[] { proxySecurityGroup },
      VpcSubnets = new SubnetSelection
      {
        SubnetType = SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    var avatarBucket = new Bucket(this, "AvatarBucket", new BucketProps
    {
      BucketName = $"{prefix}-avatars-{Account}-{Region}".ToLowerInvariant(),
      BlockPublicAccess = BlockPublicAccess.BLOCK_ALL,
      EnforceSSL = true,
      Encryption = BucketEncryption.S3_MANAGED,
      AutoDeleteObjects = !configuration.IsProduction,
      RemovalPolicy = configuration.IsProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      Cors = new[]
      {
        new CorsRule
        {
          AllowedMethods = new[] { HttpMethods.GET, HttpMethods.HEAD, HttpMethods.PUT },
          AllowedOrigins = configuration.AllowedAvatarCorsOrigins,
          AllowedHeaders = new[] { "*" },
          ExposedHeaders = new[] { "ETag" },
        },
      },
    });

    var avatarDistribution = configuration.CreateCloudFrontDistribution
      ? new Distribution(this, "AvatarDistribution", new DistributionProps
      {
        Comment = $"{prefix} avatar distribution",
        DefaultBehavior = new BehaviorOptions
        {
          Origin = S3BucketOrigin.WithOriginAccessControl(avatarBucket),
          ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          AllowedMethods = AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          CachePolicy = CachePolicy.CACHING_OPTIMIZED,
        },
      })
      : null;

    var lambdaRole = new Role(this, "ApiRole", new RoleProps
    {
      RoleName = $"{prefix}-api-role",
      AssumedBy = new ServicePrincipal("lambda.amazonaws.com"),
      ManagedPolicies = new[]
      {
        ManagedPolicy.FromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
        ManagedPolicy.FromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"),
      },
    });

    avatarBucket.GrantReadWrite(lambdaRole);
    databaseSecret.GrantRead(lambdaRole);
    var connectionString = Fn.Sub(
      "Host=${host};Port=5432;Database=${database};Username=${username};Password=${password};SSL Mode=Require;Trust Server Certificate=true",
      new Dictionary<string, string>
      {
        ["host"] = database.ClusterEndpoint.Hostname,
        ["database"] = databaseName,
        ["username"] = databaseSecret.SecretValueFromJson("username").ToString(),
        ["password"] = databaseSecret.SecretValueFromJson("password").ToString(),
      });

    var lambdaBuild = configuration.ResolveLambdaBuild();
    var apiCode = ResolveApiCode(configuration, lambdaBuild);

    var apiFunction = new LambdaFunction(this, "ApiFunction", new LambdaFunctionProps
    {
      FunctionName = $"{prefix}-api",
      Description = $"Tourin API for the {configuration.EnvironmentName} environment.",
      Runtime = Runtime.PROVIDED_AL2023,
      Handler = "bootstrap",
      Architecture = lambdaBuild.Architecture,
      Code = apiCode,
      MemorySize = 1024,
      Timeout = Duration.Seconds(30),
      Tracing = Tracing.ACTIVE,
      Role = lambdaRole,
      Vpc = vpc,
      VpcSubnets = new SubnetSelection
      {
        SubnetType = SubnetType.PRIVATE_WITH_EGRESS,
      },
      SecurityGroups = new[] { lambdaSecurityGroup },
      Environment = new Dictionary<string, string>
      {
        ["ASPNETCORE_ENVIRONMENT"] = "Production",
        ["DOTNET_SYSTEM_GLOBALIZATION_INVARIANT"] = "1",
        ["Database__Provider"] = "postgres",
        ["Database__ConnectionString"] = connectionString,
        ["Auth__Region"] = Region,
        ["Auth__UserPoolId"] = userPool.UserPoolId,
        ["Auth__Authority"] = $"https://cognito-idp.{Region}.amazonaws.com/{userPool.UserPoolId}",
        ["Auth__RequireHttpsMetadata"] = "true",
        ["Storage__Region"] = Region,
        ["Storage__AvatarBucketName"] = avatarBucket.BucketName,
        ["Storage__PublicBaseUrl"] = avatarDistribution is null ? string.Empty : $"https://{avatarDistribution.DomainName}",
        ["Storage__UploadUrlExpiryMinutes"] = "15",
      },
    });

    var jwtAuthorizer = new HttpJwtAuthorizer(
      "JwtAuthorizer",
      $"https://cognito-idp.{Region}.amazonaws.com/{userPool.UserPoolId}",
      new HttpJwtAuthorizerProps
      {
        JwtAudience = new[] { userPoolClient.UserPoolClientId },
      });

    var integration = new HttpLambdaIntegration("ApiIntegration", apiFunction);

    var httpApi = new HttpApi(this, "HttpApi", new HttpApiProps
    {
      ApiName = $"{prefix}-http-api",
      Description = $"Tourin public and authenticated API for {configuration.EnvironmentName}.",
      CreateDefaultStage = true,
    });

    AddRoute(httpApi, integration, "/", ApiGatewayHttpMethod.GET);
    AddRoute(httpApi, integration, "/v1/health", ApiGatewayHttpMethod.GET);
    AddRoute(httpApi, integration, "/v1/leaderboard", ApiGatewayHttpMethod.GET);
    AddRoute(httpApi, integration, "/v1/map/sites", ApiGatewayHttpMethod.GET);
    AddRoute(httpApi, integration, "/v1/metro/stations", ApiGatewayHttpMethod.GET);

    AddRoute(httpApi, integration, "/v1/me", ApiGatewayHttpMethod.GET, jwtAuthorizer);
    AddRoute(httpApi, integration, "/v1/achievements", ApiGatewayHttpMethod.GET, jwtAuthorizer);
    AddRoute(httpApi, integration, "/v1/passport", ApiGatewayHttpMethod.GET, jwtAuthorizer);
    AddRoute(httpApi, integration, "/v1/visits/stamp", ApiGatewayHttpMethod.POST, jwtAuthorizer);
    AddRoute(httpApi, integration, "/v1/profile/avatar/upload-url", ApiGatewayHttpMethod.POST, jwtAuthorizer);
    AddRoute(httpApi, integration, "/v1/profile/avatar/complete", ApiGatewayHttpMethod.POST, jwtAuthorizer);

    _ = new Alarm(this, "ApiLambdaErrorsAlarm", new AlarmProps
    {
      AlarmName = $"{prefix}-lambda-errors",
      AlarmDescription = "Triggers when the Tourin API Lambda reports errors.",
      Metric = apiFunction.MetricErrors(new MetricOptions
      {
        Period = Duration.Minutes(5),
        Statistic = "sum",
      }),
      Threshold = 1,
      EvaluationPeriods = 1,
      TreatMissingData = TreatMissingData.NOT_BREACHING,
      ComparisonOperator = ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    _ = new Alarm(this, "ApiGatewayServerErrorsAlarm", new AlarmProps
    {
      AlarmName = $"{prefix}-http-api-5xx",
      AlarmDescription = "Triggers when the Tourin HTTP API returns server errors.",
      Metric = httpApi.MetricServerError(new MetricOptions
      {
        Period = Duration.Minutes(5),
        Statistic = "sum",
      }),
      Threshold = 1,
      EvaluationPeriods = 1,
      TreatMissingData = TreatMissingData.NOT_BREACHING,
      ComparisonOperator = ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    _ = new CfnOutput(this, "ApiEndpoint", new CfnOutputProps
    {
      Value = httpApi.ApiEndpoint,
      Description = "Base URL for the Tourin HTTP API.",
    });

    _ = new CfnOutput(this, "CognitoUserPoolId", new CfnOutputProps
    {
      Value = userPool.UserPoolId,
      Description = "Cognito user pool ID for the mobile client.",
    });

    _ = new CfnOutput(this, "CognitoUserPoolClientId", new CfnOutputProps
    {
      Value = userPoolClient.UserPoolClientId,
      Description = "Cognito app client ID for the mobile client.",
    });

    _ = new CfnOutput(this, "CognitoIssuer", new CfnOutputProps
    {
      Value = $"https://cognito-idp.{Region}.amazonaws.com/{userPool.UserPoolId}",
      Description = "JWT issuer used by API Gateway and the backend.",
    });

    _ = new CfnOutput(this, "AvatarBucketName", new CfnOutputProps
    {
      Value = avatarBucket.BucketName,
      Description = "S3 bucket that stores avatar uploads.",
    });

    _ = new CfnOutput(this, "AvatarPublicBaseUrl", new CfnOutputProps
    {
      Value = avatarDistribution is null ? string.Empty : $"https://{avatarDistribution.DomainName}",
      Description = "Public base URL used for avatar delivery.",
    });

    _ = new CfnOutput(this, "DatabaseProxyEndpoint", new CfnOutputProps
    {
      Value = databaseProxy.Endpoint,
      Description = "RDS Proxy endpoint used by the Lambda function.",
    });

    _ = new CfnOutput(this, "DatabaseClusterArn", new CfnOutputProps
    {
      Value = database.ClusterArn,
      Description = "Aurora cluster ARN for Data API operations.",
    });

    _ = new CfnOutput(this, "DatabaseSecretArn", new CfnOutputProps
    {
      Value = databaseSecret.SecretArn,
      Description = "Secrets Manager ARN for Data API operations.",
    });

    _ = new CfnOutput(this, "DatabaseName", new CfnOutputProps
    {
      Value = databaseName,
      Description = "Aurora database name.",
    });

    _ = new CfnOutput(this, "MobileEnvSnippet", new CfnOutputProps
    {
      Value = string.Join(System.Environment.NewLine, new[]
      {
        "EXPO_PUBLIC_AUTH_PROVIDER=cognito",
        $"EXPO_PUBLIC_API_BASE_URL={httpApi.ApiEndpoint}",
        $"EXPO_PUBLIC_AWS_REGION={Region}",
        $"EXPO_PUBLIC_COGNITO_USER_POOL_ID={userPool.UserPoolId}",
        $"EXPO_PUBLIC_COGNITO_USER_POOL_CLIENT_ID={userPoolClient.UserPoolClientId}",
      }),
      Description = "Environment variables required to enable the AWS backend in the Expo app.",
    });
  }

  private static void AddRoute(
    HttpApi api,
    HttpLambdaIntegration integration,
    string path,
    ApiGatewayHttpMethod method,
    IHttpRouteAuthorizer? authorizer = null)
  {
    var options = new AddRoutesOptions
    {
      Path = path,
      Methods = new[] { method },
      Integration = integration,
    };

    if (authorizer is not null)
    {
      options.Authorizer = authorizer;
    }

    api.AddRoutes(options);
  }

  private static Code ResolveApiCode(TourinInfrastructureConfig configuration, LambdaBuildConfiguration lambdaBuild)
  {
    if (!string.IsNullOrWhiteSpace(configuration.PrebuiltLambdaAssetPath))
    {
      if (!Directory.Exists(configuration.PrebuiltLambdaAssetPath))
      {
        throw new InvalidOperationException(
          $"The prebuilt Lambda asset directory does not exist: {configuration.PrebuiltLambdaAssetPath}");
      }

      return Code.FromAsset(configuration.PrebuiltLambdaAssetPath);
    }

    var apiProjectDirectory = Path.GetDirectoryName(configuration.BackendProjectPath)
      ?? throw new InvalidOperationException("The backend project directory could not be determined.");
    var backendRootDirectory = FindBackendRoot(apiProjectDirectory);
    var backendProjectPathInAsset = Path
      .GetRelativePath(backendRootDirectory, configuration.BackendProjectPath)
      .Replace('\\', '/');

    return Code.FromAsset(backendRootDirectory, new Amazon.CDK.AWS.S3.Assets.AssetOptions
    {
      Bundling = new BundlingOptions
      {
        Local = new DotNetLambdaBundling(configuration.BackendProjectPath, lambdaBuild.RuntimeIdentifier),
        Image = DockerImage.FromRegistry("mcr.microsoft.com/dotnet/sdk:9.0"),
        User = "root",
        OutputType = BundlingOutput.NOT_ARCHIVED,
        Command = new[]
          {
            "bash",
            "-lc",
            string.Join(" && ", new[]
            {
              $"dotnet publish /asset-input/{backendProjectPathInAsset} -c Release -r {lambdaBuild.RuntimeIdentifier} --self-contained true -o /asset-output",
              "cp \"$(find /root/.nuget/packages/microsoft.netcore.app.runtime.linux-x64 -path '*/runtimes/linux-x64/lib/net8.0/System.Text.Json.dll' | sort | tail -n1)\" /asset-output/System.Text.Json.dll",
              "printf '#!/bin/sh\\nset -e\\n./Tourin.Api\\n' > /asset-output/bootstrap",
              "chmod +x /asset-output/bootstrap /asset-output/Tourin.Api",
            }),
        },
      },
    });
  }

  private static string FindBackendRoot(string apiProjectDirectory)
  {
    var directory = new DirectoryInfo(apiProjectDirectory);

    while (directory is not null)
    {
      if (string.Equals(directory.Name, "backend", StringComparison.OrdinalIgnoreCase))
      {
        return directory.FullName;
      }

      directory = directory.Parent;
    }

    throw new InvalidOperationException("Could not determine the backend root directory.");
  }
}

internal sealed record LambdaBuildConfiguration(Architecture Architecture, string RuntimeIdentifier);

internal sealed class TourinInfrastructureConfig
{
  private TourinInfrastructureConfig()
  {
  }

  public required string ProjectName { get; init; }
  public required string EnvironmentName { get; init; }
  public required string AwsAccount { get; init; }
  public required string AwsRegion { get; init; }
  public required string DatabaseName { get; init; }
  public required string BackendProjectPath { get; init; }
  public required string LambdaArchitectureName { get; init; }
  public string? PrebuiltLambdaAssetPath { get; init; }
  public required double ServerlessMinCapacity { get; init; }
  public required double ServerlessMaxCapacity { get; init; }
  public required bool CreateCloudFrontDistribution { get; init; }
  public required string[] AllowedAvatarCorsOrigins { get; init; }

  public string ProjectSlug => ToSlug(ProjectName);
  public string EnvironmentSlug => ToSlug(EnvironmentName);
  public string StackName => $"{ProjectSlug}-{EnvironmentSlug}";
  public bool IsProduction => string.Equals(EnvironmentSlug, "prod", StringComparison.OrdinalIgnoreCase)
    || string.Equals(EnvironmentSlug, "production", StringComparison.OrdinalIgnoreCase);

  public static TourinInfrastructureConfig Load(App app)
  {
    var repositoryRoot = FindRepositoryRoot(Directory.GetCurrentDirectory());

    string Resolve(string contextKey, string environmentKey, string fallback)
    {
      var contextValue = app.Node.TryGetContext(contextKey)?.ToString();
      if (!string.IsNullOrWhiteSpace(contextValue))
      {
        return contextValue.Trim();
      }

      var environmentValue = System.Environment.GetEnvironmentVariable(environmentKey);
      if (!string.IsNullOrWhiteSpace(environmentValue))
      {
        return environmentValue.Trim();
      }

      return fallback;
    }

    static bool ParseBoolean(string value, bool fallback)
      => bool.TryParse(value, out var parsed) ? parsed : fallback;

    static double ParseDouble(string value, double fallback)
      => double.TryParse(value, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var parsed) ? parsed : fallback;

    static string[] ParseArray(string value, string fallback)
    {
      var source = string.IsNullOrWhiteSpace(value) ? fallback : value;
      return source
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();
    }

    var projectName = Resolve("tourin:projectName", "TOURIN_PROJECT_NAME", "tourin");
    var environmentName = Resolve("tourin:environmentName", "TOURIN_ENVIRONMENT_NAME", "dev");
    var awsAccount = Resolve("tourin:awsAccount", "TOURIN_AWS_ACCOUNT", System.Environment.GetEnvironmentVariable("CDK_DEFAULT_ACCOUNT") ?? string.Empty);
    var awsRegion = Resolve("tourin:awsRegion", "TOURIN_AWS_REGION", System.Environment.GetEnvironmentVariable("CDK_DEFAULT_REGION") ?? "us-east-1");
    var databaseName = Resolve("tourin:databaseName", "TOURIN_DATABASE_NAME", "tourin");
    var backendProject = Resolve("tourin:backendProjectPath", "TOURIN_BACKEND_PROJECT_PATH", "backend/src/Tourin.Api/Tourin.Api.csproj");
    var lambdaArchitecture = Resolve("tourin:lambdaArchitecture", "TOURIN_LAMBDA_ARCHITECTURE", "x86_64");
    var lambdaAssetPath = Resolve("tourin:lambdaAssetPath", "TOURIN_LAMBDA_ASSET_PATH", string.Empty);
    var minCapacity = ParseDouble(Resolve("tourin:serverlessMinCapacity", "TOURIN_SERVERLESS_MIN_CAPACITY", "0.5"), 0.5);
    var maxCapacity = ParseDouble(Resolve("tourin:serverlessMaxCapacity", "TOURIN_SERVERLESS_MAX_CAPACITY", "2"), 2);
    var createCloudFront = ParseBoolean(Resolve("tourin:createCloudFrontDistribution", "TOURIN_CREATE_CLOUDFRONT_DISTRIBUTION", "true"), true);
    var allowedCorsOrigins = ParseArray(
      Resolve("tourin:allowedAvatarCorsOrigins", "TOURIN_ALLOWED_AVATAR_CORS_ORIGINS", "*"),
      "*");

    return new TourinInfrastructureConfig
    {
      ProjectName = projectName,
      EnvironmentName = environmentName,
      AwsAccount = awsAccount,
      AwsRegion = awsRegion,
      DatabaseName = databaseName,
      BackendProjectPath = Path.GetFullPath(Path.Combine(repositoryRoot, backendProject)),
      LambdaArchitectureName = lambdaArchitecture,
      PrebuiltLambdaAssetPath = string.IsNullOrWhiteSpace(lambdaAssetPath)
        ? null
        : Path.GetFullPath(Path.Combine(repositoryRoot, lambdaAssetPath)),
      ServerlessMinCapacity = minCapacity,
      ServerlessMaxCapacity = maxCapacity,
      CreateCloudFrontDistribution = createCloudFront,
      AllowedAvatarCorsOrigins = allowedCorsOrigins,
    };
  }

  public LambdaBuildConfiguration ResolveLambdaBuild()
  {
    return LambdaArchitectureName.Trim().ToLowerInvariant() switch
    {
      "arm64" or "arm_64" => new LambdaBuildConfiguration(Architecture.ARM_64, "linux-arm64"),
      _ => new LambdaBuildConfiguration(Architecture.X86_64, "linux-x64"),
    };
  }

  private static string FindRepositoryRoot(string startDirectory)
  {
    var directory = new DirectoryInfo(startDirectory);
    while (directory is not null)
    {
      var hasPackageJson = File.Exists(Path.Combine(directory.FullName, "package.json"));
      var hasBackend = Directory.Exists(Path.Combine(directory.FullName, "backend"));
      var hasInfra = Directory.Exists(Path.Combine(directory.FullName, "infra"));

      if (hasPackageJson && hasBackend && hasInfra)
      {
        return directory.FullName;
      }

      directory = directory.Parent;
    }

    throw new InvalidOperationException("Could not determine the repository root.");
  }

  private static string ToSlug(string value)
  {
    var sanitized = new string(value
      .Trim()
      .ToLowerInvariant()
      .Select(ch => char.IsLetterOrDigit(ch) ? ch : '-')
      .ToArray());

    while (sanitized.Contains("--", StringComparison.Ordinal))
    {
      sanitized = sanitized.Replace("--", "-", StringComparison.Ordinal);
    }

    return sanitized.Trim('-');
  }
}
