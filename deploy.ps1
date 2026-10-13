# ==============================================================================
# Café Compass — Google Cloud Run Deployment Script (PowerShell for Windows)
# Usage: .\deploy.ps1 [-ProjectId "your-gcp-project-id"] [-Region "us-central1"]
# ==============================================================================

param (
    [Parameter(Mandatory=$false)]
    [string]$ProjectId,

    [Parameter(Mandatory=$false)]
    [string]$Region = "us-central1"
)

# Keep ErrorActionPreference as Continue so gcloud stderr info messages don't halt PowerShell
$ErrorActionPreference = "Continue"

# 1. Detect Project ID if not supplied
if (-not $ProjectId) {
    $ProjectId = (gcloud config get-value project 2>$null).Trim()
}

if (-not $ProjectId) {
    Write-Host "Error: No GCP Project ID specified. Usage: .\deploy.ps1 -ProjectId 'your-gcp-project-id'" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Deploying Café Compass to Google Cloud Run" -ForegroundColor Cyan
Write-Host " Project: $ProjectId | Region: $Region" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 2. Enable Required GCP APIs
Write-Host "`n[1/4] Ensuring required GCP services are enabled..." -ForegroundColor Yellow
gcloud services enable `
    run.googleapis.com `
    artifactregistry.googleapis.com `
    cloudbuild.googleapis.com `
    secretmanager.googleapis.com `
    storage.googleapis.com `
    --project $ProjectId --quiet

# 3. Grant IAM Permissions to the Service Account
Write-Host "`n[2/4] Granting Secret Manager & Storage roles to Service Account..." -ForegroundColor Yellow
$ProjectNumber = (gcloud projects describe $ProjectId --format="value(projectNumber)").Trim()
$ComputeSA = "$ProjectNumber-compute@developer.gserviceaccount.com"

Write-Host "  -> Granting secretmanager.secretAccessor..." -ForegroundColor Gray
gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$ComputeSA" `
    --role="roles/secretmanager.secretAccessor" `
    --condition=None --quiet >$null 2>&1

Write-Host "  -> Granting storage.admin..." -ForegroundColor Gray
gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$ComputeSA" `
    --role="roles/storage.admin" `
    --condition=None --quiet >$null 2>&1

Write-Host "  -> Granting cloudbuild.builds.builder..." -ForegroundColor Gray
gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$ComputeSA" `
    --role="roles/cloudbuild.builds.builder" `
    --condition=None --quiet >$null 2>&1

Write-Host "  -> Granting datastore.user for Firestore (default)..." -ForegroundColor Gray
gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$ComputeSA" `
    --role="roles/datastore.user" `
    --condition=None --quiet >$null 2>&1

# 4. Build and push image with Cloud Build
$ImageTag = "gcr.io/$ProjectId/cafe-compass:latest"
Write-Host "`n[3/4] Submitting container build to Google Cloud Build ($ImageTag)..." -ForegroundColor Yellow
Write-Host "Note: Uploading lightweight source package (.gcloudignore excludes node_modules)..." -ForegroundColor Gray

gcloud builds submit --tag $ImageTag --project $ProjectId
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nCloud Build encountered an error. Please review the build log above." -ForegroundColor Red
    exit 1
}

# 5. Detect Secret Manager secrets and deploy
Write-Host "`n[4/4] Detecting Secret Manager secrets and deploying to Cloud Run..." -ForegroundColor Yellow

$SecretsList = @()
$knownSecrets = @("GEMINI_API_KEY_MAYA", "GEMINI_API_KEY_LEO", "GEMINI_API_KEY_SAM", "GEMINI_API_KEY", "STAFF_PIN")

foreach ($sec in $knownSecrets) {
    $secDesc = gcloud secrets describe $sec --project $ProjectId 2>$null
    if ($LASTEXITCODE -eq 0) {
        $SecretsList += "$sec=${sec}:latest"
        Write-Host "  -> Attached Secret: $sec:latest" -ForegroundColor Green
    }
}

$deployArgs = @(
    "run", "deploy", "cafe-compass",
    "--image", $ImageTag,
    "--platform", "managed",
    "--region", $Region,
    "--allow-unauthenticated",
    "--memory", "1Gi",
    "--cpu", "1",
    "--min-instances", "0",
    "--max-instances", "10",
    "--port", "8080",
    "--set-env-vars", "NODE_ENV=production",
    "--project", $ProjectId
)

if ($SecretsList.Count -gt 0) {
    $SecretString = $SecretsList -join ","
    $deployArgs += "--set-secrets"
    $deployArgs += $SecretString
}

Write-Host "`nDeploying to Cloud Run..." -ForegroundColor Yellow
& gcloud @deployArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n==========================================================" -ForegroundColor Cyan
    Write-Host " Deployment Complete!" -ForegroundColor Green
    $ServiceUrl = gcloud run services describe cafe-compass --platform managed --region $Region --project $ProjectId --format "value(status.url)"
    Write-Host " Live Service URL: $ServiceUrl" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Cyan
} else {
    Write-Host "`nCloud Run deployment encountered an issue. See details above." -ForegroundColor Red
}
