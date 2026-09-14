const http = require('http');
const fs = require('fs');
const path = require('path');
const { runScraper, scrapeHistoryDate } = require('./scraper');

const PORT = process.env.PORT || 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

// =========================================================================
// GESTIÓN DE TASA OFICIAL BCV (BANCO CENTRAL DE VENEZUELA)
// =========================================================================
let cachedBcvRate = null;
let lastBcvFetchTime = 0;
const BCV_CACHE_TTL = 10 * 60 * 1000; // 10 minutos
const bcvRateFile = path.join(__dirname, 'data', 'bcv_rate.json');

// Cargar tasa en caché previo desde disco si existe
if (fs.existsSync(bcvRateFile)) {
  try {
    cachedBcvRate = JSON.parse(fs.readFileSync(bcvRateFile, 'utf8'));
  } catch (e) {}
}

async function fetchOfficialBcvRate(force = false) {
  const now = Date.now();
  if (!force && cachedBcvRate && (now - lastBcvFetchTime < BCV_CACHE_TTL)) {
    return cachedBcvRate;
  }

  const sources = [
    { url: 'https://ve.dolarapi.com/v1/dolares/oficial', parse: (d) => d.promedio },
    { url: 'https://open.er-api.com/v6/latest/USD', parse: (d) => d.rates && d.rates.VES }
  ];

  for (const src of sources) {
    try {
      const res = await fetch(src.url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const json = await res.json();
        const num = src.parse(json);
        if (num && !isNaN(num) && num > 0) {
          const rateNum = Number(num);
          const formatted = rateNum.toLocaleString('es-VE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });

          cachedBcvRate = {
            success: true,
            rate: rateNum,
            formatted: formatted,
            symbol: 'Bs.',
            display: `${formatted} Bs.`,
            source: src.url.includes('dolarapi') ? 'BCV Oficial' : 'Mercado Oficial',
            date: json.fechaActualizacion || new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString()
          };
          lastBcvFetchTime = now;

          try {
            fs.writeFileSync(bcvRateFile, JSON.stringify(cachedBcvRate, null, 2), 'utf8');
          } catch (e) {}

          return cachedBcvRate;
        }
      }
    } catch (err) {
      console.warn(`[BCV] Error consultando fuente ${src.url}:`, err.message);
    }
  }

  if (cachedBcvRate) {
    return cachedBcvRate;
  }

  return {
    success: true,
    rate: 832.49,
    formatted: '832,49',
    symbol: 'Bs.',
    display: '832,49 Bs.',
    source: 'BCV Oficial',
    updatedAt: new Date().toISOString()
  };
}

const server = http.createServer(async (req, res) => {
  let reqUrl = req.url.split('?')[0];

  // Endpoint para consultar la Tasa Oficial del BCV
  if (reqUrl === '/api/bcv-rate') {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const force = urlObj.searchParams.get('force') === 'true';
    try {
      const bcvData = await fetchOfficialBcvRate(force);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify(bcvData));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // Endpoint para forzar sincronización en vivo desde la cartelera
  if (reqUrl === '/api/sync-now') {
    try {
      await runScraper();
      fetchOfficialBcvRate(true).catch(() => {});
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: true, message: 'Resultados actualizados.' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // Endpoint para listar fechas históricas disponibles
  if (reqUrl === '/api/history-dates') {
    try {
      const historyDir = path.join(__dirname, 'data', 'history');
      let dates = [];
      if (fs.existsSync(historyDir)) {
        dates = fs.readdirSync(historyDir)
          .filter(f => f.endsWith('.json'))
          .map(f => f.replace('.json', ''))
          .sort()
          .reverse();
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: true, dates }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // Endpoint para consultar resultados de una fecha histórica
  if (reqUrl === '/api/history') {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const dateParam = urlObj.searchParams.get('date');
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Fecha inválida. Use formato YYYY-MM-DD.' }));
    }

    const historyFile = path.join(__dirname, 'data', 'history', `${dateParam}.json`);
    let fileHasValidData = false;
    let cachedContent = null;

    if (fs.existsSync(historyFile)) {
      try {
        cachedContent = fs.readFileSync(historyFile, 'utf8');
        const parsed = JSON.parse(cachedContent);
        const hasAnimals = parsed.animalitos && Object.values(parsed.animalitos).some(draws =>
          Object.values(draws).some(v => v && v !== '--' && v !== 'N/J' && (typeof v === 'object' ? v.val : v))
        );
        const hasTrips = parsed.triples && Object.values(parsed.triples).some(draws =>
          Object.values(draws).some(v => v && (v.A || v.B || v.C))
        );
        if (hasAnimals || hasTrips) {
          fileHasValidData = true;
        }
      } catch (e) {}
    }

    if (fileHasValidData && cachedContent) {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(cachedContent);
    } else {
      // Buscar en línea en las fuentes oficiales
      try {
        console.log(`[Histórico] Consultando resultados oficiales para fecha: ${dateParam}...`);
        const historicalData = await scrapeHistoryDate(dateParam);
        if (historicalData) {
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          });
          return res.end(JSON.stringify(historicalData, null, 2));
        }
      } catch (err) {
        console.error(`Error buscando histórico para ${dateParam}:`, err.message);
      }

      res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: `No hay resultados oficiales registrados para la fecha ${dateParam}.` }));
    }
  }

  // Endpoint para actualizar nombre de la agencia
  if (reqUrl === '/api/save-agency-name' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const name = (payload.name || payload.agency || '').trim();
        if (name) {
          const dataFile = path.join(__dirname, 'data', 'resultados.json');
          if (fs.existsSync(dataFile)) {
            const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
            data.agency = name.trim();
            fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
          }
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ success: true, name: name.trim() }));
        }
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Nombre inválido' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Endpoint para guardar modificaciones manuales de taquilla o cartelera
  if (reqUrl === '/api/save-result' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { date, type, lotteryId, gameId, time, field, value } = payload;

        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const targetDate = (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : todayStr;
        const isHistorical = targetDate !== todayStr;

        const targetFile = isHistorical
          ? path.join(__dirname, 'data', 'history', `${targetDate}.json`)
          : path.join(__dirname, 'data', 'resultados.json');

        if (fs.existsSync(targetFile)) {
          const fileData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
          if (!fileData.manualOverrides) fileData.manualOverrides = {};

          if (type === 'triple') {
            const id = lotteryId;
            if (!fileData.triples) fileData.triples = {};
            if (!fileData.triples[id]) fileData.triples[id] = {};
            if (!fileData.triples[id][time]) fileData.triples[id][time] = { A: '', B: '', C: '' };
            fileData.triples[id][time][field] = value;

            const overrideKey = `triple:${id}:${time}:${field}`;
            if (value) {
              fileData.manualOverrides[overrideKey] = true;
            } else {
              delete fileData.manualOverrides[overrideKey];
            }
          } else if (type === 'animalito') {
            const id = gameId;
            if (!fileData.animalitos) fileData.animalitos = {};
            if (!fileData.animalitos[id]) fileData.animalitos[id] = {};
            fileData.animalitos[id][time] = value;

            const overrideKey = `animalito:${id}:${time}`;
            const numVal = (typeof value === 'object' && value !== null) ? value.val : value;
            if (numVal) {
              fileData.manualOverrides[overrideKey] = true;
            } else {
              delete fileData.manualOverrides[overrideKey];
            }
          } else if (type === 'chance_en_linea') {
            if (!fileData.chance_en_linea) fileData.chance_en_linea = {};
            if (!fileData.chance_en_linea[time]) fileData.chance_en_linea[time] = { A: '', B: '', C: '' };
            fileData.chance_en_linea[time][field] = value;

            const overrideKey = `chance_en_linea:${time}:${field}`;
            if (value) {
              fileData.manualOverrides[overrideKey] = true;
            } else {
              delete fileData.manualOverrides[overrideKey];
            }
          }

          fileData.updatedAt = new Date().toISOString();
          fs.writeFileSync(targetFile, JSON.stringify(fileData, null, 2), 'utf8');

          // Si es hoy, también respaldar en history/${todayStr}.json
          if (!isHistorical) {
            const historyDir = path.join(__dirname, 'data', 'history');
            if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
            fs.writeFileSync(path.join(historyDir, `${todayStr}.json`), JSON.stringify(fileData, null, 2), 'utf8');
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (reqUrl === '/') reqUrl = '/index.html';
  
  const filePath = path.join(__dirname, reqUrl);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const ifaces = os.networkInterfaces();
  let localIp = 'localhost';
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIp = net.address;
        break;
      }
    }
  }

  console.log('===========================================================');
  console.log('       CARTELERA DIGITAL DE LOTERÍAS & ANIMALITOS          ');
  console.log('                 AGENCIA GERÓNIMO EL REY                   ');
  console.log('===========================================================');
  console.log(`✓ Servidor activo en esta PC:     http://localhost:${PORT}`);
  console.log(`✓ Para ver en otra PC / Smart TV: http://${localIp}:${PORT}`);
  console.log('✓ Buscador automático (Scraper) INICIADO en segundo plano.');
  console.log('✓ Consultando fuentes oficiales por internet cada 20 segundos.');
  console.log('-----------------------------------------------------------');

  // Ejecutar scraper al iniciar
  runScraper().catch(err => console.error('Error en scraper inicial:', err));

  // Obtener tasa oficial del BCV al iniciar
  fetchOfficialBcvRate().then(bcv => {
    console.log(`✓ Tasa Oficial BCV cargada: ${bcv.display}`);
  }).catch(err => console.error('Error obteniendo tasa BCV inicial:', err));

  // Programar búsqueda automática de loterías cada 20 segundos
  setInterval(() => {
    runScraper().catch(err => console.error('Error en ciclo de scraper:', err));
  }, 20 * 1000);

  // Programar actualización de tasa BCV cada 10 minutos
  setInterval(() => {
    fetchOfficialBcvRate(true).catch(err => console.error('Error en ciclo de tasa BCV:', err));
  }, 10 * 60 * 1000);
});
