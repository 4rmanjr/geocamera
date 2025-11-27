<?php
// update_settings.php

// --- KONFIGURASI KEAMANAN ---
// Ganti ini dengan password yang SANGAT KUAT dan unik.
// Jangan gunakan password cPanel atau email.
$ADMIN_SECRET = "Kunc1Rahas1aGeoCam2025!"; 

// --- SETUP HEADER (CORS) ---
// Penting agar aplikasi (Android/Web) bisa akses script ini
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle Preflight Request (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Hanya terima POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method Not Allowed"]);
    exit();
}

// Baca Input JSON
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

// Validasi Input
if (!isset($input['secret']) || !isset($input['settings'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing parameters"]);
    exit();
}

// Cek Password/Secret
if ($input['secret'] !== $ADMIN_SECRET) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Invalid Secret Key"]);
    exit();
}

// --- SIMPAN FILE ---
$file = 'geocam-settings.json'; // Simpan sebagai geocam-settings.json di folder yang sama dengan update_settings.php

// Format JSON agar rapi (Pretty Print)
$jsonContent = json_encode($input['settings'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

if (file_put_contents($file, $jsonContent)) {
    echo json_encode(["success" => true, "message" => "Settings updated successfully!"]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to write file. Check permissions."]);
}
?>