# 🧵 Moje filamenty

> **Webová aplikace pro správu filamentů pro 3D tisk**
>
> *A web app for managing your 3D printing filament inventory — no database, no build system, no installation required.*

[![Pure JS](https://img.shields.io/badge/JavaScript-vanilla-f7df1e?style=flat-square&logo=javascript)](.)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952b3?style=flat-square&logo=bootstrap)](.)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Chrome/Edge](https://img.shields.io/badge/FSA%20mode-Chrome%20%7C%20Edge%2086%2B-4285F4?style=flat-square&logo=googlechrome)](.)
[![PHP](https://img.shields.io/badge/Server%20mode-PHP%208%2B-777bb3?style=flat-square&logo=php)](.)

---

## Co to je

**Moje filamenty** je jednoduchá webová aplikace určená pro domácí dílny a nadšence do 3D tisku. Hlavní smysl je mít okamžitý přehled o tom, kolik filamentu zbývá na každé cívce — stačí ji zvážit a zadat číslo.

Aplikace podporuje **dva režimy ukládání dat**:

| Režim | Kde běží | Kde jsou data | Přístup z více zařízení |
|-------|----------|---------------|------------------------|
| **Lokální složka** (FSA) | přímo v prohlížeči | JSON soubory na vašem disku | jen sdílenou složkou (OneDrive, Dropbox) |
| **Server (PHP)** | na hostingu s PHP | JSON soubory na serveru | ano, odkudkoli |

---

## Funkce

### Přehled zásob
- Dashboard s kartami filamentů a barevnými progress bary
- Statistiky: celkový počet cívek, aktivní, dochází, prázdné, celková hmotnost, odhadované metry
- Automatický výpočet stavu (`aktivní → dochází → prázdná`) podle zadaného prahu

### Evidence filamentů
- Přidání, úprava a archivace filamentů
- Sledování: výrobce, materiál, barva (název + HEX), průměr, všechny hmotnosti, cena za cívku
- Přepočet gramů na metry podle materiálu a průměru vlákna
- Filtry a textové vyhledávání v seznamu

### Rychlé zvážení
- Tlačítko **Rychle zvážit** přímo na dashboardu i v seznamu
- Položte cívku na váhu → zadejte číslo → uložte
- Živý náhled nové čisté hmotnosti a procent před uložením

### Kalkulačka ceny tisku
- Zadáte gramů filamentu + dobu tisku + tiskárnu
- Aplikace spočítá cenu za materiál (dle ceny cívky) a za elektřinu
- 16 předvoleb tiskáren s průměrným příkonem (Bambu Lab, Prusa, Creality, Voron, ...)
- Vlastní zadání příkonu pro jinou tiskárnu
- Historie kalkulací uložená v `calculations.json`

### Správa materiálů a nastavení
- Přidávání vlastních materiálů s hustotou a teplotami tisku
- Nastavení výchozí hmotnosti cívky, průměru a prahu pro stav „Dochází"

### Záloha a obnovení
- Export celé databáze do jednoho JSON souboru
- Import zálohy s ověřením struktury
- Záloha zahrnuje všechny soubory: filamenty, nastavení, uživatele, historii kalkulací i logy

### Přihlášení a uživatelé
- Více uživatelů, role `admin` / `user`
- Hesla hashována pomocí SHA-256 (Web Crypto API)
- Správa uživatelů dostupná pouze administrátorovi

---

## Technologie

Žádná databáze, žádný build systém, žádný `npm install`.

| Vrstva | Technologie |
|--------|-------------|
| Markup | HTML 5 |
| Styly | CSS 3 + Bootstrap 5.3.2 (CDN) |
| Ikony | Bootstrap Icons 1.11.1 (CDN) |
| Logika | Vanilla JavaScript (ES2020+) |
| Úložiště — lokální | File System Access API + IndexedDB |
| Úložiště — server | PHP 8 REST API (`api.php`) + PHP sessions |
| Hesla | Web Crypto API (SHA-256) |
| Data | JSON soubory (na disku nebo na serveru) |

---

## Jak spustit

### Varianta A — Lokální režim (bez serveru)

**Požadavky:** Google Chrome nebo Microsoft Edge 86+, nic jiného.

1. Stáhněte nebo naklonujte repozitář:
   ```bash
   git clone https://github.com/fandapanda/Moje-filamenty.git
   ```
2. Otevřete soubor `index.html` v Chrome nebo Edge (dvojklik, přetažení nebo `Ctrl+O`).
3. Při prvním spuštění zvolte **Lokální složka** a vyberte adresář pro data (stačí jednou — prohlížeč si ho zapamatuje).
4. Přihlaste se výchozími údaji a změňte heslo.

> **Firefox / Safari:** Nepodporují File System Access API. Aplikace nabídne pouze serverový režim nebo omezený provoz s ručním exportem/importem přes sekci Záloha.

---

### Varianta B — Serverový režim (hosting s PHP)

**Požadavky:** webhosting s PHP 8+, Apache s povoleným `mod_rewrite`.

1. Nahrajte všechny soubory projektu na server (FTP/SFTP/Git deploy).
2. Ujistěte se, že složka `data/` je zapisovatelná (`chmod 755` nebo přes správce souborů hostingu). Pokud neexistuje, `api.php` ji při prvním spuštění sám vytvoří.
3. Otevřete doménu v libovolném moderním prohlížeči.
4. Při prvním spuštění zvolte **Server (PHP)** — aplikace automaticky vytvoří datové soubory s ukázkovými daty.
5. Přihlaste se výchozími údaji (`admin` / `admin123`) a okamžitě změňte heslo.

> Data se ukládají do složky `data/` na serveru jako JSON soubory. Přímý HTTP přístup ke složce blokuje `.htaccess`. PHP sessions zajišťují přihlášení na straně serveru.

---

## Struktura projektu

```
filementy/
├── index.html            # Dashboard (přehled)
├── login.html            # Přihlášení
├── filaments.html        # Seznam filamentů
├── filament-add.html     # Přidání filamentu
├── filament-edit.html    # Úprava filamentu
├── calculator.html       # Kalkulačka ceny tisku
├── settings.html         # Nastavení aplikace
├── users.html            # Správa uživatelů (admin)
├── backup.html           # Záloha a import
├── api.php               # REST API pro serverový režim (PHP)
├── .htaccess             # Čisté URL + přesměrování
├── assets/
│   ├── css/
│   │   └── style.css     # Vlastní styly
│   └── js/
│       ├── app.js        # Inicializace, navigace, overlay, toasty
│       ├── auth.js       # Přihlášení, session, SHA-256
│       ├── calculations.js  # Výpočty (g → m, stav, %)
│       ├── storage.js    # FSA + IndexedDB + serverový fetch
│       ├── filaments.js  # CRUD filamentů
│       ├── calculator.js # Kalkulačka tisku
│       ├── settings.js   # Nastavení
│       └── users.js      # Správa uživatelů
└── data/                 # Datové soubory (server režim, chráněno .htaccess)
    ├── filaments.json
    ├── settings.json
    ├── users.json
    ├── app-state.json
    ├── logs.json
    └── calculations.json
```

---

## Datové soubory

Po výběru složky (lokální režim) nebo inicializaci (serverový režim) aplikace vytvoří tyto soubory:

| Soubor | Obsah |
|--------|-------|
| `filaments.json` | Seznam všech filamentů se všemi atributy |
| `settings.json` | Nastavení aplikace, seznam materiálů s hustotami |
| `users.json` | Uživatelé a SHA-256 hashe hesel |
| `app-state.json` | Stav aplikace (verze, datum posledního otevření) |
| `logs.json` | Protokol akcí (max. 500 záznamů, LIFO) |
| `calculations.json` | Historie kalkulací ceny tisku |

Všechny soubory jsou **čitelné lidsky** (formátovaný JSON), lze je otevřít v textovém editoru nebo zazálohovat jako běžné soubory.

### Struktura záznamu filamentu

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "PLA Černá",
  "manufacturer": "Prusament",
  "material": "PLA",
  "colorName": "Černá",
  "colorHex": "#1a1a1a",
  "originalWeight": 1000,
  "currentTotalWeight": 870,
  "emptySpoolWeight": 180,
  "netWeight": 690,
  "diameter": 1.75,
  "lengthMeters": 231.5,
  "remainingPercent": 69.0,
  "pricePerSpool": 499,
  "note": "",
  "dateAdded": "2025-01-15T10:30:00.000Z",
  "dateModified": "2025-05-01T08:15:22.000Z",
  "status": "active"
}
```

---

## Výpočet délky filamentu

Délka v metrech se počítá ze čisté hmotnosti vlákna, hustoty materiálu a průměru:

```
čistá hmotnost (g) = celková hmotnost cívky − hmotnost prázdné cívky
objem (cm³)        = čistá hmotnost / hustota materiálu (g/cm³)
průřez (cm²)       = π × (průměr mm / 10 / 2)²
délka (cm)         = objem / průřez
délka (m)          = délka (cm) / 100
```

**Příklad — PLA, 1 kg, 1,75 mm:**
- hustota PLA = 1,24 g/cm³
- objem = 1000 / 1,24 = 806,5 cm³
- průřez = π × 0,0875² = 0,02405 cm²
- délka = 806,5 / 0,02405 / 100 ≈ **335 m**

### Výchozí hustoty materiálů

| Materiál | Hustota (g/cm³) | 1 kg @ 1,75 mm |
|----------|-----------------|----------------|
| PLA | 1,24 | ~335 m |
| ABS | 1,04 | ~400 m |
| PETG | 1,27 | ~328 m |
| TPU | 1,20 | ~347 m |

Hustoty lze upravit nebo přidat vlastní materiál v **Nastavení**.

---

## Kalkulačka ceny tisku

Kalkulačka počítá **skutečné náklady na tisk** ze dvou složek:

```
cena za materiál  = (cena cívky / gramů na cívce) × gramů spotřebovaných
cena za elektřinu = příkon tiskárny (kW) × doba tisku (h) × cena kWh
celková cena      = materiál + elektřina
```

### Předvolby tiskáren (průměrný příkon během tisku)

| Tiskárna | Příkon |
|----------|--------|
| Bambu Lab X1C | 350 W |
| Bambu Lab P1S | 320 W |
| Bambu Lab P1P | 280 W |
| Bambu Lab A1 | 250 W |
| Bambu Lab A1 mini | 200 W |
| Prusa MK4 | 150 W |
| Prusa MK3S+ | 120 W |
| Prusa XL | 250 W |
| Creality Ender 3 V2 | 70 W |
| Creality Ender 3 S1 Pro | 80 W |
| Creality K1C | 350 W |
| Creality CR-10 V3 | 280 W |
| Voron 2.4 | 400 W |
| Anycubic Kobra 2 Pro | 200 W |
| FlashForge Creator Pro | 180 W |
| Vlastní | zadáte ručně |

> Hodnoty jsou **průměrné příkony** během aktivního tisku. Skutečná spotřeba se liší podle materiálu, teplot a konkrétního modelu.

---

## Přihlašovací údaje

| Uživatel | Heslo |
|----------|-------|
| `admin` | `admin123` |

**Po prvním přihlášení okamžitě změňte heslo** — aplikace na to sama upozorní. Sekce **Uživatelé → ikona klíče**.

---

## Jak funguje ukládání dat

### Lokální režim (File System Access API)

1. Při prvním spuštění vyberete složku pomocí standardního dialogu prohlížeče.
2. Odkaz na složku se uloží do **IndexedDB** — prohlížeč si ho pamatuje i po restartu.
3. Při každém dalším spuštění aplikace požádá o obnovení přístupu (jedno kliknutí).
4. Při každé změně dat aplikace okamžitě zapíše příslušný JSON soubor na disk.

Data tak existují jako standardní soubory na vašem disku — nezávisí na prohlížeči, cache ani cookies. Pro přístup z více počítačů stačí vybrat složku v OneDrive, Dropboxu nebo Google Drive.

### Serverový režim (PHP API)

1. Všechna čtení a zápisy probíhají přes `api.php` (jednoduchý REST endpoint).
2. Přihlášení zajišťuje PHP session — cookie `PHPSESSID` zůstane aktivní po dobu sezení.
3. Heslo se nikdy neposílá jako text: prohlížeč vypočítá SHA-256 hash a odešle pouze ten.
4. PHP hash porovná s hodnotou uloženou v `users.json` a vrátí session token.
5. Složka `data/` je chráněna souborem `.htaccess` — JSON soubory nelze stáhnout přímo přes prohlížeč.

---

## Poznámka k bezpečnosti

Přihlašovací systém slouží jako **jednoduchý přístupový zámek** — chrání před náhodným přístupem nebo záměnou uživatelů.

- Hesla jsou hashována pomocí SHA-256, nikdy se neukládají v čitelné podobě.
- **Lokální režim:** kdokoliv s přístupem k datové složce může JSON soubory číst — to je záměr, nikoli chyba. Zabezpečte složku oprávněními operačního systému.
- **Serverový režim:** data jsou přístupná pouze přes `api.php` s platnou PHP session. Složka `data/` není přístupná přes HTTP.
- Aplikace neodesílá žádná data na internet (ani v lokálním, ani v serverovém režimu).

---

## Licence

Projekt je vydán pod licencí **MIT** — můžete ho volně používat, upravovat a distribuovat.

```
MIT License

Copyright (c) 2025 Moje filamenty Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

*Verze 1.0.0 · Vytvořeno pro komunitu 3D tiskařů*
