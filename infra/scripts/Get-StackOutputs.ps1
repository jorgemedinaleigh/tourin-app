[CmdletBinding()]
param(
  [string]$EnvironmentName = "dev",
  [string]$ProjectName = "tourin"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI was not found on PATH."
}

$stackName = "$ProjectName-$EnvironmentName"
aws cloudformation describe-stacks `
  --stack-name $stackName `
  --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" `
  --output table
