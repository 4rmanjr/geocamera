<?php
// update_settings.php

// Load Configuration (Secret Key)
// Menggunakan __DIR__ untuk path dinamis. Asumsi config.php ada dua level di atas public_html/geocamerapro
require_once __DIR__ . '/../../secure_config/config.php';

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

// Cek Password/Secret (Using Constant from config.php)
if ($input['secret'] !== ADMIN_SECRET_KEY) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Invalid Secret Key"]);
    exit();
}

// --- VALIDASI STRUKTUR SETTINGS ---
$settings = $input['settings'];

// 1. Pastikan $settings adalah array (objek JSON)
if (!is_array($settings)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Settings data must be a valid JSON object/array."]);
    exit();
}

// 2. Cek field-field penting yang wajib ada
$required_fields = [
    'companyName', 
    'projectName', 
    'showCoordinates', 
    'showTime', 
    'showCompany', 
    'showProject', 
    'showQrCode',
    'posCompany', 'posProject', 'posTime', 'posCoordinates', 'posLogo', 'posQr',
    'logoSize', 'qrSize', 'overlaySize', // Pastikan size config ada
    'itemOrder', // Urutan item
    'resolution', 'aspectRatio' // Pengaturan foto
];

foreach ($required_fields as $field) {
    // Mengecek apakah field ada dan bukan null
    if (!isset($settings[$field])) { // Perluasan: isset() juga cek kalau null
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing or invalid required field: '$field'."]);
        exit();
    }
    // Tambahan: Validasi tipe data dasar (opsional tapi bagus)
    // Contoh: companyName dan projectName harus string
    if (in_array($field, ['companyName', 'projectName']) && !is_string($settings[$field])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid type for field '$field'."]);
        exit();
    }
}

// --- SIMPAN FILE ---
$file = 'geocam-settings.json'; // Simpan sebagai geocam-settings.json di folder yang sama dengan update_settings.php

// Format JSON agar rapi (Pretty Print)
$jsonContent = json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

if (file_put_contents($file, $jsonContent)) {
    echo json_encode(["success" => true, "message" => "Settings updated successfully!"]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to write file. Check permissions."]);
}