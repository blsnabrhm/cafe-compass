#!/usr/bin/env bash
set -e

# ==============================================================================
# Café Compass — Google Cloud Run Deployment Script (Bash)
# Usage: ./deploy.sh [GCP_PROJECT_ID] [REGION]
# ==============================================================================

PROJECT_ID=${1:-$(gcloud config get-value project 2>/dev/null)}
REGION=${2:-"us-central1"}
SERVICE_NAME="cafe-compass"
IMAGE_TAG="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: No GCP Project ID specified."
  echo "Usage: ./deploy.sh <YOUR_PROJECT_ID> [REGION]"
  exit 1
fi

echo "=========================================================="
echo " Deploying Café Compass to Google Cloud Run"
echo " Project: $PROJECT_ID | Region: $REGION"
echo "=========================================================="

# 1. Enable Required Services
echo "[1/4] Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  --project "$PROJECT_ID"

# 2. Grant Secret Manager Accessor and Storage permissions
echo "[2/4] Granting Secret Manager & Storage roles to Service Account..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None \
  --quiet || true

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/storage.admin" \
  --condition=None \
  --quiet || true

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/cloudbuild.builds.builder" \
  --condition=None \
  --quiet || true

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/datastore.user" \
  --condition=None \
  --quiet || true

# 3. Build Container via Cloud Build
echo "[3/4] Building container image via Cloud Build ($IMAGE_TAG)..."
gcloud builds submit --tag "$IMAGE_TAG" --project "$PROJECT_ID"

# 4. Detect available Secret Manager secrets
echo "[4/4] Detecting secrets and deploying to Cloud Run..."
SECRETS_PARAM=()
KNOWN_SECRETS=("GEMINI_API_KEY_MAYA" "GEMINI_API_KEY_LEO" "GEMINI_API_KEY_SAM" "GEMINI_API_KEY" "STAFF_PIN")
SECRETS_ATTACHED=()

for sec in "${KNOWN_SECRETS[@]}"; do
  if gcloud secrets describe "$sec" --project "$PROJECT_ID" >/dev/null 2>&1; then
    SECRETS_ATTACHED+=("${sec}=${sec}:latest")
    echo "  -> Attached Secret: ${sec}:latest"
  fi
done

if [ ${#SECRETS_ATTACHED[@]} -gt 0 ]; then
  SECRETS_STRING=$(IFS=,; echo "${SECRETS_ATTACHED[*]}")
  SECRETS_PARAM=("--set-secrets" "${SECRETS_STRING}")
fi

# 5. Deploy to Cloud Run
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_TAG" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --port 8080 \
  --set-env-vars "NODE_ENV=production" \
  "${SECRETS_PARAM[@]}" \
  --project "$PROJECT_ID"

echo "=========================================================="
echo " Café Compass successfully deployed!"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --project "$PROJECT_ID" --format "value(status.url)")
echo " Live Service URL: $SERVICE_URL"
echo "=========================================================="
