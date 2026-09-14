/**
 * Micro-Scraper Automático de Resultados en Tiempo Real para Agencia
 * Fuentes Oficiales:
 * - TuAzar (tuazar.com): Triples y Animalitos (Lotto Activo, La Granjita, Selva Plus, Guácharo Activo, Guacharito Millonario, Monje, Dorado, Fácil, Ricachona)
 * - El Ruco Oficial (elruco.com.ve / latococa.com API)
 * - LotoVen (lotoven.com): La Ruca
 * Node.js 24 Nativo - Cero Dependencias
 */

const fs = require('fs');
const path = require('path');
const { LOTTERIES_CONFIG, HORARIOS_ANIMALITOS, HORARIOS_CHANCE, ANIMALITOS_DICT } = require('./js/lotteries-data.js');

const DATA_FILE = path.join(__dirname, 'data', 'resultados.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

function getCaracasDateStr(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

async function fetchHtml(url) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.error(`[SCRAPER ERROR] Fallo al descargar ${url}: ${err.message}`);
    return null;
  }
}

// Normaliza horas para emparejar por ejemplo "8:15 AM", "8:30 AM" o "8:05 AM" con el casillero de "8:00 AM"
function matchHourSlot(timeStr, targetSlot) {
  const parseHour = s => {
    const m = s.match(/(\d+)(?::(\d+))?\s*(am|pm)/i);
    if (!m) return null;
    let h = parseInt(m[1]);
    const ampm = m[3].toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return h;
  };

  const h1 = parseHour(timeStr);
  const h2 = parseHour(targetSlot);
  return h1 !== null && h2 !== null && h1 === h2;
}

function matchTripleTime(t1, t2) {
  const norm = s => s.toLowerCase().replace(/^0/, '').replace(/\s+/g, '');
  return norm(t1) === norm(t2);
}

// =========================================================================
// 1. EXTRAER TRIPLES EN VIVO DESDE TUAZAR
// =========================================================================
function parseTuazarTriples(html, currentData) {
  if (!html) return 0;
  let count = 0;

  const LOTTERIES = {
    'CHANCE EN LÍNEA': 'chance',
    'TRIPLE CHANCE': 'chance',
    'TRIPLE TÁCHIRA': 'tachira',
    'TRIPLE CARACAS': 'caracas',
    'TRIPLE ZULIA': 'zulia',
    'TRIPLE CALIENTE': 'caliente',
    'TRIPLE ZAMORANO': 'zamorano'
  };

  const ZODIACS = {
    'CHANCE ASTRAL': { id: 'chance', field: 'C' },
    'ASTRAL': { id: 'chance', field: 'C' },
    'TÁCHIRA ZODIACAL': { id: 'tachira', field: 'C' },
    'ZODIACO DEL ZULIA': { id: 'zulia', field: 'C' },
    'SIGNO CALIENTE': { id: 'caliente', field: 'C' },
    'ASTRO ZAMORANO': { id: 'zamorano', field: 'B' }
  };

  const sections = html.split('<div class="lc-section">').slice(1);
  for (const sec of sections) {
    const titleMatch = sec.match(/<h3 class=["']lc-title["']>([^<]+)<\/h3>/i);
    if (!titleMatch) continue;

    const title = titleMatch[1].trim().toUpperCase();

    // Extraer filas por bloques
    const rowChunks = sec.split('<div class="lc-row"').slice(1);
    const rows = [];
    for (const chunk of rowChunks) {
      if (chunk.includes('lc-row--head')) continue;
      const cells = [...chunk.matchAll(/<div class=["']lc-cell[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
        .map(c => c[1].replace(/<[^>]+>/g, '').trim());
      if (cells.length > 0) rows.push(cells);
    }

    // Triples A y B
    if (LOTTERIES[title]) {
      const lotId = LOTTERIES[title];
      for (const row of rows) {
        const time = row[0];
        const rawA = row[1] || '';
        const rawB = row[2] || '';

        const valA = (rawA === '-' || rawA === '---' || !rawA) ? '' : rawA;
        const valB = (rawB === '-' || rawB === '---' || !rawB) ? '' : rawB;

        if (currentData.triples[lotId]) {
          for (const targetTime of Object.keys(currentData.triples[lotId])) {
            if (matchHourSlot(time, targetTime) || matchTripleTime(time, targetTime)) {
              const overrideKeyA = `triple:${lotId}:${targetTime}:A`;
              const overrideKeyB = `triple:${lotId}:${targetTime}:B`;

              if (!currentData.manualOverrides || !currentData.manualOverrides[overrideKeyA]) {
                if (currentData.triples[lotId][targetTime].A !== valA) {
                  currentData.triples[lotId][targetTime].A = valA;
                  count++;
                }
              }
              if (lotId !== 'zamorano') {
                if (!currentData.manualOverrides || !currentData.manualOverrides[overrideKeyB]) {
                  if (currentData.triples[lotId][targetTime].B !== valB) {
                    currentData.triples[lotId][targetTime].B = valB;
                    count++;
                  }
                }
              }
            }
          }
        }
      }

      // Si es Chance en Línea, alimentar también la tabla completa de 11 horas
      if (title === 'CHANCE EN LÍNEA' && currentData.chance_en_linea) {
        for (const row of rows) {
          const time = row[0];
          const rawA = row[1] || '';
          const rawB = row[2] || '';
          const valA = (rawA === '-' || rawA === '---' || !rawA) ? '' : rawA;
          const valB = (rawB === '-' || rawB === '---' || !rawB) ? '' : rawB;

          for (const targetSlot of Object.keys(currentData.chance_en_linea)) {
            if (matchHourSlot(time, targetSlot) || matchTripleTime(time, targetSlot)) {
              const overrideKeyA = `chance_en_linea:${targetSlot}:A`;
              const isOverriddenA = currentData.manualOverrides && currentData.manualOverrides[overrideKeyA];
              if (!isOverriddenA && valA && currentData.chance_en_linea[targetSlot].A !== valA) {
                currentData.chance_en_linea[targetSlot].A = valA;
                count++;
              }

              const overrideKeyB = `chance_en_linea:${targetSlot}:B`;
              const isOverriddenB = currentData.manualOverrides && currentData.manualOverrides[overrideKeyB];
              if (!isOverriddenB && valB && currentData.chance_en_linea[targetSlot].B !== valB) {
                currentData.chance_en_linea[targetSlot].B = valB;
                count++;
              }
            }
          }
        }
      }
    }

    // Zodiacos / Signos C o B (Astro Zamorano)
    if (ZODIACS[title]) {
      const { id: lotId, field } = ZODIACS[title];
      for (const row of rows) {
        const time = row[0];
        let rawNum = row[1] || '';
        let rawSign = row[2] || '';

        let combined = '';
        if (rawNum && rawNum !== '-' && rawNum !== '---') {
          combined = `${rawNum} ${rawSign}`.trim();
        }

        if (currentData.triples[lotId]) {
          for (const targetTime of Object.keys(currentData.triples[lotId])) {
            if (matchHourSlot(time, targetTime) || matchTripleTime(time, targetTime)) {
              const overrideKey = `triple:${lotId}:${targetTime}:${field}`;
              if (currentData.manualOverrides && currentData.manualOverrides[overrideKey]) {
                continue;
              }
              if (currentData.triples[lotId][targetTime][field] !== combined) {
                currentData.triples[lotId][targetTime][field] = combined;
                count++;
              }
            }
          }
        }
      }

      // Si es Chance Astral, alimentar también la columna C (Signo) de chance_en_linea
      if (title === 'CHANCE ASTRAL' && currentData.chance_en_linea) {
        for (const row of rows) {
          const time = row[0];
          let rawNum = row[1] || '';
          let rawSign = row[2] || '';
          let combined = '';
          if (rawNum && rawNum !== '-' && rawNum !== '---') {
            combined = `${rawNum} ${rawSign}`.trim();
          }

          for (const targetSlot of Object.keys(currentData.chance_en_linea)) {
            if (matchHourSlot(time, targetSlot) || matchTripleTime(time, targetSlot)) {
              const overrideKeyC = `chance_en_linea:${targetSlot}:C`;
              const isOverriddenC = currentData.manualOverrides && currentData.manualOverrides[overrideKeyC];
              if (!isOverriddenC && combined && currentData.chance_en_linea[targetSlot].C !== combined) {
                currentData.chance_en_linea[targetSlot].C = combined;
                count++;
              }
            }
          }
        }
      }
    }
  }

  return count;
}

// =========================================================================
// 2. EXTRAER ANIMALITOS EN VIVO CON NOMBRE DE ANIMAL DESDE TUAZAR
// =========================================================================
function parseTuazarAnimalitos(html, currentData) {
  if (!html) return 0;
  let count = 0;

  const ANIMAL_MAP = {
    'LOTTO ACTIVO': 'lotto_activo',
    'LA GRANJITA': 'la_granjita',
    'SELVA PLUS': 'selva_plus',
    'GUACHARO ACTIVO': 'guacharo_activo',
    'EL GUACHARITO MILLONARIO': 'guacharo_millonario',
    'MONJE MILLONARIO': 'monje'
  };

  const sections = html.split('<div class="lc-section">').slice(1);
  for (const sec of sections) {
    const titleMatch = sec.match(/<h3 class=["']lc-title["']>([^<]+)<\/h3>/i);
    if (!titleMatch) continue;

    const title = titleMatch[1].trim().toUpperCase();
    const gameId = ANIMAL_MAP[title];
    if (!gameId) continue;

    // Detecta cada ficha de hora: extrae tanto el número como el nombre del animal
    const tileRegex = /<div class=["']lc-tile(?:\s+lc-tile--empty)?["'][^>]*>[\s\S]*?<div class=["']lc-tile-time["']>([^<]+)<\/div>[\s\S]*?(?:<span class=["']lc-tile-num["']>([^<]+)<\/span>\s*<span class=["']lc-tile-animal["']>([^<]+)<\/span>|<div class=["']lc-tile-label lc-tile-label--empty["']>)/gi;
    let tileMatch;

    while ((tileMatch = tileRegex.exec(sec)) !== null) {
      const timeStr = tileMatch[1].trim();
      let num = tileMatch[2] ? tileMatch[2].trim() : '';
      let animal = tileMatch[3] ? tileMatch[3].trim().toUpperCase() : '';

      if (num && num.length === 1 && num !== '0') {
        num = '0' + num;
      }

      if (currentData.animalitos[gameId]) {
        for (const slot of Object.keys(currentData.animalitos[gameId])) {
          if (matchHourSlot(timeStr, slot)) {
            const overrideKey = `animalito:${gameId}:${slot}`;
            if (currentData.manualOverrides && currentData.manualOverrides[overrideKey]) {
              continue;
            }

            const currentCell = currentData.animalitos[gameId][slot];
            const currentVal = (typeof currentCell === 'object' && currentCell !== null) ? currentCell.val : currentCell;
            const currentLabel = (typeof currentCell === 'object' && currentCell !== null) ? currentCell.label : '';

            if (num) {
              if (currentVal !== num || currentLabel !== animal) {
                currentData.animalitos[gameId][slot] = { val: num, label: animal };
                count++;
              }
            } else {
              // Si TuAzar dice que está pendiente para hoy, debe ser vacío
              if (currentVal !== '') {
                currentData.animalitos[gameId][slot] = '';
                count++;
              }
            }
          }
        }
      }
    }
  }

  return count;
}

// =========================================================================
// 3. EXTRAER TRIPLE DORADO, TRIPLE FÁCIL Y LA RICACHONA DESDE TUAZAR
// =========================================================================
function parseTuazarDoradoFacilRicachona(html, currentData) {
  if (!html) return 0;
  let count = 0;

  const MAP = {
    'TRIPLE DORADO': 'el_dorado',
    'TRIPLE FÁCIL': 'facil',
    'LA RICACHONA': 'la_ricachona'
  };

  const NO_DRAWS = {
    'el_dorado': ['8:00 AM', '12:00 PM', '7:00 PM'],
    'la_ruca': ['8:00 AM']
  };

  const sections = html.split('<div class="lc-section">').slice(1);
  for (const sec of sections) {
    const titleMatch = sec.match(/<h3 class=["']lc-title["']>([^<]+)<\/h3>/i);
    if (!titleMatch) continue;

    const title = titleMatch[1].trim().toUpperCase();
    const gameId = MAP[title];
    if (!gameId) continue;

    const rowChunks = sec.split('<div class="lc-row"').slice(1);
    for (const chunk of rowChunks) {
      if (chunk.includes('lc-row--head')) continue;
      const cells = [...chunk.matchAll(/<div class=["']lc-cell[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
        .map(c => c[1].replace(/<[^>]+>/g, '').trim());
      if (cells.length < 2) continue;

      const timeStr = cells[0];
      const rawVal = cells[1];
      const num = (rawVal === '-' || rawVal === '---' || !rawVal) ? '' : rawVal;

      if (currentData.animalitos[gameId]) {
        for (const slot of Object.keys(currentData.animalitos[gameId])) {
          // Si este horario no juega, fijar como '--' y no buscar resultado
          if (NO_DRAWS[gameId] && NO_DRAWS[gameId].includes(slot)) {
            currentData.animalitos[gameId][slot] = '--';
            continue;
          }

          if (matchHourSlot(timeStr, slot)) {
            const overrideKey = `animalito:${gameId}:${slot}`;
            if (currentData.manualOverrides && currentData.manualOverrides[overrideKey]) {
              continue;
            }

            const currentCell = currentData.animalitos[gameId][slot];
            const currentVal = (typeof currentCell === 'object' && currentCell !== null) ? currentCell.val : currentCell;
            if (currentVal !== num) {
              currentData.animalitos[gameId][slot] = num;
              count++;
            }
          }
        }
      }
    }
  }

  return count;
}

// =========================================================================
// 4. EXTRAER EL RUCO EN VIVO DESDE SU API OFICIAL (elruco.com.ve / latococa)
// =========================================================================
async function parseElRucoOficial(currentData) {
  try {
    const res = await fetch('https://latococa.com/proyect/api/v1/sorteo-publicados', {
      method: 'POST',
      body: JSON.stringify({ idLoteria: 5, fecha: null }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    let count = 0;

    if (json && json.loteria && json.loteria.publicaciones) {
      for (const pub of json.loteria.publicaciones) {
        const horaStr = pub.hora || (pub.sorteo && pub.sorteo.hora) || '';
        const num = (pub.a && pub.a.nro) ? String(pub.a.nro).trim() : '';
        const zodiaco = (pub.zodiaco && pub.zodiaco.zodiaco) ? pub.zodiaco.zodiaco.toUpperCase().trim() : '';

        if (currentData.animalitos['el_ruco']) {
          for (const slot of Object.keys(currentData.animalitos['el_ruco'])) {
            if (matchHourSlot(horaStr, slot)) {
              const overrideKey = `animalito:el_ruco:${slot}`;
              if (currentData.manualOverrides && currentData.manualOverrides[overrideKey]) {
                continue;
              }

              const currentCell = currentData.animalitos['el_ruco'][slot];
              const currentVal = (typeof currentCell === 'object' && currentCell !== null) ? currentCell.val : currentCell;
              const currentLabel = (typeof currentCell === 'object' && currentCell !== null) ? currentCell.label : '';

              if (num && (currentVal !== num || currentLabel !== zodiaco)) {
                currentData.animalitos['el_ruco'][slot] = { val: num, label: zodiaco };
                count++;
              }
            }
          }
        }
      }
    }
    return count;
  } catch (err) {
    console.warn('[EL RUCO ERROR] No se pudo consultar API oficial:', err.message);
    return 0;
  }
}

// =========================================================================
// 5. EXTRAER LA RUCA EN VIVO DESDE SU API OFICIAL (laruca.com.ve / latococa)
// =========================================================================
async function parseLaRucaOficial(currentData) {
  try {
    const res = await fetch('https://latococa.com/proyect/api/v1/sorteo-publicados', {
      method: 'POST',
      body: JSON.stringify({ idLoteria: 4, fecha: null }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    let count = 0;

    if (json && json.loteria && json.loteria.publicaciones) {
      for (const pub of json.loteria.publicaciones) {
        const horaStr = pub.hora || (pub.sorteo && pub.sorteo.hora) || '';
        const num = (pub.a && pub.a.nro) ? String(pub.a.nro).trim() : '';
        const zodiaco = (pub.zodiaco && pub.zodiaco.zodiaco) ? pub.zodiaco.zodiaco.toUpperCase().trim() : '';

        if (currentData.animalitos['la_ruca']) {
          for (const slot of Object.keys(currentData.animalitos['la_ruca'])) {
            if (slot === '8:00 AM') {
              currentData.animalitos['la_ruca']['8:00 AM'] = '--';
              continue;
            }
            if (matchHourSlot(horaStr, slot)) {
              const overrideKey = `animalito:la_ruca:${slot}`;
              if (currentData.manualOverrides && currentData.manualOverrides[overrideKey]) {
                continue;
              }

              const currentCell = currentData.animalitos['la_ruca'][slot];
              const currentVal = (typeof currentCell === 'object' && currentCell !== null) ? currentCell.val : currentCell;
              const currentLabel = (typeof currentCell === 'object' && currentCell !== null) ? currentCell.label : '';

              if (num && (currentVal !== num || currentLabel !== zodiaco)) {
                currentData.animalitos['la_ruca'][slot] = { val: num, label: zodiaco };
                count++;
              }
            }
          }
        }
      }
    }
    return count;
  } catch (err) {
    console.warn('[LA RUCA ERROR] No se pudo consultar API oficial:', err.message);
    return 0;
  }
}

// =========================================================================
// 6. EXTRAER TRIPLE CARACAS EN VIVO DESDE SU API OFICIAL
// (resultadostriplecaracas.com / 1:00 PM, 4:30 PM, 7:00 PM)
// =========================================================================
async function parseTripleCaracasOficial(currentData) {
  try {
    const res = await fetch('https://www.resultadostriplecaracas.com/api/gaming/results/product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ game_product_id: '5' })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    let count = 0;

    const list = json.response || [];
    const today = getCaracasDateStr();

    for (const item of list) {
      if (!item.event_timestamp || !item.event_timestamp.seconds) continue;
      const d = new Date(item.event_timestamp.seconds * 1000);

      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' });
      const itemDate = formatter.format(d);
      if (itemDate !== today) continue;

      const hourFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Caracas', hour: 'numeric', minute: '2-digit', hour12: true });
      const timeStr = hourFormatter.format(d);

      const resMap = {};
      if (item.results) {
        item.results.forEach(r => Object.assign(resMap, r));
      }

      const valA = resMap.A || '';
      const valB = resMap.B || '';
      let valC = resMap.C || '';
      if (valC) valC = valC.replace('-', ' ').trim();

      if (currentData.triples.caracas) {
        for (const targetTime of Object.keys(currentData.triples.caracas)) {
          if (matchHourSlot(timeStr, targetTime) || matchTripleTime(timeStr, targetTime)) {
            const overrideA = `triple:caracas:${targetTime}:A`;
            const overrideB = `triple:caracas:${targetTime}:B`;
            const overrideC = `triple:caracas:${targetTime}:C`;

            if (valA && (!currentData.manualOverrides || !currentData.manualOverrides[overrideA])) {
              if (currentData.triples.caracas[targetTime].A !== valA) {
                currentData.triples.caracas[targetTime].A = valA;
                count++;
              }
            }
            if (valB && (!currentData.manualOverrides || !currentData.manualOverrides[overrideB])) {
              if (currentData.triples.caracas[targetTime].B !== valB) {
                currentData.triples.caracas[targetTime].B = valB;
                count++;
              }
            }
            if (valC && (!currentData.manualOverrides || !currentData.manualOverrides[overrideC])) {
              if (currentData.triples.caracas[targetTime].C !== valC) {
                currentData.triples.caracas[targetTime].C = valC;
                count++;
              }
            }
          }
        }
      }
    }

    return count;
  } catch (err) {
    console.warn('[TRIPLE CARACAS ERROR]:', err.message);
    return 0;
  }
}

// =========================================================================
// 7. RESPALDO MULTI-FUENTE: LOTERÍA DE HOY (TRIPLES Y CHANCE EN LÍNEA)
// =========================================================================
function parseLoteriaDeHoyTriples(html, currentData) {
  let count = 0;
  if (!html) return count;
  const tables = [...html.matchAll(/<table class=["']resultados["']>([\s\S]*?)<\/table>/gi)].map(m => m[1]);

  for (const tableHtml of tables) {
    const thMatch = tableHtml.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    const title = thMatch ? thMatch[1].replace(/<[^>]+>/g, '').toLowerCase().trim() : '';

    const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map(r => r[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

    // 1. Triple Chance & Chance en Línea
    if (title.includes('chance')) {
      for (const rowText of rows) {
        const timeMatch = rowText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
        if (!timeMatch) continue;
        const rawTime = timeMatch[1].toUpperCase().replace(/^0/, '');
        const afterTime = rowText.substring(rowText.indexOf(timeMatch[1]) + timeMatch[1].length).trim();
        const tokens = afterTime.split(/\s+/);
        const valA = tokens[0] || '';
        const valB = tokens[1] || '';
        const valC = tokens.slice(2).join(' ') || '';

        // Chance Tradicional (1:00 PM, 4:30 PM, 7:00 PM)
        if (currentData.triples && currentData.triples.chance) {
          for (const targetDraw of Object.keys(currentData.triples.chance)) {
            const normTarget = targetDraw.replace(/^0/, '').trim();
            const isMatch = normTarget === rawTime ||
              (rawTime.startsWith('1:') && normTarget.startsWith('1:') && rawTime.includes('PM') && normTarget.includes('PM')) ||
              (rawTime.startsWith('4:') && normTarget.startsWith('4:') && rawTime.includes('PM') && normTarget.includes('PM')) ||
              (rawTime.startsWith('7:') && normTarget.startsWith('7:') && rawTime.includes('PM') && normTarget.includes('PM'));

            if (isMatch) {
              const cur = currentData.triples.chance[targetDraw];
              if (valA && (!cur.A || cur.A === 'N/J' || cur.A === '--')) { cur.A = valA; count++; }
              if (valB && (!cur.B || cur.B === 'N/J' || cur.B === '--')) { cur.B = valB; count++; }
              if (valC && (!cur.C || cur.C === 'N/J' || cur.C === '--')) { cur.C = valC; count++; }
            }
          }
        }

        // Chance en Línea (9:00 AM a 7:00 PM continuo)
        if (currentData.chance_en_linea) {
          for (const targetHour of Object.keys(currentData.chance_en_linea)) {
            const hNum = rawTime.split(':')[0];
            const ampm = rawTime.includes('PM') ? 'PM' : 'AM';
            if (targetHour.startsWith(hNum + ':') && targetHour.includes(ampm)) {
              const cur = currentData.chance_en_linea[targetHour];
              if (valA && (!cur.A || cur.A === 'N/J' || cur.A === '--' || cur.A !== valA)) { cur.A = valA; count++; }
              if (valB && (!cur.B || cur.B === 'N/J' || cur.B === '--' || cur.B !== valB)) { cur.B = valB; count++; }
              if (valC && (!cur.C || cur.C === 'N/J' || cur.C === '--' || cur.C !== valC)) { cur.C = valC; count++; }
            }
          }
        }
      }
    }

    // 2. Triple Zulia
    if (title.includes('zulia')) {
      for (const rowText of rows) {
        const timeMatch = rowText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
        if (!timeMatch) continue;
        const rawTime = timeMatch[1].toUpperCase().replace(/^0/, '');
        const afterTime = rowText.substring(rowText.indexOf(timeMatch[1]) + timeMatch[1].length).trim();
        const tokens = afterTime.split(/\s+/);
        const valA = tokens[0] || '';
        const valB = tokens[1] || '';
        const valC = tokens.slice(2).join(' ') || '';

        if (currentData.triples && currentData.triples.zulia) {
          for (const targetDraw of Object.keys(currentData.triples.zulia)) {
            const isMatch = (rawTime.startsWith('12:') && targetDraw.startsWith('12:')) ||
              (rawTime.startsWith('4:') && targetDraw.startsWith('4:')) ||
              (rawTime.startsWith('7:') && targetDraw.startsWith('7:'));
            if (isMatch) {
              const cur = currentData.triples.zulia[targetDraw];
              if (valA && (!cur.A || cur.A === 'N/J' || cur.A === '--')) { cur.A = valA; count++; }
              if (valB && (!cur.B || cur.B === 'N/J' || cur.B === '--')) { cur.B = valB; count++; }
              if (valC && (!cur.C || cur.C === 'N/J' || cur.C === '--')) { cur.C = valC; count++; }
            }
          }
        }
      }
    }

    // 3. Triple Táchira
    if (title.includes('tachira')) {
      for (const rowText of rows) {
        const timeMatch = rowText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
        if (!timeMatch) continue;
        const rawTime = timeMatch[1].toUpperCase().replace(/^0/, '');
        const afterTime = rowText.substring(rowText.indexOf(timeMatch[1]) + timeMatch[1].length).trim();
        const tokens = afterTime.split(/\s+/);
        const valA = tokens[0] || '';
        const valB = tokens[1] || '';
        const valC = tokens.slice(2).join(' ') || '';

        if (currentData.triples && currentData.triples.tachira) {
          for (const targetDraw of Object.keys(currentData.triples.tachira)) {
            const isMatch = (rawTime.startsWith('1:') && targetDraw.startsWith('1:')) ||
              (rawTime.startsWith('4:') && targetDraw.startsWith('4:')) ||
              (rawTime.startsWith('10:') && targetDraw.startsWith('10:'));
            if (isMatch) {
              const cur = currentData.triples.tachira[targetDraw];
              if (valA && (!cur.A || cur.A === 'N/J' || cur.A === '--')) { cur.A = valA; count++; }
              if (valB && (!cur.B || cur.B === 'N/J' || cur.B === '--')) { cur.B = valB; count++; }
              if (valC && (!cur.C || cur.C === 'N/J' || cur.C === '--')) { cur.C = valC; count++; }
            }
          }
        }
      }
    }

    // 4. Triple Caracas
    if (title.includes('caracas')) {
      for (const rowText of rows) {
        const timeMatch = rowText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
        if (!timeMatch) continue;
        const rawTime = timeMatch[1].toUpperCase().replace(/^0/, '');
        const afterTime = rowText.substring(rowText.indexOf(timeMatch[1]) + timeMatch[1].length).trim();
        const tokens = afterTime.split(/\s+/);
        const valA = tokens[0] || '';
        const valB = tokens[1] || '';
        const valC = tokens.slice(2).join(' ') || '';

        if (currentData.triples && currentData.triples.caracas) {
          for (const targetDraw of Object.keys(currentData.triples.caracas)) {
            const isMatch = (rawTime.startsWith('1:') && targetDraw.startsWith('1:')) ||
              (rawTime.startsWith('4:') && targetDraw.startsWith('4:')) ||
              (rawTime.startsWith('7:') && targetDraw.startsWith('7:'));
            if (isMatch) {
              const cur = currentData.triples.caracas[targetDraw];
              if (valA && (!cur.A || cur.A === 'N/J' || cur.A === '--')) { cur.A = valA; count++; }
              if (valB && (!cur.B || cur.B === 'N/J' || cur.B === '--')) { cur.B = valB; count++; }
              if (valC && (!cur.C || cur.C === 'N/J' || cur.C === '--')) { cur.C = valC; count++; }
            }
          }
        }
      }
    }

    // 5. Triple Zamorano
    if (title.includes('zamorano')) {
      for (const rowText of rows) {
        const timeMatch = rowText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
        if (!timeMatch) continue;
        const rawTime = timeMatch[1].toUpperCase().replace(/^0/, '');
        const afterTime = rowText.substring(rowText.indexOf(timeMatch[1]) + timeMatch[1].length).trim();
        const tokens = afterTime.split(/\s+/);
        const valA = tokens[0] || '';
        const valB = tokens.slice(1).join(' ') || '';

        if (currentData.triples && currentData.triples.zamorano) {
          for (const targetDraw of Object.keys(currentData.triples.zamorano)) {
            const isMatch = (rawTime.startsWith('12:') && targetDraw.startsWith('12:')) ||
              (rawTime.startsWith('2:') && targetDraw.startsWith('2:')) ||
              (rawTime.startsWith('4:') && targetDraw.startsWith('4:')) ||
              (rawTime.startsWith('7:') && targetDraw.startsWith('7:'));
            if (isMatch) {
              const cur = currentData.triples.zamorano[targetDraw];
              if (valA && (!cur.A || cur.A === 'N/J' || cur.A === '--')) { cur.A = valA; count++; }
              if (valB && (!cur.B || cur.B === 'N/J' || cur.B === '--')) { cur.B = valB; count++; }
            }
          }
        }
      }
    }

    // 6. Ruletas y Terminales en LoteriaDeHoy (Dorado, Fácil, Ricachona, Ruca)
    if (currentData.animalitos) {
      if (title.includes('dorado') && currentData.animalitos.el_dorado) {
        for (const r of rows) {
          const tm = r.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
          if (!tm) continue;
          const h = tm[1].toUpperCase().replace(/^0/, '');
          const num = r.substring(r.indexOf(tm[1]) + tm[1].length).trim().split(/\s+/)[0];
          const targetH = HORARIOS_ANIMALITOS.find(hh => hh.replace(/^0/, '') === h);
          if (targetH && num && currentData.animalitos.el_dorado[targetH] !== 'N/J' && !currentData.animalitos.el_dorado[targetH]) {
            currentData.animalitos.el_dorado[targetH] = num;
            count++;
          }
        }
      }
      if (title.includes('facil') && currentData.animalitos.facil) {
        for (const r of rows) {
          const tm = r.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
          if (!tm) continue;
          const h = tm[1].toUpperCase().replace(/^0/, '');
          const num = r.substring(r.indexOf(tm[1]) + tm[1].length).trim().split(/\s+/)[0];
          const targetH = HORARIOS_ANIMALITOS.find(hh => hh.replace(/^0/, '') === h);
          if (targetH && num && !currentData.animalitos.facil[targetH]) {
            currentData.animalitos.facil[targetH] = num;
            count++;
          }
        }
      }
      if (title.includes('ricachona') && currentData.animalitos.la_ricachona) {
        for (const r of rows) {
          const tm = r.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
          if (!tm) continue;
          const h = tm[1].toUpperCase().replace(/^0/, '');
          const num = r.substring(r.indexOf(tm[1]) + tm[1].length).trim().split(/\s+/)[0];
          const hourNum = h.split(':')[0];
          const ampm = h.includes('PM') ? 'PM' : 'AM';
          const targetH = HORARIOS_ANIMALITOS.find(hh => hh.startsWith(hourNum + ':') && hh.includes(ampm));
          if (targetH && num && !currentData.animalitos.la_ricachona[targetH]) {
            currentData.animalitos.la_ricachona[targetH] = num;
            count++;
          }
        }
      }
      if (title.includes('ruca') && currentData.animalitos.la_ruca) {
        const horarioRow = rows.find(r => r.startsWith('Horario'));
        const resultadosRow = rows.find(r => r.startsWith('Resultados'));
        if (horarioRow && resultadosRow) {
          const times = [...horarioRow.matchAll(/(\d{1,2}:\d{2}\s*(?:AM|PM))/gi)].map(m => m[1]);
          const numbers = resultadosRow.replace('Resultados', '').trim().split(/\s+/);
          times.forEach((tStr, idx) => {
            const num = numbers[idx];
            if (!num) return;
            const hNum = tStr.split(':')[0].replace(/^0/, '');
            const ampm = tStr.toUpperCase().includes('PM') ? 'PM' : 'AM';
            const targetH = HORARIOS_ANIMALITOS.find(hh => hh.startsWith(hNum + ':') && hh.endsWith(ampm));
            if (targetH && currentData.animalitos.la_ruca[targetH] !== 'N/J' && !currentData.animalitos.la_ruca[targetH]) {
              currentData.animalitos.la_ruca[targetH] = num;
              count++;
            }
          });
        }
      }
    }
  }
  return count;
}

// =========================================================================
// 8. RESPALDO MULTI-FUENTE: LOTERÍA DE HOY (ANIMALITOS)
// =========================================================================
function parseLoteriaDeHoyAnimalitos(htmlAnim, currentData) {
  let count = 0;
  if (!htmlAnim || !currentData.animalitos) return count;

  const gameMappings = [
    { match: /lotto\s*activo(?!.*(?:2|rd|int))/i, id: 'lotto_activo' },
    { match: /granjita/i, id: 'la_granjita' },
    { match: /selva\s*plus/i, id: 'selva_plus' },
    { match: /guacharo\s*activo/i, id: 'guacharo_activo' },
    { match: /guacharo\s*millonario|guacharit/i, id: 'guacharo_millonario' },
    { match: /monje|lotto\s*activo\s*2/i, id: 'monje' }
  ];

  const sections = htmlAnim.split(/<h3/i);
  for (const sec of sections) {
    const titleMatch = sec.match(/^[^>]*>([\s\S]*?)<\/h3>/i);
    if (!titleMatch) continue;
    const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();

    const mapped = gameMappings.find(m => m.match.test(title));
    if (mapped && currentData.animalitos[mapped.id]) {
      const cards = [...sec.matchAll(/<div class=["']circle-legend["']>([\s\S]*?)<\/div>/gi)].map(m => m[1]);
      cards.forEach(c => {
        const h4 = c.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);
        const h5 = c.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i);
        if (h4 && h5) {
          const valText = h4[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          const timeText = h5[1].replace(/<[^>]+>/g, '').trim().toUpperCase().replace(/^0/, '');

          const valTokens = valText.split(' ');
          const num = valTokens[0];
          let label = valTokens.slice(1).join(' ');
          if (!label && ANIMALITOS_DICT[num]) label = ANIMALITOS_DICT[num].name;

          const hNum = timeText.split(':')[0].replace(/^0/, '');
          const ampm = timeText.includes('PM') ? 'PM' : 'AM';
          const targetH = HORARIOS_ANIMALITOS.find(hh => hh.startsWith(hNum + ':') && hh.endsWith(ampm));
          if (targetH && num) {
            const cur = currentData.animalitos[mapped.id][targetH];
            const curVal = (typeof cur === 'object' && cur !== null) ? cur.val : cur;
            if (!curVal || curVal === '--') {
              currentData.animalitos[mapped.id][targetH] = { val: num, label: label.toUpperCase() };
              count++;
            }
          }
        }
      });
    }
  }
  return count;
}

// =========================================================================
// 9. INTELIGENCIA DE HORARIO OFICIAL DOMINICAL (VENEZUELA)
// =========================================================================
function applySundaySchedule(data, dateStr) {
  const dObj = new Date(dateStr + 'T12:00:00');
  const isSunday = dObj.getDay() === 0;
  if (!isSunday) return;

  // En Venezuela, los domingos NO juegan:
  // - Triple Caracas: 1:00 PM y 4:30 PM (solo juega 7:00 PM)
  // - Triple Zulia: 12:45 PM y 4:45 PM (solo juega 7:00 PM / 7:05 PM)
  // - Triple Táchira: 1:15 PM y 4:45 PM (solo juega 10:10 PM)
  // - Triple Zamorano: 12:00 PM, 2:00 PM y 4:00 PM (solo juega 7:00 PM)
  // TRIPLE CHANCE y CHANCE EN LÍNEA juegan normal todos los domingos.

  if (data.triples) {
    if (data.triples.tachira) {
      if (!data.triples.tachira["1:15 PM"]?.A || data.triples.tachira["1:15 PM"].A === '') {
        data.triples.tachira["1:15 PM"] = { A: "N/J", B: "N/J", C: "N/J" };
      }
      if (!data.triples.tachira["4:45 PM"]?.A || data.triples.tachira["4:45 PM"].A === '') {
        data.triples.tachira["4:45 PM"] = { A: "N/J", B: "N/J", C: "N/J" };
      }
    }
    if (data.triples.caracas) {
      if (!data.triples.caracas["1:00 PM"]?.A || data.triples.caracas["1:00 PM"].A === '') {
        data.triples.caracas["1:00 PM"] = { A: "N/J", B: "N/J", C: "N/J" };
      }
      if (!data.triples.caracas["4:30 PM"]?.A || data.triples.caracas["4:30 PM"].A === '') {
        data.triples.caracas["4:30 PM"] = { A: "N/J", B: "N/J", C: "N/J" };
      }
    }
    if (data.triples.zulia) {
      if (!data.triples.zulia["12:45 PM"]?.A || data.triples.zulia["12:45 PM"].A === '') {
        data.triples.zulia["12:45 PM"] = { A: "N/J", B: "N/J", C: "N/J" };
      }
      if (!data.triples.zulia["4:45 PM"]?.A || data.triples.zulia["4:45 PM"].A === '') {
        data.triples.zulia["4:45 PM"] = { A: "N/J", B: "N/J", C: "N/J" };
      }
    }
    if (data.triples.zamorano) {
      if (!data.triples.zamorano["12:00 PM"]?.A || data.triples.zamorano["12:00 PM"].A === '') {
        data.triples.zamorano["12:00 PM"] = { A: "N/J", B: "N/J" };
      }
      if (!data.triples.zamorano["2:00 PM"]?.A || data.triples.zamorano["2:00 PM"].A === '') {
        data.triples.zamorano["2:00 PM"] = { A: "N/J", B: "N/J" };
      }
      if (!data.triples.zamorano["4:00 PM"]?.A || data.triples.zamorano["4:00 PM"].A === '') {
        data.triples.zamorano["4:00 PM"] = { A: "N/J", B: "N/J" };
      }
    }
  }
}

// =========================================================================
// EJECUCIÓN PRINCIPAL DEL SCRAPER (CON MULTI-FUENTE Y REDUNDANCIA TOTAL)
// =========================================================================
async function runScraper() {
  const todayDate = getCaracasDateStr();
  console.log(`\n[${new Date().toLocaleTimeString('es-VE')}] 🔄 Sincronizando resultados oficiales de hoy (${todayDate})...`);

  let currentData;
  try {
    if (fs.existsSync(DATA_FILE)) {
      currentData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}

  if (!currentData || currentData.date !== todayDate) {
    console.log('☀️ Inicializando plantilla limpia para hoy...');
    currentData = {
      updatedAt: new Date().toISOString(),
      date: todayDate,
      agency: "Agencia de Loterías",
      triples: {
        chance: { "1:00 PM": { A: "", B: "", C: "" }, "4:30 PM": { A: "", B: "", C: "" }, "7:00 PM": { A: "", B: "", C: "" } },
        tachira: { "1:15 PM": { A: "", B: "", C: "" }, "4:45 PM": { A: "", B: "", C: "" }, "10:10 PM": { A: "", B: "", C: "" } },
        caracas: { "1:00 PM": { A: "", B: "", C: "" }, "4:30 PM": { A: "", B: "", C: "" }, "7:00 PM": { A: "", B: "", C: "" } },
        zulia: { "12:45 PM": { A: "", B: "", C: "" }, "4:45 PM": { A: "", B: "", C: "" }, "7:45 PM": { A: "", B: "", C: "" } },
        zamorano: { "12:00 PM": { A: "", B: "" }, "2:00 PM": { A: "", B: "" }, "4:00 PM": { A: "", B: "" }, "7:00 PM": { A: "", B: "" } }
      },
      chance_en_linea: {},
      animalitos: {
        lotto_activo: {}, la_granjita: {}, selva_plus: {}, guacharo_millonario: {},
        monje: {}, guacharo_activo: {}, el_ruco: {}, la_ruca: {}, el_dorado: {},
        facil: {}, la_ricachona: {}
      }
    };

    const cHours = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"];
    for (const h of cHours) {
      currentData.chance_en_linea[h] = { A: "", B: "", C: "" };
    }

    const hours = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"];
    for (const g of Object.keys(currentData.animalitos)) {
      for (const h of hours) {
        currentData.animalitos[g][h] = "";
      }
    }
  }

  // Asegurar estructura de triples
  if (currentData.triples) {
    if (!currentData.triples.chance) {
      currentData.triples.chance = { "1:00 PM": { A: "", B: "", C: "" }, "4:30 PM": { A: "", B: "", C: "" }, "7:00 PM": { A: "", B: "", C: "" } };
    }
    if (currentData.triples.caliente) {
      delete currentData.triples.caliente;
    }
    if (currentData.triples.caracas) {
      if (currentData.triples.caracas["12:30 PM"] || currentData.triples.caracas["7:30 PM"]) {
        delete currentData.triples.caracas["12:30 PM"];
        delete currentData.triples.caracas["7:30 PM"];
      }
      if (!currentData.triples.caracas["1:00 PM"]) currentData.triples.caracas["1:00 PM"] = { A: "", B: "", C: "" };
      if (!currentData.triples.caracas["4:30 PM"]) currentData.triples.caracas["4:30 PM"] = { A: "", B: "", C: "" };
      if (!currentData.triples.caracas["7:00 PM"]) currentData.triples.caracas["7:00 PM"] = { A: "", B: "", C: "" };
    }
    if (currentData.triples.tachira) {
      if (currentData.triples.tachira["7:15 PM"]) {
        delete currentData.triples.tachira["7:15 PM"];
      }
      if (!currentData.triples.tachira["10:10 PM"]) {
        currentData.triples.tachira["10:10 PM"] = { A: "", B: "", C: "" };
      }
    }
  }

  // Asegurar estructura de Chance en Línea
  if (!currentData.chance_en_linea) {
    currentData.chance_en_linea = {};
    const cHours = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"];
    for (const h of cHours) {
      currentData.chance_en_linea[h] = { A: "", B: "", C: "" };
    }
  }

  // Pre-fijar horarios donde no hay sorteo de animalitos
  if (currentData.animalitos.la_ruca) {
    currentData.animalitos.la_ruca['8:00 AM'] = '--';
  }
  if (currentData.animalitos.el_dorado) {
    currentData.animalitos.el_dorado['8:00 AM'] = '--';
    currentData.animalitos.el_dorado['12:00 PM'] = '--';
    currentData.animalitos.el_dorado['7:00 PM'] = '--';
  }

  // Aplicar horarios oficiales de domingos
  applySundaySchedule(currentData, todayDate);

  let totalUpdates = 0;

  // 1. Fuente TuAzar: Triples y Ruletas
  const triplesHtml = await fetchHtml('https://tuazar.com/loteria/resultados/');
  if (triplesHtml) {
    totalUpdates += parseTuazarTriples(triplesHtml, currentData);
    totalUpdates += parseTuazarDoradoFacilRicachona(triplesHtml, currentData);
  }

  // 2. Fuente TuAzar: Animalitos con nombre oficial
  const animalsHtml = await fetchHtml('https://tuazar.com/loteria/animalitos/resultados/');
  if (animalsHtml) {
    totalUpdates += parseTuazarAnimalitos(animalsHtml, currentData);
  }

  // 3. API Oficial: El Ruco (latococa idLoteria: 5)
  totalUpdates += await parseElRucoOficial(currentData);

  // 4. API Oficial: La Ruca (latococa idLoteria: 4)
  totalUpdates += await parseLaRucaOficial(currentData);

  // 5. API Oficial: Triple Caracas (resultadostriplecaracas.com)
  totalUpdates += await parseTripleCaracasOficial(currentData);

  // 6. Respaldo Redundante en Vivo: LoteríaDeHoy (Triples y Chance en Línea)
  try {
    const formBody = new URLSearchParams();
    formBody.append('fecha', todayDate);
    const resLot = await fetch('https://loteriadehoy.com/loterias/resultados/', {
      method: 'POST',
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formBody.toString()
    });
    if (resLot.ok) {
      const htmlLot = await resLot.text();
      totalUpdates += parseLoteriaDeHoyTriples(htmlLot, currentData);
    }
  } catch (err) {
    console.warn('[LOTERIA DE HOY TRIPLES ERROR]:', err.message);
  }

  // 7. Respaldo Redundante en Vivo: LoteríaDeHoy (Animalitos)
  try {
    const formBodyAnim = new URLSearchParams();
    formBodyAnim.append('fecha', todayDate);
    const resLotAnim = await fetch('https://loteriadehoy.com/animalitos/resultados/', {
      method: 'POST',
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formBodyAnim.toString()
    });
    if (resLotAnim.ok) {
      const htmlLotAnim = await resLotAnim.text();
      totalUpdates += parseLoteriaDeHoyAnimalitos(htmlLotAnim, currentData);
    }
  } catch (err) {
    console.warn('[LOTERIA DE HOY ANIMALITOS ERROR]:', err.message);
  }

  // Asegurar nuevamente que los domingos sin sorteo queden N/J si no hubo sorteo
  applySundaySchedule(currentData, todayDate);

  currentData.updatedAt = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2), 'utf8');

  // Guardar en historial por fecha
  const historyDir = path.join(__dirname, 'data', 'history');
  if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
  fs.writeFileSync(path.join(historyDir, `${currentData.date}.json`), JSON.stringify(currentData, null, 2), 'utf8');

  console.log(`✓ Resultados sincronizados con éxito. (${totalUpdates} cambios aplicados en vivo).`);
  return currentData;
}

/**
 * Scraper histórico para cualquier fecha específica (YYYY-MM-DD)
 * Extrae con redundancia de LoteriaDeHoy, APIs oficiales de El Ruco, La Ruca y Selva Plus.
 */
async function scrapeHistoryDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

  const historyDir = path.join(__dirname, 'data', 'history');
  if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
  const targetPath = path.join(historyDir, `${dateStr}.json`);

  if (fs.existsSync(targetPath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      const hasAnimals = cached.animalitos && Object.values(cached.animalitos).some(draws => 
        Object.values(draws).some(v => v && v !== '--' && v !== 'N/J' && (typeof v === 'object' ? v.val : v))
      );
      const hasTrips = cached.triples && Object.values(cached.triples).some(draws => 
        Object.values(draws).some(v => v && (v.A || v.B || v.C))
      );
      const hasChanceOnline = cached.chance_en_linea && Object.values(cached.chance_en_linea).some(v => v && (v.A || v.B || v.C));

      if ((hasAnimals || hasTrips) && hasChanceOnline) {
        return cached;
      }
    } catch (e) {}
  }

  // Leer nombre de agencia del archivo actual
  let currentAgency = 'AGENCIA DE LOTERÍAS';
  if (fs.existsSync(DATA_FILE)) {
    try {
      const cur = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (cur.agency) currentAgency = cur.agency;
    } catch (e) {}
  }

  const result = {
    updatedAt: new Date().toISOString(),
    date: dateStr,
    agency: currentAgency,
    triples: {},
    chance_en_linea: {},
    animalitos: {}
  };

  // Inicializar estructuras vacías según configuración oficial
  LOTTERIES_CONFIG.triples.forEach(t => {
    result.triples[t.id] = {};
    t.draws.forEach(d => {
      result.triples[t.id][d.time] = (t.id === 'zamorano') ? { A: '', B: '' } : { A: '', B: '', C: '' };
    });
  });

  const cHours = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"];
  for (const h of cHours) {
    result.chance_en_linea[h] = { A: "", B: "", C: "" };
  }

  LOTTERIES_CONFIG.animalitos.forEach(a => {
    result.animalitos[a.id] = {};
    HORARIOS_ANIMALITOS.forEach(h => {
      if (a.id === 'el_dorado' && (h === '8:00 AM' || h === '12:00 PM' || h === '7:00 PM')) {
        result.animalitos[a.id][h] = 'N/J';
      } else if (a.id === 'la_ruca' && h === '8:00 AM') {
        result.animalitos[a.id][h] = 'N/J';
      } else {
        result.animalitos[a.id][h] = '';
      }
    });
  });

  // Aplicar horarios de domingo antes del scraping
  applySundaySchedule(result, dateStr);

  // 1. Obtener Triples y Chance en Línea desde LoteriaDeHoy
  try {
    const formBody = new URLSearchParams();
    formBody.append('fecha', dateStr);

    const resLot = await fetch('https://loteriadehoy.com/loterias/resultados/', {
      method: 'POST',
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://loteriadehoy.com',
        'Referer': 'https://loteriadehoy.com/loterias/resultados/'
      },
      body: formBody.toString()
    });

    if (resLot.ok) {
      const htmlLot = await resLot.text();
      parseLoteriaDeHoyTriples(htmlLot, result);
    }
  } catch (err) {
    console.error(`[HISTÓRICO] Error obteniendo triples de ${dateStr}:`, err.message);
  }

  // 2. Obtener Animalitos desde LoteriaDeHoy
  try {
    const formBody = new URLSearchParams();
    formBody.append('fecha', dateStr);

    const resAnim = await fetch('https://loteriadehoy.com/animalitos/resultados/', {
      method: 'POST',
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://loteriadehoy.com',
        'Referer': 'https://loteriadehoy.com/animalitos/resultados/'
      },
      body: formBody.toString()
    });

    if (resAnim.ok) {
      const htmlAnim = await resAnim.text();
      parseLoteriaDeHoyAnimalitos(htmlAnim, result);
    }
  } catch (err) {
    console.error(`[HISTÓRICO] Error obteniendo animalitos de ${dateStr}:`, err.message);
  }

  // 3. EL RUCO Oficial API (latococa idLoteria: 5)
  try {
    const resRuco = await fetch('https://latococa.com/proyect/api/v1/sorteo-publicados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idLoteria: 5, fecha: dateStr })
    });
    const jsonRuco = await resRuco.json();
    if (jsonRuco?.loteria?.publicaciones) {
      for (const pub of jsonRuco.loteria.publicaciones) {
        const timeText = pub.hora || pub.sorteo?.hora || '';
        const num = (pub.a?.nro) ? String(pub.a.nro).trim() : '';
        const zodiac = pub.zodiaco?.zodiaco ? pub.zodiaco.zodiaco.toUpperCase().trim() : '';
        if (num && timeText) {
          const hNum = timeText.split(':')[0].replace(/^0/, '');
          const ampm = timeText.toUpperCase().includes('PM') ? 'PM' : 'AM';
          const targetH = HORARIOS_ANIMALITOS.find(hh => hh.startsWith(hNum + ':') && hh.endsWith(ampm));
          if (targetH && result.animalitos.el_ruco) {
            result.animalitos.el_ruco[targetH] = { val: num, label: zodiac };
          }
        }
      }
    }
  } catch(e) {
    console.warn(`[HISTÓRICO] El Ruco error en ${dateStr}:`, e.message);
  }

  // 4. LA RUCA Oficial API (latococa idLoteria: 4 con signos zodiacales)
  try {
    const resRuca = await fetch('https://latococa.com/proyect/api/v1/sorteo-publicados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idLoteria: 4, fecha: dateStr })
    });
    const jsonRuca = await resRuca.json();
    if (jsonRuca?.loteria?.publicaciones) {
      for (const pub of jsonRuca.loteria.publicaciones) {
        const timeText = pub.hora || pub.sorteo?.hora || '';
        const num = (pub.a?.nro) ? String(pub.a.nro).trim() : '';
        const zodiac = pub.zodiaco?.zodiaco ? pub.zodiaco.zodiaco.toUpperCase().trim() : '';
        if (num && timeText) {
          const hNum = timeText.split(':')[0].replace(/^0/, '');
          const ampm = timeText.toUpperCase().includes('PM') ? 'PM' : 'AM';
          const targetH = HORARIOS_ANIMALITOS.find(hh => hh.startsWith(hNum + ':') && hh.endsWith(ampm));
          if (targetH && targetH !== '8:00 AM' && result.animalitos.la_ruca) {
            result.animalitos.la_ruca[targetH] = { val: num, label: zodiac };
          }
        }
      }
    }
  } catch(e) {
    console.warn(`[HISTÓRICO] La Ruca error en ${dateStr}:`, e.message);
  }

  // 5. SELVA PLUS Oficial API (api.lotterly.co)
  try {
    const resSelva = await fetch(`https://api.lotterly.co/v1/results/selva-plus/?exact_date=${dateStr}&extended=true`);
    if (resSelva.ok) {
      const draws = await resSelva.json();
      if (Array.isArray(draws) && draws.length > 0) {
        for (const item of draws) {
          const timeText = item.time || '';
          const num = item.results?.[0]?.result || '';
          if (num && timeText) {
            const hNum = String(parseInt(timeText.split(':')[0], 10));
            const ampm = parseInt(hNum, 10) >= 12 ? 'PM' : 'AM';
            const h12 = (parseInt(hNum, 10) % 12 || 12).toString();
            const targetH = HORARIOS_ANIMALITOS.find(hh => hh.startsWith(h12 + ':') && hh.endsWith(ampm));
            if (targetH && result.animalitos.selva_plus) {
              const label = ANIMALITOS_DICT[num]?.name || '';
              result.animalitos.selva_plus[targetH] = { val: num, label: label.toUpperCase() };
            }
          }
        }
      }
    }
  } catch(e) {
    console.warn(`[HISTÓRICO] Selva Plus error en ${dateStr}:`, e.message);
  }

  // Asegurar nuevamente que los domingos sin sorteo queden N/J si no hubo sorteo
  applySundaySchedule(result, dateStr);

  // Guardar archivo histórico para accesos futuros instantáneos
  fs.writeFileSync(targetPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`✓ Histórico guardado exitosamente para: ${dateStr}`);
  return result;
}

if (require.main === module) {
  runScraper();
}

module.exports = { runScraper, scrapeHistoryDate };

