/**
 * Aplicación Principal - Cartelera Digital de Loterías
 */
class LotteryBillboardApp {
  constructor() {
    this.syncManager = null;
    this.currentData = null;
    this.soundEnabled = localStorage.getItem('sound_enabled') === 'true';
    // Locutor por voz (canta loterías, números y animalitos/signos)
    const storedVoice = localStorage.getItem('voice_enabled');
    this.voiceEnabled = storedVoice !== null ? storedVoice === 'true' : true;
    this.viewMode = 'all'; // 'all' o 'tv_rotation'
    this.tvSlideIndex = 0;
    this.tvRotationTimer = null;
    this.tvProgressTimer = null;
    this.slideDurationMs = 15000; // 15 segundos por diapositiva
    this.audioContext = null;

    // Nombre de la agencia personalizado
    this.agencyName = localStorage.getItem('agency_name') || 'GERÓNIMO EL REY';

    // Modo barra oculta (con fecha y hora juntas)
    this.isHeaderHidden = localStorage.getItem('header_hidden') === 'true';

    // Estado de vista del panel de triples ('clasicos' o 'chance')
    this.activeTriplesView = 'clasicos';
    // Rotación automática activa por defecto (ideal para TV)
    const storedAuto = localStorage.getItem('auto_rotate_triples');
    this.autoRotateTriples = storedAuto !== null ? storedAuto === 'true' : true;
    this.autoRotateSeconds = parseInt(localStorage.getItem('auto_rotate_seconds'), 10) || 20;
    this.autoRotateTimer = null;
    this.autoRotateElapsedMs = 0;
    this.autoRotateStepMs = 100;

    // Fecha actualmente consultada (null = hoy en vivo)
    this.viewingDate = null;

    this.init();
  }

  init() {
    // Inicializar SyncManager
    this.syncManager = new SyncManager({
      onDataUpdated: (newData, diffs) => this.handleDataUpdated(newData, diffs),
      onStatusChange: (status) => this.handleStatusChange(status)
    });

    this.currentData = this.syncManager.loadCurrentData();
    if (!this.currentData.chance_en_linea) {
      this.currentData.chance_en_linea = JSON.parse(JSON.stringify(INITIAL_DATA.chance_en_linea));
    }
    if (this.currentData && this.currentData.agency && !localStorage.getItem('agency_name')) {
      this.agencyName = this.currentData.agency;
    }

    // Renderizar estructura inicial
    this.renderHeader();
    this.setupAgencyName();
    this.setupCompactHeader();
    this.setupDateNavigation();
    this.setupTriplesViewSwitcher();
    this.renderTriples();
    this.renderChanceEnLinea();
    this.renderAnimalitos();
    this.setupAdminModal();
    this.setupKeyboardShortcuts();
    this.startClock();

    // Cargar tasa del Banco Central de Venezuela y programar actualización automática cada 5 minutos
    this.fetchBcvRate();
    setInterval(() => this.fetchBcvRate(), 5 * 60 * 1000);
    this.setupBcvClickListener();

    // Verificar si se abrió erróneamente con doble clic directo (file:///)
    this.checkEnvironment();

    // Iniciar polling remoto
    this.syncManager.startPolling();
  }

  // =========================================================================
  // DETECCIÓN DE PROTOCOLO Y ENTORNO
  // =========================================================================
  checkEnvironment() {
    if (window.location.protocol === 'file:') {
      const banner = document.createElement('div');
      banner.id = 'file-protocol-banner';
      banner.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999999;
        background: linear-gradient(135deg, #7f1d1d, #991b1b);
        color: #fff;
        border: 2px solid #ef4444;
        border-radius: 12px;
        padding: 1.2rem 1.6rem;
        box-shadow: 0 10px 35px rgba(0,0,0,0.85);
        font-family: var(--font-sans, sans-serif);
        text-align: center;
        max-width: 620px;
        width: 92%;
      `;
      banner.innerHTML = `
        <div style="font-size: 1.25rem; font-weight: 800; margin-bottom: 0.6rem; color: #fef08a;">
          ⚠️ ATENCIÓN: Abriste el archivo con doble clic directo (file:///)
        </div>
        <div style="font-size: 0.95rem; line-height: 1.4; margin-bottom: 0.8rem; color: #f1f5f9;">
          Los navegadores bloquean la carga de resultados en vivo en este modo por seguridad.<br>
          <strong>Para que la cartelera cargue y funcione al 100%:</strong>
        </div>
        <div style="background: rgba(0,0,0,0.4); padding: 0.75rem 1rem; border-radius: 8px; text-align: left; font-size: 0.9rem; line-height: 1.5; margin-bottom: 0.9rem; color: #e2e8f0; border: 1px solid rgba(255,255,255,0.15);">
          1️⃣ Abre la carpeta de la cartelera y haz doble clic en <strong>INICIAR_CARTELERA.bat</strong>.<br>
          2️⃣ Si el servidor ya está activo, entra en tu navegador a: <a href="http://localhost:3000" style="color: #38bdf8; font-weight: bold; text-decoration: underline;">http://localhost:3000</a><br>
          3️⃣ Si estás en otra computadora o televisor en la misma red Wi-Fi, ábrelo con la IP de la PC principal.
        </div>
        <button onclick="this.parentElement.remove()" style="background: rgba(255,255,255,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.4); padding: 6px 18px; border-radius: 6px; cursor: pointer; font-weight: 600;">
          Entendido / Cerrar aviso
        </button>
      `;
      document.body.appendChild(banner);
    }
  }

  // =========================================================================
  // RELOJ Y FECHA EN VIVO
  // =========================================================================
  startClock() {
    const clockEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');

    const updateTime = () => {
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('es-VE', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true 
      });

      if (clockEl) {
        clockEl.textContent = timeFormatted;
      }

      if (dateEl && !this.viewingDate) {
        const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('es-ES', options);
      }

      // Actualizar fecha y hora juntos en la barra compacta
      const compactDateTime = document.getElementById('compact-datetime');
      if (compactDateTime) {
        let datePart = '';
        if (this.viewingDate) {
          const dParts = this.viewingDate.split('-');
          datePart = `[${dParts[2]}/${dParts[1]}/${dParts[0]}]`;
        } else {
          datePart = now.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
        }
        compactDateTime.textContent = `📅 ${datePart} • 🕐 ${timeFormatted}`;
      }
    };

    updateTime();
    setInterval(updateTime, 1000);
  }

  // =========================================================================
  // GESTIÓN DE TASA OFICIAL DEL BANCO CENTRAL DE VENEZUELA (BCV)
  // =========================================================================
  setupBcvClickListener() {
    const el = document.getElementById('header-bcv-rate');
    if (el) {
      el.addEventListener('click', async () => {
        this.showToast('Consultando tasa oficial del BCV en vivo...', 'info');
        await this.fetchBcvRate(true);
        if (this.bcvRate && this.bcvRate.formatted) {
          this.showToast(`Tasa BCV actualizada: ${this.bcvRate.formatted} Bs.`, 'success');
        }
      });
    }
  }

  async fetchBcvRate(force = false) {
    try {
      const url = force ? '/api/bcv-rate?force=true' : '/api/bcv-rate';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.formatted) {
        this.bcvRate = data;
        this.updateBcvRateUI(data);
        return;
      }
    } catch (err) {
      console.warn('Servidor local no devolvió tasa BCV, intentando fuente directa:', err);
    }

    // Respaldo directo en el cliente si el servidor está temporalmente fuera
    try {
      const directRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (directRes.ok) {
        const directData = await directRes.json();
        if (directData && directData.promedio) {
          const formatted = Number(directData.promedio).toLocaleString('es-VE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          const bcvObj = {
            rate: directData.promedio,
            formatted: formatted,
            symbol: 'Bs.',
            display: `${formatted} Bs.`
          };
          this.bcvRate = bcvObj;
          this.updateBcvRateUI(bcvObj);
        }
      }
    } catch (e) {
      console.warn('Fallback directo BCV no disponible:', e);
    }
  }

  updateBcvRateUI(data) {
    const text = `${data.formatted} ${data.symbol || 'Bs.'}`;
    const mainEl = document.getElementById('bcv-rate-display');
    const compactEl = document.getElementById('compact-bcv-val');
    const tvEl = document.getElementById('tv-bcv-val');

    if (mainEl) mainEl.textContent = text;
    if (compactEl) compactEl.textContent = text;
    if (tvEl) tvEl.textContent = text;
  }

  // =========================================================================
  // RENDERIZADO DE TRIPLES TRADICIONALES (PANEL IZQUIERDO)
  // =========================================================================
  renderTriples() {
    const container = document.getElementById('triples-container');
    if (!container) return;

    container.innerHTML = '';

    LOTTERIES_CONFIG.triples.forEach(lottery => {
      const lotteryData = this.currentData.triples?.[lottery.id] || {};
      const card = document.createElement('div');
      card.className = 'triple-card';

      // Es Zamorano o Triple tradicional?
      const isZamorano = lottery.id === 'zamorano';
      const isChance = lottery.id === 'chance';
      const gridClass = isZamorano ? 'zamorano-grid' : '';

      const chanceShortcutHtml = isChance ? `
        <button type="button" class="btn-chance-shortcut" id="btn-goto-chance-full" title="Ver horario continuo (9 AM a 7 PM)">⚡ 9 AM - 7 PM</button>
      ` : '';

      // Encabezado de la tarjeta
      card.innerHTML = `
        <div class="triple-card-header" style="border-left-color: ${lottery.color}; background: ${lottery.accent}">
          <span class="triple-name" style="color: ${lottery.color}">${lottery.name}</span>
          ${chanceShortcutHtml}
          <span class="triple-badge" style="background: ${lottery.color}; color: #000">${lottery.badge}</span>
        </div>
        <div class="triple-grid ${gridClass}">
          <div class="triple-grid-header">
            <span>Hora</span>
            ${lottery.fields.map(f => `<span>${f}</span>`).join('')}
          </div>
          ${lottery.draws.map(draw => {
            const rowData = lotteryData[draw.time] || (isChance && this.currentData.chance_en_linea?.[draw.time]) || {};
            if (isZamorano) {
              const isNjA = rowData.A === 'N/J';
              const isNjB = rowData.B === 'N/J';
              return `
                <div class="triple-row" data-lottery="${lottery.id}" data-time="${draw.time}">
                  <span class="draw-time">${draw.label}</span>
                  <span class="draw-val ${isNjA ? 'no-juega' : (!rowData.A ? 'empty' : '')}" data-field="A" title="${isNjA ? 'No realiza sorteo los domingos' : 'Clic para editar'}">${rowData.A || '--'}</span>
                  <span class="draw-val signo ${isNjB ? 'no-juega' : (!rowData.B ? 'empty' : '')}" data-field="B" title="${isNjB ? 'No realiza sorteo los domingos' : 'Clic para editar'}">${rowData.B || '--'}</span>
                </div>
              `;
            } else {
              const isNjA = rowData.A === 'N/J';
              const isNjB = rowData.B === 'N/J';
              const isNjC = rowData.C === 'N/J';
              return `
                <div class="triple-row" data-lottery="${lottery.id}" data-time="${draw.time}">
                  <span class="draw-time">${draw.label}</span>
                  <span class="draw-val ${isNjA ? 'no-juega' : (!rowData.A ? 'empty' : '')}" data-field="A" title="${isNjA ? 'No realiza sorteo los domingos' : 'Clic para editar'}">${rowData.A || '--'}</span>
                  <span class="draw-val ${isNjB ? 'no-juega' : (!rowData.B ? 'empty' : '')}" data-field="B" title="${isNjB ? 'No realiza sorteo los domingos' : 'Clic para editar'}">${rowData.B || '--'}</span>
                  <span class="draw-val signo ${isNjC ? 'no-juega' : (!rowData.C ? 'empty' : '')}" data-field="C" title="${isNjC ? 'No realiza sorteo los domingos' : 'Clic para editar'}">${rowData.C || '--'}</span>
                </div>
              `;
            }
          }).join('')}
        </div>
      `;

      if (isChance) {
        const shortcutBtn = card.querySelector('#btn-goto-chance-full');
        if (shortcutBtn) {
          shortcutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.switchTriplesView('chance');
          });
        }
      }

      // Añadir evento de clic rápido para taquilla / edición
      card.querySelectorAll('.draw-val').forEach(cell => {
        cell.addEventListener('click', (e) => {
          const row = e.target.closest('.triple-row');
          const lotteryId = row.dataset.lottery;
          const time = row.dataset.time;
          const field = e.target.dataset.field;
          this.openQuickEditTriple(lotteryId, time, field);
        });
      });

      container.appendChild(card);
    });
  }

  // =========================================================================
  // RENDERIZADO DE CHANCE EN LÍNEA (HORARIO CONTINUO 11 HORAS)
  // =========================================================================
  renderChanceEnLinea() {
    const container = document.getElementById('chance-container');
    if (!container) return;

    const chanceData = this.currentData.chance_en_linea || {};
    const hours = (typeof HORARIOS_CHANCE !== 'undefined' && HORARIOS_CHANCE) ? HORARIOS_CHANCE : [
      "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
      "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
      "5:00 PM", "6:00 PM", "7:00 PM"
    ];

    container.innerHTML = `
      <div class="chance-table-banner">
        <div class="chance-banner-title">⚡ CHANCE EN LÍNEA & ASTRAL</div>
        <div class="chance-banner-sub">11 Sorteos Continuos (9:00 AM - 7:00 PM)</div>
      </div>
      <div class="chance-grid-header">
        <div class="chance-col-title">HORA</div>
        <div class="chance-col-title" style="color: #f97316;">CHANCE A</div>
        <div class="chance-col-title" style="color: #f97316;">CHANCE B</div>
        <div class="chance-col-title" style="color: #38bdf8;">ASTRAL (SIGNO)</div>
      </div>
      <div class="chance-rows-wrapper">
        ${hours.map(hour => {
          const rowData = chanceData[hour] || {};
          const valA = rowData.A || '';
          const valB = rowData.B || '';
          const valC = rowData.C || '';

          // Separar número y signo en Astral
          let cNum = '';
          let cSign = '';
          if (valC) {
            const parts = valC.split(/\s+/);
            cNum = parts[0] || '';
            cSign = parts.slice(1).join(' ') || '';
          }

          let signBadgeHtml = '';
          if (cSign) {
            const cleanSign = cSign.replace(/[^\wÁÉÍÓÚáéíóúÑñ]/g, '').trim().toUpperCase();
            const icon = (typeof ZODIAC_ICONS !== 'undefined' && ZODIAC_ICONS[cleanSign]) ? ZODIAC_ICONS[cleanSign] : '✨';
            signBadgeHtml = `<span class="chance-astral-sign">${icon} ${cSign}</span>`;
          }

          const hourDisplay = hour.replace(':00', '');

          const isNjA = valA === 'N/J';
          const isNjB = valB === 'N/J';
          const isNjC = cNum === 'N/J';

          return `
            <div class="chance-row" data-time="${hour}">
              <div class="chance-hour-cell">${hourDisplay}</div>
              <div class="chance-val-cell ${isNjA ? 'no-juega' : (!valA ? 'empty' : '')}" data-field="A" title="${isNjA ? 'No realiza sorteo' : 'Clic para editar Triple A'}">${valA || '--'}</div>
              <div class="chance-val-cell ${isNjB ? 'no-juega' : (!valB ? 'empty' : '')}" data-field="B" title="${isNjB ? 'No realiza sorteo' : 'Clic para editar Triple B'}">${valB || '--'}</div>
              <div class="chance-astral-cell ${isNjC ? 'no-juega' : (!cNum ? 'empty' : '')}" data-field="C" title="${isNjC ? 'No realiza sorteo' : 'Clic para editar Chance Astral'}">
                <span>${cNum || '--'}</span>
                ${signBadgeHtml}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Añadir eventos de edición rápida
    container.querySelectorAll('.chance-val-cell, .chance-astral-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const row = e.target.closest('.chance-row');
        const time = row.dataset.time;
        const field = cell.dataset.field;
        this.openQuickEditChance(time, field);
      });
    });
  }

  // Configurar switcher de pestañas Clásicos vs Chance
  setupTriplesViewSwitcher() {
    const tabClasicos = document.getElementById('tab-triples-clasicos');
    const tabChance = document.getElementById('tab-triples-chance');
    const autoBtn = document.getElementById('btn-auto-rotate-triples');
    const gearBtn = document.getElementById('btn-auto-rotate-config');
    const timerBar = document.getElementById('triples-timer-bar-wrapper');

    if (tabClasicos) {
      tabClasicos.addEventListener('click', () => {
        this.switchTriplesView('clasicos');
        this.restartAutoRotateTimer();
      });
    }
    if (tabChance) {
      tabChance.addEventListener('click', () => {
        this.switchTriplesView('chance');
        this.restartAutoRotateTimer();
      });
    }
    if (timerBar) {
      timerBar.addEventListener('click', () => {
        const nextView = this.activeTriplesView === 'clasicos' ? 'chance' : 'clasicos';
        this.switchTriplesView(nextView);
        this.restartAutoRotateTimer();
      });
    }
    if (autoBtn) {
      autoBtn.addEventListener('click', () => this.toggleAutoRotateTriples());
    }
    if (gearBtn) {
      gearBtn.addEventListener('click', () => this.promptChangeAutoRotateDuration());
    }

    // Aplicar estado inicial de auto-rotación (activo por defecto)
    this.updateAutoRotateUI();
    if (this.autoRotateTriples) {
      this.startAutoRotateTimer();
    } else {
      this.updateAutoRotateTimerBar(0, 0);
    }
  }

  switchTriplesView(view) {
    this.activeTriplesView = view;
    const tabClasicos = document.getElementById('tab-triples-clasicos');
    const tabChance = document.getElementById('tab-triples-chance');
    const triplesCont = document.getElementById('triples-container');
    const chanceCont = document.getElementById('chance-container');

    if (view === 'chance') {
      if (tabClasicos) tabClasicos.classList.remove('active');
      if (tabChance) tabChance.classList.add('active');
      if (triplesCont) triplesCont.style.display = 'none';
      if (chanceCont) chanceCont.style.display = 'flex';
      this.renderChanceEnLinea();
    } else {
      if (tabClasicos) tabClasicos.classList.add('active');
      if (tabChance) tabChance.classList.remove('active');
      if (triplesCont) triplesCont.style.display = 'flex';
      if (chanceCont) chanceCont.style.display = 'none';
      this.renderTriples();
    }

    // Reiniciar inmediatamente la barra de tiempo para el nuevo sorteo
    this.autoRotateElapsedMs = 0;
    const totalMs = Math.max(5, this.autoRotateSeconds) * 1000;
    this.updateAutoRotateTimerBar(0, totalMs);
  }

  updateAutoRotateUI() {
    const btn = document.getElementById('btn-auto-rotate-triples');
    const label = document.getElementById('auto-sec-label');
    if (label) {
      label.textContent = `${this.autoRotateSeconds}s`;
    }
    if (btn) {
      if (this.autoRotateTriples) {
        btn.classList.add('active');
        btn.title = `Rotación automática activa (cambia cada ${this.autoRotateSeconds}s). Clic para pausar.`;
      } else {
        btn.classList.remove('active');
        btn.title = `Rotación automática pausada. Clic para activar (${this.autoRotateSeconds}s).`;
      }
    }
  }

  toggleAutoRotateTriples() {
    this.autoRotateTriples = !this.autoRotateTriples;
    localStorage.setItem('auto_rotate_triples', this.autoRotateTriples);
    this.updateAutoRotateUI();

    if (this.autoRotateTriples) {
      this.startAutoRotateTimer();
      this.showToast(`Rotación automática activada (cada ${this.autoRotateSeconds}s)`, 'success');
    } else {
      this.stopAutoRotateTimer();
      this.updateAutoRotateTimerBar(0, 0);
      this.showToast('Rotación automática pausada. Usa teclas [↑] o [↓] para alternar', 'info');
    }
  }

  startAutoRotateTimer() {
    this.stopAutoRotateTimer();
    this.autoRotateElapsedMs = 0;
    const totalMs = Math.max(5, this.autoRotateSeconds) * 1000;
    this.updateAutoRotateTimerBar(0, totalMs);

    this.autoRotateTimer = setInterval(() => {
      this.autoRotateElapsedMs += this.autoRotateStepMs;
      this.updateAutoRotateTimerBar(this.autoRotateElapsedMs, totalMs);

      if (this.autoRotateElapsedMs >= totalMs) {
        this.autoRotateElapsedMs = 0;
        const nextView = this.activeTriplesView === 'clasicos' ? 'chance' : 'clasicos';
        this.switchTriplesView(nextView);
      }
    }, this.autoRotateStepMs);
  }

  stopAutoRotateTimer() {
    if (this.autoRotateTimer) {
      clearInterval(this.autoRotateTimer);
      this.autoRotateTimer = null;
    }
  }

  restartAutoRotateTimer() {
    if (this.autoRotateTriples) {
      this.startAutoRotateTimer();
    } else {
      this.updateAutoRotateTimerBar(0, 0);
    }
  }

  updateAutoRotateTimerBar(elapsedMs = 0, totalMs = 20000) {
    const textEl = document.getElementById('triples-timer-text');
    const fillEl = document.getElementById('triples-progress-fill');
    const iconEl = document.getElementById('triples-timer-icon');
    const wrapper = document.getElementById('triples-timer-bar-wrapper');
    if (!wrapper) return;

    if (!this.autoRotateTriples) {
      if (textEl) {
        textEl.innerHTML = `<span style="color: #94a3b8;">⏸️ Rotación en pausa</span> • <span style="color: #38bdf8; font-weight: 600;">Pulsa [↑] o [↓] para alternar</span>`;
      }
      if (fillEl) {
        fillEl.style.width = '0%';
      }
      if (iconEl) iconEl.textContent = '⏸️';
      wrapper.classList.add('paused');
      return;
    }

    wrapper.classList.remove('paused');
    const remainingMs = Math.max(0, totalMs - elapsedMs);
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
    const pct = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

    if (fillEl) {
      fillEl.style.width = `${pct}%`;
      if (this.activeTriplesView === 'clasicos') {
        fillEl.style.background = 'linear-gradient(90deg, #f59e0b, #f97316)';
        fillEl.style.boxShadow = '0 0 8px rgba(249, 115, 22, 0.6)';
      } else {
        fillEl.style.background = 'linear-gradient(90deg, #38bdf8, #f59e0b)';
        fillEl.style.boxShadow = '0 0 8px rgba(245, 158, 11, 0.6)';
      }
    }

    if (iconEl) {
      iconEl.textContent = remainingSec <= 3 ? '⚡' : '⏳';
    }

    if (textEl) {
      if (this.activeTriplesView === 'clasicos') {
        textEl.innerHTML = `Mostrando Clásicos • Próximo cambio a <strong style="color: #fb923c;">⚡ Chance Completo</strong> en <span class="timer-countdown">${remainingSec}s</span>`;
      } else {
        textEl.innerHTML = `Mostrando Chance Completo • Próximo cambio a <strong style="color: #facc15;">⭐ Triples Clásicos</strong> en <span class="timer-countdown">${remainingSec}s</span>`;
      }
    }
  }

  promptChangeAutoRotateDuration() {
    const input = prompt(
      `⚙️ Tiempo de rotación automática para TV:\n¿Cada cuántos segundos cambiar entre Clásicos y Chance en Línea? (Ej: 15, 20, 30, 45):`,
      this.autoRotateSeconds
    );
    if (input !== null) {
      const parsed = parseInt(input.trim(), 10);
      if (isNaN(parsed) || parsed < 5 || parsed > 600) {
        alert('Por favor ingrese un tiempo válido en segundos (entre 5 y 600).');
        return;
      }
      this.autoRotateSeconds = parsed;
      localStorage.setItem('auto_rotate_seconds', this.autoRotateSeconds);
      this.updateAutoRotateUI();
      if (this.autoRotateTriples) {
        this.startAutoRotateTimer();
      }
      this.showToast(`⏱️ Rotación configurada a ${this.autoRotateSeconds} segundos`, 'success');
    }
  }

  openQuickEditChance(time, field) {
    const raw = this.currentData.chance_en_linea?.[time]?.[field] || '';
    const currentVal = raw === '--' ? '' : raw;
    const fieldName = field === 'C' ? 'Astral (Signo)' : `Triple ${field}`;

    const newVal = prompt(`Editar Chance en Línea (${time}) - ${fieldName}:\n(Ej: "756" o "890 SAG")`, currentVal);
    if (newVal !== null) {
      const trimmed = newVal.trim();
      if (!this.currentData.chance_en_linea) this.currentData.chance_en_linea = {};
      if (!this.currentData.chance_en_linea[time]) this.currentData.chance_en_linea[time] = { A: '', B: '', C: '' };
      this.currentData.chance_en_linea[time][field] = trimmed;

      if (!this.currentData.manualOverrides) this.currentData.manualOverrides = {};
      const overrideKey = `chance_en_linea:${time}:${field}`;
      if (trimmed) {
        this.currentData.manualOverrides[overrideKey] = true;
      } else {
        delete this.currentData.manualOverrides[overrideKey];
      }

      this.renderChanceEnLinea();
      this.syncManager.saveLocalData(this.currentData);
      this.saveResultToBackend({
        type: 'chance_en_linea',
        time,
        field,
        value: trimmed
      });
      this.showToast(`Chance ${time} [${fieldName}] actualizado a: ${trimmed || '(vacío)'}`, 'success');
    }
  }

  // =========================================================================
  // RENDERIZADO DE ANIMALITOS Y RULETAS (PANEL DERECHO)
  // =========================================================================
  renderAnimalitos() {
    const container = document.getElementById('animalitos-container');
    if (!container) return;

    const games = LOTTERIES_CONFIG.animalitos;

    // Generar cabecera de la matriz
    let headerHtml = `
      <div class="animalitos-grid-header">
        <div class="grid-col-title hour-col">HORA</div>
        ${games.map(g => `
          <div class="grid-col-title" style="color: ${g.color}; background: ${g.bgHeader}">
            ${g.short}
          </div>
        `).join('')}
      </div>
    `;

    // Generar las 12 filas de horarios (8am a 7pm)
    let rowsHtml = HORARIOS_ANIMALITOS.map(hour => {
      const hourDisplay = hour.replace(':00', ''); // ej "8 AM"
      return `
        <div class="animalitos-row" data-time="${hour}">
          <div class="hour-cell">${hourDisplay}</div>
          ${games.map(g => {
            const rawCell = this.currentData.animalitos?.[g.id]?.[hour] || '';
            let val = '';
            let label = '';

            if (typeof rawCell === 'object' && rawCell !== null) {
              val = rawCell.val || '';
              label = rawCell.label || '';
            } else {
              val = String(rawCell).trim();
            }

            // Si es juego de animalitos, aplicar diccionario si no trajo nombre
            if (val && g.type === 'animal') {
              const cleanVal = val.replace(/^0+/, '') || '0';
              const dictItem = (typeof ANIMALITOS_DICT !== 'undefined') ? (ANIMALITOS_DICT[val] || ANIMALITOS_DICT[cleanVal] || ANIMALITOS_DICT['0' + cleanVal]) : null;
              if (dictItem) {
                if (!label) {
                  label = `${dictItem.icon} ${dictItem.name}`;
                } else if (!label.includes(dictItem.icon)) {
                  label = `${dictItem.icon} ${label}`;
                }
              }
            }

            // Si es juego zodiacal (El Ruco, La Ruca), acompañar con símbolo zodiacal
            if (label && (g.type === 'zodiac' || g.id === 'el_ruco' || g.id === 'la_ruca')) {
              const cleanSign = label.replace(/[^\wÁÉÍÓÚáéíóúÑñ]/g, '').trim().toUpperCase();
              if (typeof ZODIAC_ICONS !== 'undefined' && ZODIAC_ICONS[cleanSign] && !label.includes(ZODIAC_ICONS[cleanSign])) {
                label = `${ZODIAC_ICONS[cleanSign]} ${label}`;
              }
            }

            const isNoDraw = (g.noDraws && g.noDraws.includes(hour) && (!val || val === '--'));
            const isEmpty = !val || val === '--';

            if (isNoDraw) {
              return `
                <div class="number-cell no-draw" 
                     data-game="${g.id}" 
                     data-time="${hour}"
                     title="${g.name} no realiza sorteo a las ${hour}">
                  <span class="no-draw-label">N/J</span>
                </div>
              `;
            }

            return `
              <div class="number-cell ${isEmpty ? 'empty' : ''}" 
                   data-game="${g.id}" 
                   data-time="${hour}"
                   title="Clic para editar ${g.name} ${hour}">
                <span class="val">${val || '--'}</span>
                ${label ? `<span class="animal-label">${label}</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="animalitos-grid">
        ${headerHtml}
        ${rowsHtml}
      </div>
    `;

    // Evento de clic en celda de animalito
    container.querySelectorAll('.number-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const gameId = cell.dataset.game;
        const time = cell.dataset.time;
        this.openQuickEditAnimalito(gameId, time);
      });
    });
  }

  // =========================================================================
  // SONIDO DE CAMPANILLA SINTETIZADO (CERO DEPENDENCIAS, OFFLINE)
  // =========================================================================
  playChime() {
    if (!this.soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      // Acorde armónico de dos tonos estilo campana de sorteo
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.9);
    } catch (e) {
      console.warn('Audio no disponible:', e);
    }
  }

  // =========================================================================
  // LOCUTOR AUTOMÁTICO POR VOZ (WEB SPEECH API NATIVO - CERO DEPENDENCIAS)
  // =========================================================================
  formatSpokenTime(timeStr) {
    if (!timeStr) return '';
    const m = timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
    if (!m) return timeStr;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3].toLowerCase();

    let period = ampm === 'am' ? 'de la mañana' : (h >= 7 && h < 12 ? 'de la noche' : 'de la tarde');
    let minText = '';
    if (min === 0) minText = 'en punto';
    else if (min === 15) minText = 'y quince';
    else if (min === 30) minText = 'y media';
    else if (min === 45) minText = 'y cuarenta y cinco';
    else minText = `y ${min}`;

    return `${h} ${minText} ${period}`.replace(/\s+/g, ' ').trim();
  }

  formatDigits(numStr) {
    if (!numStr) return '';
    return String(numStr).trim().split('').join(' ');
  }

  getZodiacFullName(signStr) {
    if (!signStr) return '';
    const clean = signStr.replace(/[^\wÁÉÍÓÚáéíóúÑñ]/g, '').trim().toUpperCase();
    const map = {
      'ARI': 'Aries', 'ARIES': 'Aries',
      'TAU': 'Tauro', 'TAURO': 'Tauro',
      'GEM': 'Géminis', 'GÉMINIS': 'Géminis', 'GEMINIS': 'Géminis',
      'CAN': 'Cáncer', 'CÁNCER': 'Cáncer', 'CANCER': 'Cáncer',
      'LEO': 'Leo',
      'VIR': 'Virgo', 'VIRGO': 'Virgo',
      'LIB': 'Libra', 'LIBRA': 'Libra',
      'ESC': 'Escorpio', 'ESCORPIO': 'Escorpio', 'SCO': 'Escorpio',
      'SAG': 'Sagitario', 'SAGITARIO': 'Sagitario',
      'CAP': 'Capricornio', 'CAPRICORNIO': 'Capricornio',
      'ACU': 'Acuario', 'ACUARIO': 'Acuario',
      'PIS': 'Piscis', 'PISCIS': 'Piscis'
    };
    return map[clean] || signStr;
  }

  speakAnnouncement(text) {
    if (!this.voiceEnabled) return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-VE';
        utterance.rate = 0.95; // Ritmo claro
        utterance.pitch = 1.05; // Tono alegre y enérgico
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const esVoice = voices.find(v => v.lang.startsWith('es-VE')) ||
                        voices.find(v => v.lang.startsWith('es-419')) ||
                        voices.find(v => v.lang.startsWith('es-US')) ||
                        voices.find(v => v.lang.startsWith('es-ES')) ||
                        voices.find(v => v.lang.startsWith('es'));
        if (esVoice) utterance.voice = esVoice;

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Error en locución por voz:', e);
      }
    }, 450);
  }

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    localStorage.setItem('voice_enabled', this.voiceEnabled);
    this.renderHeader();
    this.updateAdminVoiceUI();
    if (this.voiceEnabled) {
      this.showToast('Locutor por voz activado 🗣️', 'success');
      this.speakAnnouncement('Locutor de resultados activado. Cantaré cada sorteo en vivo.');
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      this.showToast('Locutor por voz pausado 🔇', 'info');
    }
  }

  updateAdminVoiceUI() {
    const btn = document.getElementById('btn-admin-toggle-voice');
    if (btn) {
      btn.textContent = this.voiceEnabled ? '🗣️ Voz: ACTIVADA' : '🔇 Voz: DESACTIVADA';
      btn.className = this.voiceEnabled ? 'btn-primary' : 'action-btn';
    }
  }

  // =========================================================================
  // MANEJO DE ACTUALIZACIONES DETECTADAS
  // =========================================================================
  handleDataUpdated(newData, diffs) {
    this.currentData = newData;
    this.renderTriples();
    this.renderAnimalitos();
    this.renderChanceEnLinea();

    if (diffs && diffs.length > 0) {
      // Si son muchos cambios juntos (sincronización inicial), informar sin saturar campanilla ni voz
      if (diffs.length > 4) {
        this.showToast('Resultados actualizados y sincronizados en vivo.', 'info');
        return;
      }

      const first = diffs[0];
      this.playChime();

      if (first.type === 'triple') {
        const lot = LOTTERIES_CONFIG.triples.find(t => t.id === first.lotteryId);
        const name = lot ? lot.name : first.lotteryId;
        const spokenTime = this.formatSpokenTime(first.time);
        const vals = first.newVal || {};

        this.showToast(`¡Nuevo resultado en ${name} (${first.time})!`, 'success');

        // Locución por voz para Triples
        if (first.lotteryId === 'zamorano') {
          const tripA = this.formatDigits(vals.A);
          let astroText = '';
          if (vals.B) {
            const parts = vals.B.trim().split(/\s+/);
            const aNum = this.formatDigits(parts[0]);
            const aSign = this.getZodiacFullName(parts.slice(1).join(' '));
            astroText = `. Astro Zamorano: ${aNum}, signo ${aSign}`;
          }
          this.speakAnnouncement(`¡Atención! Resultado Triple Zamorano, ${spokenTime}. Triple: ${tripA}${astroText}.`);
        } else {
          const tripA = this.formatDigits(vals.A);
          const tripB = this.formatDigits(vals.B);
          let signText = '';
          if (vals.C) {
            const parts = vals.C.trim().split(/\s+/);
            const sNum = this.formatDigits(parts[0]);
            const sSign = this.getZodiacFullName(parts.slice(1).join(' '));
            signText = `, signo: ${sNum}, ${sSign}`;
          }
          this.speakAnnouncement(`¡Atención! Resultado ${name}, ${spokenTime}. Triple A: ${tripA}. Triple B: ${tripB}${signText}.`);
        }
      } else if (first.type === 'chance_en_linea') {
        const vals = first.newVal || {};
        const parts = [];
        if (vals.A) parts.push(`A: ${vals.A}`);
        if (vals.B) parts.push(`B: ${vals.B}`);
        if (vals.C) parts.push(`Astral: ${vals.C}`);
        const detail = parts.join(' | ') || 'Resultado disponible';
        this.showToast(`¡Sorteo Chance en Línea ${first.time}: ${detail}!`, 'success');

        // Locución por voz para Chance en Línea
        const spokenTime = this.formatSpokenTime(first.time);
        const tripA = this.formatDigits(vals.A);
        const tripB = this.formatDigits(vals.B);
        let astralText = '';
        if (vals.C) {
          const cParts = vals.C.trim().split(/\s+/);
          const cNum = this.formatDigits(cParts[0]);
          const cSign = this.getZodiacFullName(cParts.slice(1).join(' '));
          astralText = `, Astral: ${cNum}, ${cSign}`;
        }
        this.speakAnnouncement(`¡Atención! Sorteo Chance en Línea, ${spokenTime}. Triple A: ${tripA}. Triple B: ${tripB}${astralText}.`);

        // Resaltar la fila en la tabla de Chance
        const row = document.querySelector(`.chance-row[data-time="${first.time}"]`);
        if (row) {
          row.classList.add('latest-drawn');
          setTimeout(() => row.classList.remove('latest-drawn'), 15000);
        }
      } else if (first.type === 'animalito') {
        const game = LOTTERIES_CONFIG.animalitos.find(g => g.id === first.gameId);
        const name = game ? game.name : first.gameId;
        const numStr = (typeof first.newVal === 'object' && first.newVal !== null) ? (first.newVal.val || '') : String(first.newVal || '');
        let animalStr = (typeof first.newVal === 'object' && first.newVal !== null) ? (first.newVal.label || '') : '';
        if (!animalStr && ANIMALITOS_DICT[numStr]) {
          animalStr = ANIMALITOS_DICT[numStr].name;
        }
        const labelDisplay = animalStr ? ` - ${animalStr}` : '';
        this.showToast(`¡Sorteo ${name} ${first.time}: ${numStr}${labelDisplay}!`, 'success');

        // Locución por voz para Animalitos y Ruletas
        const spokenTime = this.formatSpokenTime(first.time);
        const isZodiac = game?.type === 'zodiac' || first.gameId === 'el_ruco' || first.gameId === 'la_ruca';

        if (isZodiac) {
          const fullSign = this.getZodiacFullName(first.label || animalStr || '');
          const animalWord = (first.gameId === 'el_ruco' && ANIMALITOS_DICT[numStr]) ? `${ANIMALITOS_DICT[numStr].name}, ` : '';
          this.speakAnnouncement(`¡Atención! Sorteo ${name}, ${spokenTime}. Número ${numStr}, ${animalWord}signo ${fullSign}.`);
        } else if (animalStr) {
          this.speakAnnouncement(`¡Atención! Sorteo ${name}, ${spokenTime}. Número ${numStr}, ${animalStr}.`);
        } else {
          this.speakAnnouncement(`¡Atención! Sorteo ${name}, ${spokenTime}. Número ${numStr}.`);
        }

        // Resaltar la celda correspondiente
        const cell = document.querySelector(`.number-cell[data-game="${first.gameId}"][data-time="${first.time}"]`);
        if (cell) {
          cell.classList.add('latest-drawn');
          setTimeout(() => cell.classList.remove('latest-drawn'), 15000);
        }
      } else if (first.type === 'manual_import') {
        this.showToast('Resultados importados correctamente.', 'info');
      } else if (first.type === 'day_reset') {
        this.showToast('Pizarra reiniciada para nuevo día.', 'info');
      }
    }
  }

  handleStatusChange(status) {
    const badge = document.getElementById('live-status-badge');
    const text = document.getElementById('live-status-text');
    if (!badge || !text) return;

    if (status.status === 'online') {
      badge.style.backgroundColor = 'var(--green-win)';
      text.textContent = 'EN VIVO';
      text.style.color = 'var(--green-win)';
    } else if (status.status === 'syncing') {
      text.textContent = 'ACTUALIZANDO...';
      text.style.color = 'var(--gold-num)';
    } else {
      badge.style.backgroundColor = 'var(--amber-accent)';
      text.textContent = 'LOCAL';
      text.style.color = 'var(--text-muted)';
    }
  }

  // =========================================================================
  // GESTIÓN DE PANTALLA COMPLETA & MODO TV ROTACIÓN
  // =========================================================================
  toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        alert(`Error al entrar a pantalla completa: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('sound_enabled', this.soundEnabled);
    this.renderHeader();
    this.showToast(this.soundEnabled ? 'Sonido activado 🔔' : 'Sonido silenciado 🔕', 'info');
    if (this.soundEnabled) this.playChime();
  }

  toggleViewMode() {
    if (this.viewMode === 'all') {
      this.viewMode = 'tv_rotation';
      this.startTvRotation();
    } else {
      this.viewMode = 'all';
      this.stopTvRotation();
    }
    this.renderHeader();
  }

  startTvRotation() {
    const tvOverlay = document.getElementById('tv-rotation-overlay');
    if (!tvOverlay) return;
    tvOverlay.classList.add('active');
    this.tvSlideIndex = 0;
    this.showTvSlide(0);

    const stepMs = 100;
    let elapsedMs = 0;
    const pBar = document.getElementById('tv-progress-bar');

    clearInterval(this.tvProgressTimer);
    this.tvProgressTimer = setInterval(() => {
      elapsedMs += stepMs;
      const pct = Math.min(100, (elapsedMs / this.slideDurationMs) * 100);
      if (pBar) pBar.style.width = `${pct}%`;

      if (elapsedMs >= this.slideDurationMs) {
        elapsedMs = 0;
        this.tvSlideIndex = (this.tvSlideIndex + 1) % 3;
        this.showTvSlide(this.tvSlideIndex);
      }
    }, stepMs);
  }

  stopTvRotation() {
    const tvOverlay = document.getElementById('tv-rotation-overlay');
    if (tvOverlay) tvOverlay.classList.remove('active');
    clearInterval(this.tvProgressTimer);
  }

  showTvSlide(index) {
    const titleEl = document.getElementById('tv-slide-title');
    const contentEl = document.getElementById('tv-slide-content');
    if (!titleEl || !contentEl) return;

    if (index === 0) {
      // Slide 1: Triples Tradicionales Gigantes (Chance, Táchira, Caracas, Zulia, Zamorano)
      titleEl.innerHTML = `⭐ TRIPLES TRADICIONALES (CHANCE, TÁCHIRA, CARACAS, ZULIA, ZAMORANO)`;
      contentEl.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; width: 100%; height: 100%;">
          ${LOTTERIES_CONFIG.triples.map(lot => {
            const data = this.currentData.triples?.[lot.id] || {};
            const isZamorano = lot.id === 'zamorano';
            return `
              <div style="background: rgba(255,255,255,0.03); border: 2px solid ${lot.color}; border-radius: 10px; padding: 0.75rem; display: flex; flex-direction: column;">
                <h2 style="color: ${lot.color}; font-family: var(--font-condensed); font-size: 1.35rem; margin-bottom: 0.5rem; text-align: center;">${lot.name}</h2>
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-around;">
                  ${lot.draws.map(d => {
                    const res = data[d.time] || {};
                    if (isZamorano) {
                      return `
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 0.3rem 0;">
                          <span style="font-size: 1rem; color: #38bdf8; font-weight: 700;">${d.label}</span>
                          <span style="font-size: 1.55rem; font-family: var(--font-mono); color: #fff; font-weight: 800;">${res.A || '---'}</span>
                          <span style="font-size: 1.35rem; font-family: var(--font-mono); color: var(--gold-num); font-weight: 600; letter-spacing: 0.3px;">${res.B || '---'}</span>
                        </div>
                      `;
                    }
                    return `
                      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 0.3rem 0;">
                        <span style="font-size: 1rem; color: #38bdf8; font-weight: 700;">${d.label}</span>
                        <span style="font-size: 1.55rem; font-family: var(--font-mono); color: #fff; font-weight: 800;">${res.A || '---'}</span>
                        <span style="font-size: 1.55rem; font-family: var(--font-mono); color: var(--gold-num); font-weight: 600;">${res.B || '---'}</span>
                        <span style="font-size: 1.25rem; font-family: var(--font-mono); color: #34d399; font-weight: 600;">${res.C || '---'}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (index === 1) {
      // Slide 2: Animalitos Principales (Lotto Activo, La Granjita, Selva Plus, Guacharo)
      titleEl.innerHTML = `🐾 ANIMALITOS ESTRELLA (LOTTO ACTIVO, LA GRANJITA, SELVA PLUS, GUÁCHARO)`;
      const mainGames = LOTTERIES_CONFIG.animalitos.slice(0, 4);
      contentEl.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; width: 100%; height: 100%;">
          ${mainGames.map(g => {
            return `
              <div style="background: rgba(255,255,255,0.03); border: 2px solid ${g.color}; border-radius: 12px; padding: 0.8rem; display: flex; flex-direction: column;">
                <h3 style="color: ${g.color}; font-family: var(--font-condensed); font-size: 1.5rem; text-align: center; margin-bottom: 0.5rem;">${g.name}</h3>
                <div style="flex: 1; display: grid; grid-template-rows: repeat(12, 1fr); gap: 2px;">
                  ${HORARIOS_ANIMALITOS.map(h => {
                    const raw = this.currentData.animalitos?.[g.id]?.[h] || '';
                    const num = (typeof raw === 'object' && raw !== null) ? raw.val : raw;
                    let animal = (typeof raw === 'object' && raw !== null) ? raw.label : '';
                    if (!animal && num && ANIMALITOS_DICT[num]) animal = ANIMALITOS_DICT[num].name;

                    return `
                      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0 0.5rem; border-radius: 4px;">
                        <span style="color: #94a3b8; font-size: 0.9rem; font-weight: 700;">${h.replace(':00', '')}</span>
                        <span style="color: #fff; font-size: 1.55rem; font-weight: 800; font-family: var(--font-mono);">${num || '--'}</span>
                        <span style="color: var(--gold-num); font-size: 0.92rem; font-weight: 600; letter-spacing: 0.25px;">${animal}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      // Slide 3: Zamorano, Ruco, Ruca, Monje y Terminales
      titleEl.innerHTML = `🎯 RULETAS Y TERMINALES (EL RUCO, LA RUCA, MONJE, RICACHONA, DORADO)`;
      const remainingGames = LOTTERIES_CONFIG.animalitos.slice(4);
      contentEl.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(${remainingGames.length}, 1fr); gap: 0.8rem; width: 100%; height: 100%;">
          ${remainingGames.map(g => {
            return `
              <div style="background: rgba(255,255,255,0.03); border: 2px solid ${g.color}; border-radius: 10px; padding: 0.6rem; display: flex; flex-direction: column;">
                <h4 style="color: ${g.color}; font-family: var(--font-condensed); font-size: 1.2rem; text-align: center; margin-bottom: 0.4rem;">${g.short}</h4>
                <div style="flex: 1; display: grid; grid-template-rows: repeat(12, 1fr); gap: 2px;">
                  ${HORARIOS_ANIMALITOS.map(h => {
                    const raw = this.currentData.animalitos?.[g.id]?.[h] || '';
                    const num = (typeof raw === 'object' && raw !== null) ? raw.val : raw;
                    let label = (typeof raw === 'object' && raw !== null) ? raw.label : '';
                    if (!label && num && ANIMALITOS_DICT[num]) label = ANIMALITOS_DICT[num].name;

                    return `
                      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0 0.4rem; border-radius: 3px;">
                        <span style="color: #64748b; font-size: 0.75rem;">${h.replace(':00', '')}</span>
                        <span style="color: #fff; font-size: 1.38rem; font-weight: 800; font-family: var(--font-mono);">${num || '--'}</span>
                        ${label ? `<span style="color: var(--gold-num); font-size: 0.78rem; font-weight: 600; letter-spacing: 0.25px;">${label}</span>` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }

  // =========================================================================
  // RENDERIZADO DE LA BARRA SUPERIOR
  // =========================================================================
  renderHeader() {
    const headerActions = document.getElementById('header-actions');
    if (!headerActions) return;

    headerActions.innerHTML = `
      <button class="action-btn" id="btn-toggle-compact" title="Ocultar la barra superior para máxima visibilidad (Mantiene Fecha y Hora juntas)">
        👁️ Ocultar (H)
      </button>
      <button class="action-btn" id="btn-force-sync" title="Buscar resultados nuevos ahora mismo en internet">
        🔄 Sincronizar
      </button>
      <button class="action-btn ${this.viewMode === 'tv_rotation' ? 'active' : ''}" id="btn-toggle-view" title="Alternar Modo TV de alto impacto">
        📺 ${this.viewMode === 'tv_rotation' ? 'Pizarra Completa' : 'Modo TV'}
      </button>
      <button class="action-btn ${this.soundEnabled ? 'active' : ''}" id="btn-toggle-sound" title="Activar/Silenciar sonido">
        ${this.soundEnabled ? '🔔 Sonido ON' : '🔕 Silencio'}
      </button>
      <button class="action-btn ${this.voiceEnabled ? 'active' : ''}" id="btn-toggle-voice" title="Locutor por voz: canta los números y loterías en vivo">
        ${this.voiceEnabled ? '🗣️ Voz ON' : '🔇 Voz OFF'}
      </button>
      <button class="action-btn" id="btn-fullscreen" title="Pantalla Completa (F11)">
        ⛶ Pantalla Completa
      </button>
      <button class="action-btn admin-btn" id="btn-admin-modal" title="Panel de Taquilla y Discrepancias (F2)">
        ⚙️ Taquilla (F2)
      </button>
    `;

    document.getElementById('btn-toggle-compact').addEventListener('click', () => this.toggleHeaderVisibility());

    document.getElementById('btn-force-sync').addEventListener('click', async () => {
      const btn = document.getElementById('btn-force-sync');
      btn.textContent = '🔄 Buscando...';
      try {
        await Promise.allSettled([
          fetch('/api/sync-now'),
          this.syncManager.fetchRemoteData(),
          this.fetchBcvRate(true)
        ]);
        this.showToast('Resultados y Tasa BCV sincronizados.', 'success');
      } catch (e) {
        await this.syncManager.fetchRemoteData();
      } finally {
        btn.textContent = '🔄 Sincronizar';
      }
    });

    document.getElementById('btn-toggle-view').addEventListener('click', () => this.toggleViewMode());
    document.getElementById('btn-toggle-sound').addEventListener('click', () => this.toggleSound());
    document.getElementById('btn-toggle-voice').addEventListener('click', () => this.toggleVoice());
    document.getElementById('btn-fullscreen').addEventListener('click', () => this.toggleFullScreen());
    document.getElementById('btn-admin-modal').addEventListener('click', () => this.openAdminModal());
  }

  // =========================================================================
  // MODAL DE TAQUILLA & EDICIÓN RÁPIDA DE DISCREPANCIAS
  // =========================================================================
  setupAdminModal() {
    const modalOverlay = document.getElementById('admin-modal-overlay');
    const closeBtn = document.getElementById('close-modal-btn');
    const saveSettingsBtn = document.getElementById('btn-save-settings');
    const btnResetDay = document.getElementById('btn-reset-day');
    const btnExportJson = document.getElementById('btn-export-json');
    const fileImportInput = document.getElementById('file-import-json');

    closeBtn.addEventListener('click', () => this.closeAdminModal());
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) this.closeAdminModal();
    });

    // Guardar nombre de agencia
    const btnSaveAgency = document.getElementById('btn-save-agency-name');
    if (btnSaveAgency) {
      btnSaveAgency.addEventListener('click', () => {
        const val = document.getElementById('input-agency-name').value.trim();
        if (val) this.setAgencyName(val);
      });
    }

    // Cargar fecha histórica desde el panel
    const btnAdminLoadDate = document.getElementById('btn-admin-load-date');
    const btnAdminLoadToday = document.getElementById('btn-admin-load-today');
    if (btnAdminLoadDate) {
      btnAdminLoadDate.addEventListener('click', () => {
        const picked = document.getElementById('admin-date-picker').value;
        if (picked) {
          this.loadDate(picked);
          this.closeAdminModal();
        }
      });
    }
    if (btnAdminLoadToday) {
      btnAdminLoadToday.addEventListener('click', () => {
        this.loadToday();
        this.closeAdminModal();
      });
    }

    // Guardar ajustes de sincronización
    saveSettingsBtn.addEventListener('click', () => {
      const url = document.getElementById('input-sync-url').value.trim();
      const interval = document.getElementById('input-sync-interval').value.trim();
      this.syncManager.updateSyncSettings(url, interval);
      this.showToast('Configuración de sincronización guardada.', 'success');
    });

    // Botón reiniciar día
    btnResetDay.addEventListener('click', () => {
      if (confirm('¿Seguro que deseas reiniciar todos los resultados para un nuevo día? Los números actuales se limpiarán.')) {
        this.syncManager.resetForNewDay();
        this.closeAdminModal();
      }
    });

    // Botón exportar JSON
    btnExportJson.addEventListener('click', () => {
      this.syncManager.exportJSON();
    });

    // Botón importar JSON
    fileImportInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = this.syncManager.importJSON(event.target.result);
        if (res.success) {
          this.closeAdminModal();
        } else {
          alert('Error al importar: ' + res.error);
        }
      };
      reader.readAsText(file);
    });

    // Formulario de edición manual en Taquilla
    const formUpdate = document.getElementById('form-manual-update');
    formUpdate.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormManualUpdate();
    });

    // Poblar selector de juegos en el modal
    const selectGame = document.getElementById('manual-game-select');
    selectGame.innerHTML = `
      <optgroup label="Triples Tradicionales">
        ${LOTTERIES_CONFIG.triples.map(t => `<option value="triple:${t.id}">${t.name}</option>`).join('')}
      </optgroup>
      <optgroup label="Animalitos y Ruletas">
        ${LOTTERIES_CONFIG.animalitos.map(a => `<option value="animalito:${a.id}">${a.name}</option>`).join('')}
      </optgroup>
    `;

    // Botones de Locutor por voz en el modal de configuración
    const btnAdminVoice = document.getElementById('btn-admin-toggle-voice');
    if (btnAdminVoice) {
      btnAdminVoice.addEventListener('click', () => {
        this.toggleVoice();
      });
    }

    const btnAdminTestVoice = document.getElementById('btn-admin-test-voice');
    if (btnAdminTestVoice) {
      btnAdminTestVoice.addEventListener('click', () => {
        this.speakAnnouncement('¡Atención! Probando sistema de locución para la agencia Gerónimo El Rey. Triple Chance, 7 de la noche: 5 3 6, signo Escorpio.');
      });
    }

    selectGame.addEventListener('change', () => this.updateManualTimeOptions());
    this.updateManualTimeOptions();
  }

  updateManualTimeOptions() {
    const selectGame = document.getElementById('manual-game-select').value;
    const selectTime = document.getElementById('manual-time-select');
    const fieldTripleGroup = document.getElementById('manual-triple-field-group');

    const [type, id] = selectGame.split(':');

    if (type === 'triple') {
      const lot = LOTTERIES_CONFIG.triples.find(t => t.id === id);
      selectTime.innerHTML = lot.draws.map(d => `<option value="${d.time}">${d.label}</option>`).join('');
      fieldTripleGroup.style.display = 'flex';
      
      const fieldSelect = document.getElementById('manual-triple-field');
      if (id === 'zamorano') {
        fieldSelect.innerHTML = `<option value="A">Triple</option><option value="B">Astro / Signo</option>`;
      } else {
        fieldSelect.innerHTML = `<option value="A">Sorteo A</option><option value="B">Sorteo B</option><option value="C">C (Signo)</option>`;
      }
    } else {
      selectTime.innerHTML = HORARIOS_ANIMALITOS.map(h => `<option value="${h}">${h}</option>`).join('');
      fieldTripleGroup.style.display = 'none';
    }
  }

  async saveResultToBackend(payload) {
    try {
      await fetch('/api/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          date: this.viewingDate || this.currentData?.date || null
        })
      });
    } catch (e) {
      console.warn('No se pudo persistir en el servidor:', e);
    }
  }

  handleFormManualUpdate() {
    const selectGame = document.getElementById('manual-game-select').value;
    const time = document.getElementById('manual-time-select').value;
    const value = document.getElementById('manual-value-input').value.trim();

    const [type, id] = selectGame.split(':');

    if (type === 'triple') {
      const field = document.getElementById('manual-triple-field').value;
      if (!this.currentData.triples) this.currentData.triples = {};
      if (!this.currentData.triples[id]) this.currentData.triples[id] = {};
      if (!this.currentData.triples[id][time]) this.currentData.triples[id][time] = { A: '', B: '', C: '' };
      
      this.currentData.triples[id][time][field] = value;

      if (!this.currentData.manualOverrides) this.currentData.manualOverrides = {};
      const overrideKey = `triple:${id}:${time}:${field}`;
      if (value) {
        this.currentData.manualOverrides[overrideKey] = true;
      } else {
        delete this.currentData.manualOverrides[overrideKey];
      }

      this.syncManager.saveLocalData(this.currentData);
      this.syncManager.onDataUpdated(this.currentData, [{
        type: 'triple',
        lotteryId: id,
        time,
        newVal: this.currentData.triples[id][time]
      }]);

      this.saveResultToBackend({
        type: 'triple',
        lotteryId: id,
        time,
        field,
        value
      });
    } else {
      if (!this.currentData.animalitos) this.currentData.animalitos = {};
      if (!this.currentData.animalitos[id]) this.currentData.animalitos[id] = {};
      
      const game = LOTTERIES_CONFIG.animalitos.find(g => g.id === id);
      let finalVal = '';
      let finalLabel = '';

      if (value === '' || value === '--') {
        finalVal = '';
        finalLabel = '';
      } else {
        const match = value.match(/^([0-9]{1,4}|00)\s*(?:[-–:]\s*|\s+)(.+)$/i);
        if (match) {
          finalVal = match[1];
          finalLabel = match[2].trim().toUpperCase();
        } else {
          finalVal = value;
          if (game && game.type === 'animal' && ANIMALITOS_DICT[finalVal]) {
            finalLabel = ANIMALITOS_DICT[finalVal].name;
          }
        }
      }

      const cellValue = finalLabel 
        ? { val: finalVal, label: finalLabel } 
        : (game && game.type === 'number' ? finalVal : (finalVal ? { val: finalVal, label: '' } : ''));

      this.currentData.animalitos[id][time] = cellValue;

      if (!this.currentData.manualOverrides) this.currentData.manualOverrides = {};
      const overrideKey = `animalito:${id}:${time}`;
      if (finalVal) {
        this.currentData.manualOverrides[overrideKey] = true;
      } else {
        delete this.currentData.manualOverrides[overrideKey];
      }

      this.syncManager.saveLocalData(this.currentData);
      this.syncManager.onDataUpdated(this.currentData, [{
        type: 'animalito',
        gameId: id,
        time,
        newVal: cellValue
      }]);

      this.saveResultToBackend({
        type: 'animalito',
        gameId: id,
        time,
        value: cellValue
      });
    }

    document.getElementById('manual-value-input').value = '';
    this.closeAdminModal();
  }

  openAdminModal() {
    const modal = document.getElementById('admin-modal-overlay');
    document.getElementById('input-sync-url').value = this.syncManager.remoteUrl;
    document.getElementById('input-sync-interval').value = this.syncManager.pollIntervalSec;
    this.updateAdminVoiceUI();
    modal.classList.add('open');
  }

  closeAdminModal() {
    const modal = document.getElementById('admin-modal-overlay');
    modal.classList.remove('open');
  }

  // Clic directo en una casilla de triple para corregir inmediatamente
  openQuickEditTriple(lotteryId, time, field) {
    const raw = this.currentData.triples?.[lotteryId]?.[time]?.[field] || '';
    const currentVal = (typeof raw === 'object' && raw !== null) ? (raw.val || raw.num || '') : String(raw || '');
    const lot = LOTTERIES_CONFIG.triples.find(t => t.id === lotteryId);
    const lotName = lot ? lot.name : lotteryId;
    const fieldName = (lotteryId === 'zamorano') 
      ? (field === 'A' ? 'Triple' : 'Astro / Signo') 
      : (field === 'C' ? 'C (Signo)' : `Sorteo ${field}`);

    const defaultInput = currentVal === '--' ? '' : currentVal;
    const newVal = prompt(`Editar ${lotName} (${time}) - ${fieldName}:`, defaultInput);
    if (newVal !== null) {
      const trimmed = newVal.trim();
      if (!this.currentData.triples) this.currentData.triples = {};
      if (!this.currentData.triples[lotteryId]) this.currentData.triples[lotteryId] = {};
      if (!this.currentData.triples[lotteryId][time]) this.currentData.triples[lotteryId][time] = { A: '', B: '', C: '' };
      
      this.currentData.triples[lotteryId][time][field] = trimmed;

      if (!this.currentData.manualOverrides) this.currentData.manualOverrides = {};
      const overrideKey = `triple:${lotteryId}:${time}:${field}`;
      if (trimmed) {
        this.currentData.manualOverrides[overrideKey] = true;
      } else {
        delete this.currentData.manualOverrides[overrideKey];
      }

      this.syncManager.saveLocalData(this.currentData);
      this.syncManager.onDataUpdated(this.currentData, [{
        type: 'triple',
        lotteryId,
        time,
        newVal: this.currentData.triples[lotteryId][time]
      }]);

      this.saveResultToBackend({
        type: 'triple',
        lotteryId,
        time,
        field,
        value: trimmed
      });
    }
  }

  // Clic directo en una casilla de animalito para corregir inmediatamente
  openQuickEditAnimalito(gameId, time) {
    const raw = this.currentData.animalitos?.[gameId]?.[time] || '';
    let currentVal = '';
    let currentLabel = '';

    if (typeof raw === 'object' && raw !== null) {
      currentVal = raw.val !== undefined ? String(raw.val) : '';
      currentLabel = raw.label !== undefined ? String(raw.label) : '';
    } else {
      currentVal = String(raw || '').trim();
    }

    if (currentVal === '--') currentVal = '';

    const game = LOTTERIES_CONFIG.animalitos.find(g => g.id === gameId);
    const gameName = game ? game.name : gameId;

    // Si tiene etiqueta previa, mostrar número y etiqueta juntos por defecto para facilitar edición
    const defaultInput = currentLabel ? `${currentVal} ${currentLabel}`.trim() : currentVal;

    const newVal = prompt(`Editar ${gameName} (${time}):\nIngrese número (ej: 28) o número y animal/signo (ej: 28 ZAMURO o 24 SAGITARIO):`, defaultInput);
    if (newVal !== null) {
      const trimmed = newVal.trim();
      let finalVal = '';
      let finalLabel = '';

      if (trimmed === '' || trimmed === '--') {
        finalVal = '';
        finalLabel = '';
      } else {
        // Separar número y nombre si el usuario escribió "28 ZAMURO" o "24 SAGITARIO" o "69 CONEJO"
        const match = trimmed.match(/^([0-9]{1,4}|00)\s*(?:[-–:]\s*|\s+)(.+)$/i);
        if (match) {
          finalVal = match[1];
          finalLabel = match[2].trim().toUpperCase();
        } else {
          finalVal = trimmed;
          finalLabel = '';

          // Auto-asignar animal si está en el diccionario oficial
          if (game && game.type === 'animal' && ANIMALITOS_DICT[finalVal]) {
            finalLabel = ANIMALITOS_DICT[finalVal].name;
          } else if (currentLabel && currentVal === finalVal) {
            finalLabel = currentLabel;
          }
        }
      }

      if (!this.currentData.animalitos) this.currentData.animalitos = {};
      if (!this.currentData.animalitos[gameId]) this.currentData.animalitos[gameId] = {};

      const cellValue = finalLabel 
        ? { val: finalVal, label: finalLabel } 
        : (game && game.type === 'number' ? finalVal : (finalVal ? { val: finalVal, label: '' } : ''));

      this.currentData.animalitos[gameId][time] = cellValue;

      // Registrar como modificación manual para que el scraper no la sobreescriba
      if (!this.currentData.manualOverrides) this.currentData.manualOverrides = {};
      const overrideKey = `animalito:${gameId}:${time}`;
      if (finalVal) {
        this.currentData.manualOverrides[overrideKey] = true;
      } else {
        delete this.currentData.manualOverrides[overrideKey];
      }

      this.syncManager.saveLocalData(this.currentData);
      this.syncManager.onDataUpdated(this.currentData, [{
        type: 'animalito',
        gameId,
        time,
        newVal: cellValue
      }]);

      this.saveResultToBackend({
        type: 'animalito',
        gameId,
        time,
        value: cellValue
      });
    }
  }

  // =========================================================================
  // GESTIÓN DEL NOMBRE DE LA AGENCIA
  // =========================================================================
  setupAgencyName() {
    const brandClickable = document.getElementById('brand-title-clickable');
    const agencyNameText = document.getElementById('agency-name-text');
    const compactAgency = document.getElementById('compact-agency-name');
    const inputAgency = document.getElementById('input-agency-name');

    if (agencyNameText) agencyNameText.textContent = this.agencyName;
    if (compactAgency) compactAgency.textContent = this.agencyName;
    if (inputAgency) inputAgency.value = this.agencyName;
    document.title = `${this.agencyName} | Cartelera Digital de Loterías`;

    if (brandClickable) {
      brandClickable.addEventListener('click', () => this.promptChangeAgencyName());
    }
  }

  promptChangeAgencyName() {
    const newName = prompt('Ingrese el nuevo nombre para su agencia o local:', this.agencyName);
    if (newName !== null && newName.trim()) {
      this.setAgencyName(newName.trim());
    }
  }

  async setAgencyName(newName) {
    if (!newName) return;
    this.agencyName = newName;
    localStorage.setItem('agency_name', newName);

    const agencyNameText = document.getElementById('agency-name-text');
    const compactAgency = document.getElementById('compact-agency-name');
    const inputAgency = document.getElementById('input-agency-name');

    if (agencyNameText) agencyNameText.textContent = newName;
    if (compactAgency) compactAgency.textContent = newName;
    if (inputAgency) inputAgency.value = newName;
    document.title = `${newName} | Cartelera Digital de Loterías`;

    try {
      await fetch('/api/save-agency-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agency: newName })
      });
    } catch (e) {
      console.warn('No se pudo guardar en servidor, persistido en navegador:', e);
    }

    this.showToast(`Nombre de agencia actualizado: "${newName}"`, 'success');
  }

  // =========================================================================
  // BARRA COMPACTA MINIMALISTA (FECHA Y HORA JUNTAS)
  // =========================================================================
  setupCompactHeader() {
    const btnRestore = document.getElementById('btn-restore-header');
    if (btnRestore) {
      btnRestore.addEventListener('click', () => this.toggleHeaderVisibility());
    }
    this.applyHeaderVisibility();
  }

  toggleHeaderVisibility() {
    this.isHeaderHidden = !this.isHeaderHidden;
    localStorage.setItem('header_hidden', this.isHeaderHidden);
    this.applyHeaderVisibility();
    if (this.isHeaderHidden) {
      this.showToast('Barra oculta. Presione "Mostrar Barra" o tecla [H] para restaurar.', 'info');
    }
  }

  applyHeaderVisibility() {
    const appEl = document.querySelector('.billboard-app');
    const mainHeader = document.getElementById('main-billboard-header');
    const compactBar = document.getElementById('compact-header-bar');

    if (!appEl || !mainHeader || !compactBar) return;

    if (this.isHeaderHidden) {
      appEl.classList.add('header-hidden');
      mainHeader.style.display = 'none';
      compactBar.style.display = 'flex';
    } else {
      appEl.classList.remove('header-hidden');
      mainHeader.style.display = 'grid';
      compactBar.style.display = 'none';
    }
  }

  // =========================================================================
  // NAVEGACIÓN Y CONSULTA DE RESULTADOS HISTÓRICOS
  // =========================================================================
  getTodayStr() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  navigatePrevDay() {
    const refStr = this.viewingDate || this.getTodayStr();
    const parts = refStr.split('-');
    const curr = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    curr.setDate(curr.getDate() - 1);
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    this.loadDate(`${y}-${m}-${d}`);
  }

  navigateNextDay() {
    const refStr = this.viewingDate || this.getTodayStr();
    const parts = refStr.split('-');
    const curr = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    curr.setDate(curr.getDate() + 1);
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    const nextStr = `${y}-${m}-${d}`;
    if (nextStr >= this.getTodayStr()) {
      this.loadToday();
    } else {
      this.loadDate(nextStr);
    }
  }

  setupDateNavigation() {
    const btnPrev = document.getElementById('btn-prev-day');
    const btnNext = document.getElementById('btn-next-day');
    const dateDisplay = document.getElementById('clock-date');
    const datePicker = document.getElementById('history-date-picker');
    const btnReturnToday = document.getElementById('btn-return-today');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => this.navigatePrevDay());
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => this.navigateNextDay());
    }

    const pickerBtn = document.getElementById('date-picker-btn');
    const triggerPicker = (e) => {
      try {
        if (datePicker && datePicker.showPicker) {
          datePicker.showPicker();
        } else if (datePicker) {
          datePicker.focus();
          datePicker.click();
        }
      } catch (err) {
        if (datePicker) {
          datePicker.focus();
          datePicker.click();
        }
      }
    };

    if (pickerBtn) {
      pickerBtn.addEventListener('click', triggerPicker);
    }
    if (dateDisplay) {
      dateDisplay.addEventListener('click', triggerPicker);
    }

    if (datePicker) {
      datePicker.addEventListener('change', (e) => {
        const picked = e.target.value;
        if (!picked) return;
        if (picked >= this.getTodayStr()) {
          this.loadToday();
        } else {
          this.loadDate(picked);
        }
      });
    }

    if (btnReturnToday) {
      btnReturnToday.addEventListener('click', () => this.loadToday());
    }
  }

  async loadDate(dateStr) {
    if (dateStr === this.getTodayStr()) {
      return this.loadToday();
    }

    this.viewingDate = dateStr;
    this.syncManager.stopPolling();

    // Actualizar badges e indicadores
    const liveIndicator = document.getElementById('live-indicator-badge');
    const liveText = document.getElementById('live-status-text');
    if (liveIndicator) liveIndicator.className = 'live-indicator historical';
    if (liveText) liveText.textContent = 'HISTÓRICO';

    const compactBadge = document.getElementById('compact-live-badge');
    if (compactBadge) {
      compactBadge.textContent = `📜 ${dateStr}`;
      compactBadge.style.background = 'rgba(234, 179, 8, 0.15)';
      compactBadge.style.borderColor = 'rgba(234, 179, 8, 0.4)';
      compactBadge.style.color = '#eab308';
    }

    const btnReturnToday = document.getElementById('btn-return-today');
    if (btnReturnToday) btnReturnToday.style.display = 'inline-block';

    const datePicker = document.getElementById('history-date-picker');
    if (datePicker) datePicker.value = dateStr;

    const dateDisplay = document.getElementById('clock-date');
    if (dateDisplay) {
      const dParts = dateStr.split('-');
      const dObj = new Date(parseInt(dParts[0]), parseInt(dParts[1]) - 1, parseInt(dParts[2]));
      dateDisplay.textContent = dObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }

    this.showToast(`Consultando resultados del ${dateStr}...`, 'info');

    try {
      const res = await fetch(`/api/history?date=${dateStr}`);
      if (!res.ok) {
        throw new Error(`No hay resultados archivados para la fecha ${dateStr}`);
      }
      const data = await res.json();
      this.currentData = data;
      this.renderTriples();
      this.renderAnimalitos();
      this.renderChanceEnLinea();
      this.showToast(`Cargados resultados del ${dateStr}`, 'success');
    } catch (err) {
      this.showToast(err.message || 'Error cargando fecha histórica', 'error');
    }
  }

  async loadToday() {
    this.viewingDate = null;
    
    // Restaurar badge En Vivo
    const liveIndicator = document.getElementById('live-indicator-badge');
    const liveText = document.getElementById('live-status-text');
    if (liveIndicator) liveIndicator.className = 'live-indicator';
    if (liveText) liveText.textContent = 'EN VIVO';

    const compactBadge = document.getElementById('compact-live-badge');
    if (compactBadge) {
      compactBadge.textContent = '🟢 EN VIVO';
      compactBadge.style.background = 'rgba(34, 197, 94, 0.15)';
      compactBadge.style.borderColor = 'rgba(34, 197, 94, 0.4)';
      compactBadge.style.color = '#22c55e';
    }

    const btnReturnToday = document.getElementById('btn-return-today');
    if (btnReturnToday) btnReturnToday.style.display = 'none';

    const datePicker = document.getElementById('history-date-picker');
    if (datePicker) datePicker.value = '';

    // Reanudar sondeo en tiempo real
    this.syncManager.startPolling();
    this.showToast('Reconectando resultados EN VIVO de hoy...', 'info');

    try {
      await this.syncManager.fetchRemoteData();
      this.currentData = this.syncManager.loadCurrentData();
      this.renderTriples();
      this.renderAnimalitos();
      this.renderChanceEnLinea();
    } catch (e) {
      console.warn('Error al cargar datos de hoy:', e);
    }
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // F2: Abrir modal de administración
      if (e.key === 'F2') {
        e.preventDefault();
        this.openAdminModal();
      }
      // Escape: Cerrar modal
      if (e.key === 'Escape') {
        this.closeAdminModal();
      }
      // Tecla H: Alternar visibilidad de la barra superior
      if (e.key === 'h' || e.key === 'H') {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag !== 'input' && activeTag !== 'textarea' && activeTag !== 'select') {
          this.toggleHeaderVisibility();
        }
      }
      // Tecla C: Alternar entre Triples Clásicos y Chance en Línea
      if (e.key === 'c' || e.key === 'C') {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag !== 'input' && activeTag !== 'textarea' && activeTag !== 'select') {
          this.switchTriplesView(this.activeTriplesView === 'clasicos' ? 'chance' : 'clasicos');
        }
      }
      // Flechas Arriba / Abajo: Alternar pestaña entre Triples Clásicos y Chance Completo
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        const modal = document.getElementById('admin-modal-overlay') || document.getElementById('admin-modal');
        const isModalOpen = modal && modal.classList.contains('active');
        if (!isModalOpen && activeTag !== 'input' && activeTag !== 'textarea' && activeTag !== 'select') {
          e.preventDefault();

          let targetView;
          if (e.key === 'ArrowUp') {
            // Flecha Arriba: ir a Triples Clásicos (o alternar si ya está en Clásicos)
            targetView = (this.activeTriplesView === 'clasicos') ? 'chance' : 'clasicos';
          } else {
            // Flecha Abajo: ir a Chance Completo (o alternar si ya está en Chance)
            targetView = (this.activeTriplesView === 'chance') ? 'clasicos' : 'chance';
          }

          this.switchTriplesView(targetView);
          this.restartAutoRotateTimer();

          const label = targetView === 'chance' ? '⚡ Chance Completo (9 AM - 7 PM)' : '⭐ Triples Clásicos';
          const icon = e.key === 'ArrowUp' ? '↑' : '↓';
          this.showToast(`${label} [Tecla ${icon}]`, 'info');
        }
      }
      // Flechas Izquierda / Derecha: Navegar histórico de resultados
      if (e.key === 'ArrowLeft') {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        const modal = document.getElementById('admin-modal-overlay') || document.getElementById('admin-modal');
        const isModalOpen = modal && modal.classList.contains('active');
        if (!isModalOpen && activeTag !== 'input' && activeTag !== 'textarea' && activeTag !== 'select') {
          e.preventDefault();
          this.navigatePrevDay();
        }
      }
      if (e.key === 'ArrowRight') {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        const modal = document.getElementById('admin-modal-overlay') || document.getElementById('admin-modal');
        const isModalOpen = modal && modal.classList.contains('active');
        if (!isModalOpen && activeTag !== 'input' && activeTag !== 'textarea' && activeTag !== 'select') {
          e.preventDefault();
          this.navigateNextDay();
        }
      }
    });
  }

  // Notificación Toast
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast-notice');
    if (!toast) return;

    toast.className = `toast-notice ${type} show`;
    toast.textContent = message;

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  window.lotteryApp = new LotteryBillboardApp();
});
