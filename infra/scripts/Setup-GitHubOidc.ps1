[CmdletBinding()]
param(
  [string]$GitHubOwner = "jorgemedinaleigh",
  [string]$GitHubRepo = "tourin-app",
  [string]$RoleName = "tourin-github-actions-deploy",
  [string]$InlinePolicyName = "tourin-github-actions-deploy-policy",
  [string]$AwsAccountId,
  [string]$Thumbprint = "6938fd4d98bab03faadb97b34396831e3780aea1"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI was not found on PATH."
}

$awsCliPath = (Get-Command aws -ErrorAction Stop).Source

function Invoke-Aws {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [switch]$AllowFailure
  )

  $escapedArguments = $Arguments | ForEach-Object {
    if ($_ -match '[\s"]') {
      '"' + ($_ -replace '"', '\"') + '"'
    } else {
      $_
    }
  }

  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $awsCliPath
  $startInfo.Arguments = ($escapedArguments -join " ")
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true

  $process = [System.Diagnostics.Process]::Start($startInfo)
  if ($null -eq $process) {
    throw "Failed to start AWS CLI process."
  }

  $standardOutput = $process.StandardOutput.ReadToEnd()
  $standardError = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  $text = (
    @($standardOutput, $standardError) |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  ) -join [System.Environment]::NewLine
  $exitCode = $process.ExitCode

  if ($AllowFailure) {
    return [pscustomobject]@{
      ExitCode = $exitCode
      Output = $text
    }
  }

  if ($exitCode -ne 0) {
    throw "AWS CLI failed: aws $($Arguments -join ' ')$([System.Environment]::NewLine)$text"
  }

  return $text
}

if ([string]::IsNullOrWhiteSpace($AwsAccountId)) {
  $AwsAccountId = (Invoke-Aws -Arguments @("sts", "get-caller-identity", "--query", "Account", "--output", "text")).Trim()
}

$providerArn = "arn:aws:iam::${AwsAccountId}:oidc-provider/token.actions.githubusercontent.com"
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("tourin-oidc-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
  $providerExists = (Invoke-Aws -Arguments @("iam", "get-open-id-connect-provider", "--open-id-connect-provider-arn", $providerArn) -AllowFailure).ExitCode -eq 0

  if (-not $providerExists) {
    Write-Host "Creating GitHub Actions OIDC provider..."
    $providerArn = (Invoke-Aws -Arguments @(
        "iam",
        "create-open-id-connect-provider",
        "--url", "https://token.actions.githubusercontent.com",
        "--client-id-list", "sts.amazonaws.com",
        "--thumbprint-list", $Thumbprint,
        "--query", "OpenIDConnectProviderArn",
        "--output", "text"
      )).Trim()
  } else {
    Write-Host "GitHub Actions OIDC provider already exists."
  }

  $trustPolicyPath = Join-Path $tempDir "trust-policy.json"
  @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "$providerArn"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${GitHubOwner}/${GitHubRepo}:*"
        }
      }
    }
  ]
}
"@ | Set-Content -Path $trustPolicyPath -Encoding ascii

  $roleExists = (Invoke-Aws -Arguments @("iam", "get-role", "--role-name", $RoleName) -AllowFailure).ExitCode -eq 0

  if (-not $roleExists) {
    Write-Host "Creating IAM role '$RoleName'..."
    Invoke-Aws -Arguments @(
      "iam",
      "create-role",
      "--role-name", $RoleName,
      "--assume-role-policy-document", ("file://{0}" -f $trustPolicyPath),
      "--description", "Deploys the Tourin AWS dev stack from GitHub Actions."
    ) | Out-Null
  } else {
    Write-Host "IAM role '$RoleName' already exists. Updating trust policy..."
    Invoke-Aws -Arguments @(
      "iam",
      "update-assume-role-policy",
      "--role-name", $RoleName,
      "--policy-document", ("file://{0}" -f $trustPolicyPath)
    ) | Out-Null
  }

  $permissionsPolicyPath = Join-Path $tempDir "permissions-policy.json"
  @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "apigateway:*",
        "cloudformation:*",
        "cloudfront:*",
        "cloudwatch:*",
        "cognito-idp:*",
        "ec2:*",
        "events:*",
        "iam:*",
        "kms:*",
        "lambda:*",
        "logs:*",
        "rds:*",
        "s3:*",
        "secretsmanager:*",
        "ssm:*",
        "sts:AssumeRole",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:PassRole",
        "iam:CreateServiceLinkedRole"
      ],
      "Resource": "*"
    }
  ]
}
"@ | Set-Content -Path $permissionsPolicyPath -Encoding ascii

  Write-Host "Applying inline policy '$InlinePolicyName'..."
  Invoke-Aws -Arguments @(
    "iam",
    "put-role-policy",
    "--role-name", $RoleName,
    "--policy-name", $InlinePolicyName,
    "--policy-document", ("file://{0}" -f $permissionsPolicyPath)
  ) | Out-Null

  $roleArn = (Invoke-Aws -Arguments @(
      "iam",
      "get-role",
      "--role-name", $RoleName,
      "--query", "Role.Arn",
      "--output", "text"
    )).Trim()

  Write-Host ""
  Write-Host "GitHub OIDC setup complete."
  Write-Host "AWS_ROLE_TO_ASSUME=$roleArn"
  Write-Host "AWS_ACCOUNT_ID=$AwsAccountId"
  Write-Host "AWS_REGION=us-east-1"
}
finally {
  if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
  }
}
