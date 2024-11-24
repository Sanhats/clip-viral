# Create models directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "public\models"

# Set the working directory
Set-Location "public\models"

# Define the base URL
$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

# Define the files to download
$files = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model.weights1",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model.weights1",
    "face_expression_model-weights_manifest.json",
    "face_expression_model.weights1"
)

# Download each file
foreach ($file in $files) {
    Write-Host "Downloading $file..."
    Invoke-WebRequest -Uri "$baseUrl/$file" -OutFile $file
}

Write-Host "Face detection models downloaded successfully"

