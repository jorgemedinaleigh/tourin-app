[CmdletBinding()]
param(
  [string]$EnvironmentName = "dev",
  [string]$ProjectName = "tourin",
  [string]$Region = "us-east-1",
  [string]$AwsAccountId
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI was not found on PATH."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm was not found on PATH."
}

if ([string]::IsNullOrWhiteSpace($AwsAccountId)) {
  $AwsAccountId = (aws sts get-caller-identity --query Account --output text).Trim()
}

if (-not (Get-Command cdk -ErrorAction SilentlyContinue)) {
  Write-Host "Installing AWS CDK CLI..."
  npm install -g aws-cdk | Out-Host
}

$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$lambdaAssetPath = Join-Path $repositoryRoot ".artifacts\tourin-api"
$apiProjectPath = Join-Path $repositoryRoot "backend\src\Tourin.Api\Tourin.Api.csproj"
$nuGetPackagesRoot = Join-Path $env:USERPROFILE ".nuget\packages\microsoft.netcore.app.runtime.linux-x64"
$systemTextJsonPath = Get-ChildItem -Path $nuGetPackagesRoot -Directory |
  Sort-Object Name -Descending |
  ForEach-Object { Join-Path $_.FullName "runtimes\linux-x64\lib\net8.0\System.Text.Json.dll" } |
  Where-Object { Test-Path $_ } |
  Select-Object -First 1

if (Test-Path $lambdaAssetPath) {
  Remove-Item -Path $lambdaAssetPath -Recurse -Force
}

Write-Host "Publishing the Tourin API Lambda asset..."
dotnet publish $apiProjectPath `
  -c Release `
  -r linux-x64 `
  --self-contained true `
  -o $lambdaAssetPath

if ([string]::IsNullOrWhiteSpace($systemTextJsonPath)) {
  throw "System.Text.Json.dll was not found under $nuGetPackagesRoot."
}

Copy-Item -Path $systemTextJsonPath -Destination (Join-Path $lambdaAssetPath "System.Text.Json.dll") -Force

[System.IO.File]::WriteAllText(
  (Join-Path $lambdaAssetPath "bootstrap"),
  "#!/bin/sh`nset -e`n./Tourin.Api`n",
  [System.Text.Encoding]::ASCII)

$env:TOURIN_PROJECT_NAME = $ProjectName
$env:TOURIN_ENVIRONMENT_NAME = $EnvironmentName
$env:TOURIN_AWS_ACCOUNT = $AwsAccountId
$env:TOURIN_AWS_REGION = $Region
$env:TOURIN_LAMBDA_ASSET_PATH = $lambdaAssetPath

Push-Location (Join-Path $repositoryRoot "infra")
try {
  Write-Host "Deploying the Tourin infrastructure stack..."
  cdk deploy --all --require-approval never

  $stackName = "$ProjectName-$EnvironmentName"
  Write-Host "CloudFormation outputs for ${stackName}:"
  aws cloudformation describe-stacks `
    --stack-name $stackName `
    --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" `
    --output table
}
finally {
  Pop-Location
}
