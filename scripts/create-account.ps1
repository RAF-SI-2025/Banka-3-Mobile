param(
  [string]$BaseUrl = "http://localhost:8080",
  [string]$Email = "marko.petrovic@gmail.com",
  [string]$Password = "Test1234!",
  [int]$ClientId = 1,
  [ValidateSet("TEKUCI", "DEVIZNI", "STEDNI", "POSLOVNI")]
  [string]$AccountType = "TEKUCI",
  [string]$Subtype = "STANDARD",
  [string]$Currency = "RSD",
  [double]$InitialBalance = 0.1,
  [double]$DailyLimit = 0,
  [double]$MonthlyLimit = 0,
  [bool]$CreateCard = $true,
  [string]$CompanyName = "string",
  [string]$RegistrationNumber = "string",
  [string]$Pib = "string",
  [string]$ActivityCode = "10.1",
  [string]$Address = "string"
)

$ErrorActionPreference = "Stop"

function Read-ErrorBody($Exception) {
  if (-not $Exception.Response) {
    return $Exception.Exception.Message
  }

  $reader = New-Object System.IO.StreamReader($Exception.Response.GetResponseStream())
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Close()
  }
}

$loginBody = @{
  email = $Email
  password = $Password
} | ConvertTo-Json

try {
  $loginResponse = Invoke-RestMethod `
    -Uri "$BaseUrl/api/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $loginBody
} catch {
  Write-Host "Login failed:" -ForegroundColor Red
  Write-Host (Read-ErrorBody $_) -ForegroundColor Red
  exit 1
}

$accessToken = $loginResponse.accessToken
if (-not $accessToken) {
  $accessToken = $loginResponse.access_token
}

if (-not $accessToken) {
  Write-Host "Login response does not contain an access token." -ForegroundColor Red
  $loginResponse | ConvertTo-Json -Depth 10
  exit 1
}

$headers = @{
  Authorization = "Bearer $accessToken"
  "Content-Type" = "application/json"
}

$accountBody = @{
  client_id = $ClientId
  account_type = $AccountType
  subtype = $Subtype
  currency = $Currency
  initial_balance = $InitialBalance
  daily_limit = $DailyLimit
  monthly_limit = $MonthlyLimit
  create_card = $CreateCard
  business_info = @{
    company_name = $CompanyName
    registration_number = $RegistrationNumber
    pib = $Pib
    activity_code = $ActivityCode
    address = $Address
  }
} | ConvertTo-Json -Depth 5

Write-Host "Creating account on $BaseUrl/api/accounts ..." -ForegroundColor Cyan

try {
  $response = Invoke-RestMethod `
    -Uri "$BaseUrl/api/accounts" `
    -Method Post `
    -Headers $headers `
    -Body $accountBody

  Write-Host "Account created successfully." -ForegroundColor Green
  $response | ConvertTo-Json -Depth 10
} catch {
  $statusCode = $null
  if ($_.Exception.Response) {
    $statusCode = [int]$_.Exception.Response.StatusCode
  }

  Write-Host "Account creation failed." -ForegroundColor Red
  if ($statusCode -ne $null) {
    Write-Host "HTTP status: $statusCode" -ForegroundColor Yellow
  }
  Write-Host (Read-ErrorBody $_) -ForegroundColor Red
  exit 1
}
