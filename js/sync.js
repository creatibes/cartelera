/**
 * Sync Manager - Gestión de persistencia local y sincronización remota con GitHub / JSON
 */
class SyncManager {
  constructor(options = {}) {
    this.storageKey = 'loteria_geronimo_data';
    this.configKey = 'loteria_geronimo_config';
    this.remoteUrl = localStorage.getItem('remote_sync_url') || './data/resultados.json';
    this.pollIntervalSec = 8; // Sondeo ultra-rápido en tiempo real cada 8 segundos
    this.pollingTimer = null;
    this.onDataUpdated = options.onDataUpdated || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.latestChange = null;
  }

  // Carga los datos: intenta desde localStorage, si no existe o es de otro día usa INITIAL_DATA
  loadCurrentData() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (parsed.date && parsed.date !== todayStr) {
          console.log('Detectado cambio de día en almacenamiento local. Reiniciando...');
          localStorage.removeItem(this.storageKey);
          return INITIAL_DATA;
        }
        // Asegurar estructura de chance_en_linea si se cargó de versión anterior
        if (!parsed.chance_en_linea) {
          parsed.chance_en_linea = JSON.parse(JSON.stringify(INITIAL_DATA.chance_en_linea));
        }
        return parsed;
      }
    } catch (err) {
      console.warn('Error leyendo localStorage, usando INITIAL_DATA:', err);
    }
    // Guardar los datos iniciales
    this.saveLocalData(INITIAL_DATA);
    return INITIAL_DATA;
  }

  // Guarda en localStorage
  saveLocalData(data) {
    try {
      data.updatedAt = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('Error guardando en localStorage:', err);
      return false;
    }
  }

  // Inicia el ciclo de sondeo (polling) para actualizaciones remotas
  startPolling() {
    this.stopPolling();
    // Sondeo inmediato
    this.fetchRemoteData();
    // Sondeo programado
    this.pollingTimer = setInterval(() => {
      this.fetchRemoteData();
    }, this.pollIntervalSec * 1000);
  }

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  // Configura la URL remota (ej: GitHub raw) y el intervalo
  updateSyncSettings(url, intervalSec) {
    this.remoteUrl = url || './data/resultados.json';
    this.pollIntervalSec = Math.max(10, parseInt(intervalSec) || 30);
    localStorage.setItem('remote_sync_url', this.remoteUrl);
    localStorage.setItem('sync_interval_sec', this.pollIntervalSec);
    this.startPolling();
  }

  // Consulta el JSON remoto (o el archivo local data/resultados.json)
  async fetchRemoteData() {
    if (!this.remoteUrl) return;

    try {
      this.onStatusChange({ status: 'syncing', message: 'Verificando...' });
      // Añadir timestamp para evitar caché agresivo del navegador
      const cacheBustUrl = this.remoteUrl + (this.remoteUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
      const response = await fetch(cacheBustUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const remoteData = await response.json();
      const currentData = this.loadCurrentData();

      // Detectar cambios o cambio de fecha
      const dateChanged = remoteData.date && currentData.date && remoteData.date !== currentData.date;
      const differences = this.detectDifferences(currentData, remoteData);

      if (dateChanged || differences.length > 0) {
        console.log('Sincronizando datos remotos en vivo:', { dateChanged, diffsCount: differences.length });
        this.latestChange = differences[0] || null;
        this.saveLocalData(remoteData);
        this.onDataUpdated(remoteData, differences);
      }

      this.onStatusChange({ 
        status: 'online', 
        message: 'En Vivo', 
        lastChecked: new Date() 
      });
    } catch (err) {
      // Si falla la red, el sistema sigue funcionando offline con localStorage
      this.onStatusChange({ 
        status: 'offline', 
        message: 'Modo Local', 
        error: err.message 
      });
    }
  }

  // Compara si hubo cambios entre los datos actuales y los nuevos
  detectDifferences(current, remote) {
    const diffs = [];
    if (!current || !remote) return diffs;

    // Comparar Triples
    if (remote.triples) {
      for (const [lotteryId, draws] of Object.entries(remote.triples)) {
        for (const [time, vals] of Object.entries(draws)) {
          const curVals = current.triples?.[lotteryId]?.[time] || {};
          const rA = vals.A || '';
          const rB = vals.B || '';
          const rC = vals.C || '';
          const cA = curVals.A || '';
          const cB = curVals.B || '';
          const cC = curVals.C || '';

          if (rA !== cA || rB !== cB || rC !== cC) {
            diffs.push({
              type: 'triple',
              lotteryId,
              time,
              newVal: vals,
              oldVal: curVals
            });
          }
        }
      }
    }

    // Comparar Animalitos
    if (remote.animalitos) {
      for (const [gameId, draws] of Object.entries(remote.animalitos)) {
        for (const [time, rawVal] of Object.entries(draws)) {
          const rawCur = current.animalitos?.[gameId]?.[time] || '';

          const rV = (typeof rawVal === 'object' && rawVal !== null) ? (rawVal.val || '') : (rawVal || '');
          const rL = (typeof rawVal === 'object' && rawVal !== null) ? (rawVal.label || '') : '';

          const cV = (typeof rawCur === 'object' && rawCur !== null) ? (rawCur.val || '') : (rawCur || '');
          const cL = (typeof rawCur === 'object' && rawCur !== null) ? (rawCur.label || '') : '';

          const normRV = (rV === '--' || !rV) ? '' : rV;
          const normCV = (cV === '--' || !cV) ? '' : cV;

          if (normRV !== normCV || rL !== cL) {
            diffs.push({
              type: 'animalito',
              gameId,
              time,
              newVal: normRV,
              label: rL,
              oldVal: normCV
            });
          }
        }
      }
    }

    // Comparar Chance en Línea (11 sorteos continuos 9:00 AM a 7:00 PM)
    if (remote.chance_en_linea) {
      for (const [time, vals] of Object.entries(remote.chance_en_linea)) {
        const curVals = current.chance_en_linea?.[time] || {};
        const rA = vals.A || '';
        const rB = vals.B || '';
        const rC = vals.C || '';
        const cA = curVals.A || '';
        const cB = curVals.B || '';
        const cC = curVals.C || '';

        if (rA !== cA || rB !== cB || rC !== cC) {
          diffs.push({
            type: 'chance_en_linea',
            time,
            newVal: vals,
            oldVal: curVals
          });
        }
      }
    }

    return diffs;
  }

  // Exportar archivo JSON descargable para respaldo
  exportJSON() {
    const data = this.loadCurrentData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `resultados_loteria_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Importar archivo JSON desde la computadora
  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.triples && !parsed.animalitos && !parsed.chance_en_linea) {
        throw new Error('Formato de archivo inválido.');
      }
      this.saveLocalData(parsed);
      this.onDataUpdated(parsed, [{ type: 'manual_import' }]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Reiniciar para un nuevo día (vacía los números dejando la plantilla intacta)
  resetForNewDay() {
    const freshData = JSON.parse(JSON.stringify(INITIAL_DATA));
    const d = new Date();
    freshData.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    freshData.updatedAt = new Date().toISOString();

    // Vaciar triples
    for (const lot of Object.keys(freshData.triples)) {
      for (const time of Object.keys(freshData.triples[lot])) {
        freshData.triples[lot][time] = { A: '', B: '', C: '' };
      }
    }

    // Vaciar Chance en Línea
    if (freshData.chance_en_linea) {
      for (const time of Object.keys(freshData.chance_en_linea)) {
        freshData.chance_en_linea[time] = { A: '', B: '', C: '' };
      }
    }

    // Vaciar animalitos
    for (const game of Object.keys(freshData.animalitos)) {
      for (const time of Object.keys(freshData.animalitos[game])) {
        freshData.animalitos[game][time] = '';
      }
    }

    this.saveLocalData(freshData);
    this.onDataUpdated(freshData, [{ type: 'day_reset' }]);
    return freshData;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SyncManager };
}
