# 🧵 Moje filamenty

> **Lokální webová aplikace pro správu filamentů pro 3D tisk**
>
> *A local web app for managing your 3D printing filament inventory — no server, no database, no installation.*

[![No Backend](https://img.shields.io/badge/backend-none-brightgreen?style=flat-square)](.)
[![No Build System](https://img.shields.io/badge/build%20system-none-brightgreen?style=flat-square)](.)
[![Pure JS](https://img.shields.io/badge/JavaScript-vanilla-f7df1e?style=flat-square&logo=javascript)](.)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952b3?style=flat-square&logo=bootstrap)](.)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Chrome/Edge](https://img.shields.io/badge/browser-Chrome%20%7C%20Edge%2086%2B-4285F4?style=flat-square&logo=googlechrome)](.)

---

## Co to je

**Moje filamenty** je jednoduchá lokální webová aplikace určená pro domácí dílny a nadšence do 3D tisku. Hlavní smysl je mít okamžitý přehled o tom, kolik filamentu zbývá na každé cívce — stačí ji zvážit a zadat číslo.

Data se ukládají jako **čitelné JSON soubory přímo do složky ve vašem počítači**. Žádný cloud, žádný server, žádná instalace. Aplikaci otevřete jako obyčejný soubor v prohlížeči.

---

## Funkce

### Přehled zásob
- Dashboard s kartami filamentů a barevnými progress bary
- Statistiky: celkový počet cívek, aktivní, dochází, prázdné, celková hmotnost, odhadované metry
- Automatický výpočet stavu (`aktivní → dochází → prázdná`) podle zadaného prahu

### Evidence filamentů
- Přidání, úprava a archivace filamentů
- Sledování: výrobce, materiál, barva (název + HEX), průměr, všechny hmotnosti
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

Žádný backend, žádná databáze, žádný build systém, žádný `npm install`.

| Vrstva | Technologie |
|--------|-------------|
| Markup | HTML 5 |
| Styly | CSS 3 + Bootstrap 5.3.2 (CDN) |
| Ikony | Bootstrap Icons 1.11.1 (CDN) |
| Logika | Vanilla JavaScript (ES2020+) |
| Úložiště | **File System Access API** + IndexedDB |
| Hesla | Web Crypto API (SHA-256) |
| Data | JSON soubory na disku |

---

## Jak spustit

### Požadavky
- **Google Chrome** nebo **Microsoft Edge** verze 86 nebo novější
- Žádná instalace, žádný server, žádný Node.js

### Postup
1. Stáhněte nebo naklonujte repozitář:
   ```bash
   git clone https://github.com/fandapanda/Moje-filamenty.git
   cd filementy
   ```
2. Otevřete soubor `index.html` v Chrome nebo Edge:
   - Dvojklik na soubor, nebo
   - Přetáhněte ho do okna prohlížeče, nebo
   - `Ctrl+O` → vyberte soubor
3. Při prvním spuštění vyberte složku pro ukládání dat (stačí jednou).
4. Přihlaste se výchozími údaji a změňte heslo.

> **Firefox / Safari:** Aplikace funguje v omezeném režimu bez automatického ukládání souborů. Data lze zálohovat a importovat ručně přes sekci Záloha.

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
├── assets/
│   ├── css/
│   │   └── style.css     # Vlastní styly
│   └── js/
│       ├── app.js        # Inicializace, navigace, overlay, toasty
│       ├── auth.js       # Přihlášení, session, SHA-256
│       ├── calculations.js  # Výpočty (g → m, stav, %)
│       ├── storage.js    # File System Access API, IndexedDB
│       ├── filaments.js  # CRUD filamentů
│       ├── calculator.js # Kalkulačka tisku
│       ├── settings.js   # Nastavení
│       └── users.js      # Správa uživatelů
└── README.md
```

---

## Datové soubory

Po výběru složky aplikace vytvoří tyto soubory:

| Soubor | Obsah |
|--------|-------|
| `filaments.json` | Seznam všech filamentů se všemi atributy |
| `settings.json` | Nastavení aplikace, seznam materiálů s hustotami |
| `users.json` | Uživatelé a SHA-256 hashe hesel |
| `app-state.json` | Stav aplikace (verze, datum posledního otevření) |
| `logs.json` | Protokol akcí (max. 500 záznamů, LIFO) |
| `calculations.json` | Historie kalkulací ceny tisku |

Všechny soubory jsou **čitelné lidsky** (formátovaný JSON), lze je otevřít v textovém editoru, zálohovat nebo přesunout na jiný počítač.

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

> Hodnoty jsou **průměrné příkony** během aktivního tisku. Skutečná spotřeba se liší podle materiálu, teplot a konkrétního modelu. Uzavřené tiskárny (X1C, P1S, Voron) spotřebují více kvůli vyhřívání komory.

---

## Přihlašovací údaje

| Uživatel | Heslo |
|----------|-------|
| `admin` | `admin123` |

**Po prvním přihlášení okamžitě změňte heslo** — aplikace na to sama upozorní. Sekce **Uživatelé → ikona klíče**.

---

## Jak funguje ukládání dat

Aplikace využívá [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API):

1. Při prvním spuštění vyberete složku pomocí standardního dialogu prohlížeče.
2. Odkaz na složku se uloží do **IndexedDB** — prohlížeč si ho pamatuje i po restartu.
3. Při každém dalším spuštění aplikace požádá o obnovení přístupu ke složce (jedno kliknutí).
4. Při každé změně dat aplikace okamžitě zapíše příslušný JSON soubor.

Data tak existují jako standardní soubory na vašem disku — nezávisí na prohlížeči, cache ani cookies.

---

## Poznámka k bezpečnosti

Přihlašovací systém slouží jako **jednoduchý místní zámek** — chrání před náhodným přístupem nebo záměnou uživatelů na sdíleném počítači. **Nejde o plnohodnotný bezpečnostní systém.**

- Hesla jsou hashována pomocí SHA-256 (Web Crypto API), nikdy se neukládají v čitelné podobě.
- Kdokoliv s přístupem k datové složce může JSON soubory číst a upravovat — to je záměr, nikoli chyba.
- Přihlašovací session trvá jen po dobu otevřené záložky (sessionStorage).
- Aplikace neodesílá žádná data na internet.

---

## Přispívání

Pull requesty jsou vítány. Pokud chcete přidat funkci nebo opravit chybu:

1. Forkněte repozitář
2. Vytvořte větev: `git checkout -b feature/nazev-funkce`
3. Commitněte změny: `git commit -m 'Přidání funkce XY'`
4. Pushněte větev: `git push origin feature/nazev-funkce`
5. Otevřete Pull Request

### Pravidla pro příspěvky
- Žádný backend, žádné závislosti přes npm
- Žádný build systém — kód musí fungovat přímo v prohlížeči
- Zachujte stávající strukturu souborů
- Nové funkce dokumentujte v README

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
