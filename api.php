<?php
/**
 * api.php — REST API for Moje filamenty (server storage mode)
 * Handles session auth and file read/write for JSON data files.
 *
 * Routes:
 *   POST ?action=login        — authenticate, start session
 *   GET  ?action=logout       — destroy session
 *   GET  ?action=check        — check current session
 *   POST ?action=setup        — first-time initialisation (no auth)
 *   GET  ?file=<name>.json    — read a data file (requires auth)
 *   POST ?file=<name>.json    — write a data file (requires auth)
 */

ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Strict');
session_start();

header('Content-Type: application/json; charset=utf-8');

$DATA_DIR = __DIR__ . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR;

$ALLOWED_FILES = [
    'filaments.json', 'settings.json', 'users.json',
    'app-state.json', 'logs.json', 'calculations.json',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonOut($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requireAuth() {
    if (empty($_SESSION['user'])) {
        jsonOut(['error' => 'Unauthorized'], 401);
    }
    return $_SESSION['user'];
}

function generateUUID() {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

function calcFilamentEntry(
    $name, $manufacturer, $material, $colorName, $colorHex,
    $originalWeight, $currentTotal, $emptySpoolWeight,
    $diameter, $density, $note, $now
) {
    $net    = max(0, $currentTotal - $emptySpoolWeight);
    $pct    = $originalWeight > 0 ? min(100, round(($net / $originalWeight) * 1000) / 10) : 0;
    $radius = ($diameter / 10) / 2;
    $area   = M_PI * $radius * $radius;
    $vol    = $density > 0 ? $net / $density : 0;
    $meters = round(($area > 0 ? $vol / $area / 100 : 0) * 10) / 10;
    $status = ($net === 0) ? 'empty' : ($pct <= 20 ? 'low' : 'active');

    return [
        'id'               => generateUUID(),
        'name'             => $name,
        'manufacturer'     => $manufacturer,
        'material'         => $material,
        'colorName'        => $colorName,
        'colorHex'         => $colorHex,
        'originalWeight'   => $originalWeight,
        'currentTotalWeight' => $currentTotal,
        'emptySpoolWeight' => $emptySpoolWeight,
        'netWeight'        => $net,
        'diameter'         => $diameter,
        'lengthMeters'     => $meters,
        'remainingPercent' => $pct,
        'note'             => $note,
        'dateAdded'        => $now,
        'dateModified'     => $now,
        'status'           => $status,
    ];
}

// ── Route ─────────────────────────────────────────────────────────────────────

$action = $_GET['action'] ?? '';
$file   = $_GET['file']   ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// ── Login ──────────────────────────────────────────────────────────────────────

if ($action === 'login' && $method === 'POST') {
    $body     = json_decode(file_get_contents('php://input'), true) ?? [];
    $username = strtolower(trim($body['username'] ?? ''));
    $passHash = $body['passwordHash'] ?? '';

    if (!$username || !$passHash) {
        jsonOut(['error' => 'Chybí přihlašovací údaje.'], 400);
    }

    $usersFile = $DATA_DIR . 'users.json';
    if (!file_exists($usersFile)) {
        jsonOut(['error' => 'Aplikace není inicializována. Spusťte nastavení.'], 503);
    }

    $users = json_decode(file_get_contents($usersFile), true) ?? [];
    $found = null;
    foreach ($users as $u) {
        if (strtolower($u['username'] ?? '') === $username && !empty($u['active'])) {
            $found = $u;
            break;
        }
    }

    if (!$found || $found['passwordHash'] !== $passHash) {
        jsonOut(['error' => 'Nesprávné přihlašovací údaje.'], 401);
    }

    $_SESSION['user'] = [
        'id'       => $found['id'],
        'name'     => $found['name'],
        'username' => $found['username'],
        'role'     => $found['role'],
    ];

    jsonOut(['ok' => true, 'user' => $_SESSION['user']]);
}

// ── Logout ─────────────────────────────────────────────────────────────────────

if ($action === 'logout') {
    session_destroy();
    jsonOut(['ok' => true]);
}

// ── Session check ──────────────────────────────────────────────────────────────

if ($action === 'check') {
    if (empty($_SESSION['user'])) {
        jsonOut(['loggedIn' => false]);
    }
    jsonOut(['loggedIn' => true, 'user' => $_SESSION['user']]);
}

// ── First-time setup ───────────────────────────────────────────────────────────

if ($action === 'setup' && $method === 'POST') {
    if (!is_dir($DATA_DIR)) {
        if (!mkdir($DATA_DIR, 0755, true)) {
            jsonOut(['error' => 'Nelze vytvořit složku data/. Zkontrolujte oprávnění na serveru.'], 500);
        }
        // Protect data dir from direct HTTP access
        file_put_contents(
            $DATA_DIR . '.htaccess',
            "Order Allow,Deny\nDeny from all\n" .
            "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n"
        );
    }

    $now = gmdate('Y-m-d\TH:i:s') . '.000Z';

    // users.json
    if (!file_exists($DATA_DIR . 'users.json')) {
        $users = [[
            'id'           => generateUUID(),
            'name'         => 'Administrátor',
            'username'     => 'admin',
            'passwordHash' => hash('sha256', 'admin123'),
            'role'         => 'admin',
            'active'       => true,
            'dateCreated'  => $now,
            'dateModified' => $now,
        ]];
        file_put_contents($DATA_DIR . 'users.json',
            json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    // settings.json
    if (!file_exists($DATA_DIR . 'settings.json')) {
        $settings = [
            'appName'              => 'Moje filamenty',
            'defaultSpoolWeight'   => 1000,
            'defaultDiameter'      => 1.75,
            'lowFilamentThreshold' => 20,
            'materials'            => [
                'PLA'  => ['density' => 1.24, 'nozzleTemp' => 200, 'bedTemp' => 60],
                'ABS'  => ['density' => 1.04, 'nozzleTemp' => 240, 'bedTemp' => 100],
                'PETG' => ['density' => 1.27, 'nozzleTemp' => 235, 'bedTemp' => 80],
                'TPU'  => ['density' => 1.20, 'nozzleTemp' => 220, 'bedTemp' => 50],
            ],
        ];
        file_put_contents($DATA_DIR . 'settings.json',
            json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    // filaments.json (sample data)
    if (!file_exists($DATA_DIR . 'filaments.json')) {
        $d = 1.75;
        $filaments = [
            calcFilamentEntry('PLA Černá',          'Prusament',   'PLA',  'Černá',         '#1a1a1a', 1000, 1050, 180, $d, 1.24, 'Základní černá PLA pro každodenní tisk.', $now),
            calcFilamentEntry('PLA Bílá',           'Fillamentum', 'PLA',  'Bílá',          '#f5f5f5', 1000,  750, 180, $d, 1.24, '', $now),
            calcFilamentEntry('PETG Transparentní', 'Prusament',   'PETG', 'Transparentní', '#c8e6f5', 1000,  920, 200, $d, 1.27, '', $now),
            calcFilamentEntry('ABS Červená',        'eSUN',        'ABS',  'Červená',       '#cc2200', 1000,  350, 220, $d, 1.04, 'Pozor – dochází!', $now),
            calcFilamentEntry('TPU Modrá',          'Polymaker',   'TPU',  'Modrá',         '#2255cc',  500,   95, 150, $d, 1.20, '', $now),
        ];
        file_put_contents($DATA_DIR . 'filaments.json',
            json_encode($filaments, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    // calculations.json
    if (!file_exists($DATA_DIR . 'calculations.json')) {
        file_put_contents($DATA_DIR . 'calculations.json', '[]');
    }

    // logs.json
    if (!file_exists($DATA_DIR . 'logs.json')) {
        $logs = [[
            'date'        => $now,
            'user'        => 'system',
            'type'        => 'init',
            'description' => 'Aplikace byla inicializována s ukázkovými daty.',
        ]];
        file_put_contents($DATA_DIR . 'logs.json',
            json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    // app-state.json — always write
    file_put_contents($DATA_DIR . 'app-state.json',
        json_encode(
            ['lastOpened' => $now, 'appVersion' => '1.0.0', 'firstSetupDone' => true],
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
        )
    );

    jsonOut(['ok' => true]);
}

// ── Wipe all data files ────────────────────────────────────────────────────────

if ($action === 'wipe' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    if (($body['confirm'] ?? '') !== 'WIPE_ALL_DATA') {
        jsonOut(['error' => 'Chybí potvrzení.'], 400);
    }

    session_destroy();

    foreach ($ALLOWED_FILES as $f) {
        $path = $DATA_DIR . $f;
        if (file_exists($path)) {
            unlink($path);
        }
    }

    jsonOut(['ok' => true]);
}

// ── File I/O ───────────────────────────────────────────────────────────────────

if ($file !== '') {
    if (!in_array($file, $ALLOWED_FILES, true)) {
        jsonOut(['error' => 'Soubor není povolen.'], 403);
    }

    requireAuth();
    $filePath = $DATA_DIR . $file;

    if ($method === 'GET') {
        if (!file_exists($filePath)) {
            jsonOut(null, 404);
        }
        echo file_get_contents($filePath);
        exit;
    }

    if ($method === 'POST') {
        $body = file_get_contents('php://input');
        json_decode($body);
        if (json_last_error() !== JSON_ERROR_NONE) {
            jsonOut(['error' => 'Neplatný JSON.'], 400);
        }
        if (!is_dir($DATA_DIR)) {
            mkdir($DATA_DIR, 0755, true);
        }
        if (file_put_contents($filePath, $body) === false) {
            jsonOut(['error' => 'Zápis souboru selhal. Zkontrolujte oprávnění.'], 500);
        }
        jsonOut(['ok' => true]);
    }
}

// ── Fallback ───────────────────────────────────────────────────────────────────

jsonOut(['error' => 'Neznámý požadavek.'], 400);
