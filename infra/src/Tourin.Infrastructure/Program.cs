using Amazon.CDK;
using CdkEnvironment = Amazon.CDK.Environment;

var app = new App();
var configuration = TourinInfrastructureConfig.Load(app);

_ = new TourinInfrastructureStack(
  app,
  configuration.StackName,
  configuration,
  new StackProps
  {
    Env = new CdkEnvironment
    {
      Account = configuration.AwsAccount,
      Region = configuration.AwsRegion,
    },
    Description = $"Tourin AWS infrastructure for the {configuration.EnvironmentName} environment.",
  });

app.Synth();
