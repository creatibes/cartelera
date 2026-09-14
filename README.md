# 🎲 Cartelera Digital de Resultados de Lotería y Animalitos

Sistema digital de alta visibilidad para agencias de lotería en Venezuela. Diseñado para reemplazar los papelitos escritos a mano con una pantalla moderna, de **alto contraste para adultos mayores**, **cero scroll** (todo encaja en la pantalla) y **cero costo de mantenimiento**.

---

## ✨ Características Principales

1. **Diseño Zero-Scroll de Alto Contraste**:
   - Todo visible en una sola pantalla: **Triples Tradicionales** a la izquierda y matriz de **Animalitos y Ruletas** (8:00 AM a 7:00 PM) a la derecha.
   - Números dorados y blancos de trazo grueso, legibles a varios metros de distancia en televisores y monitores.
   - Diccionario integrado de animalitos (muestra el icono y el nombre: `02 TORO`, `03 CIEMPIÉS`, etc.).
2. **Modo TV Rotación Automática**:
   - Botón `📺 Modo TV Rotación`: para pantallas en pared, alterna cada 15 segundos entre Triples Tradicionales, Animalitos Principales y Ruletas/Terminales con números gigantes.
3. **Control Total de Discrepancias (Modo Taquilla - Tecla `F2`)**:
   - Clic directo sobre cualquier casilla de número para corregirlo en 2 segundos.
   - Panel de Taquilla completo con selector rápido de juego, horario y resultado.
   - Almacenamiento local persistente (`localStorage`): no se borra si se va la luz o falla el internet.
4. **Sincronización Remota (GitHub / Repo)**:
   - Permite conectar un enlace público `resultados.json` de GitHub.
   - La pantalla consulta el archivo cada 30 segundos y se actualiza sola en vivo sin parpadeos ni recargas.
5. **Micro-Scraper Automático Incluido (`scraper.js`)**:
   - Script ligero en Node.js que consulta las fuentes de TuAzar y LotoVen cada 60 segundos y alimenta el archivo `data/resultados.json`.

---

## 🚀 Inicio Rápido (En la Computadora de la Agencia)

### 1 Solo Doble Clic (Todo Integrado)
1. Haz doble clic en **[`INICIAR_CARTELERA.bat`](file:///c:/Users/Vero/geronimoelrey/INICIAR_CARTELERA.bat)**.
2. Automáticamente:
   - Se abrirá la **Cartelera** en tu navegador (`http://localhost:3000`).
   - El **robot buscador (scraper)** empezará a trabajar en segundo plano consultando los resultados cada 60 segundos por internet.
3. Presiona **F11** en tu teclado para ponerla en **Pantalla Completa** en tu monitor o televisor.

---

## 🛠️ ¿Y si quieres cambiar un número a mano? (Modo Taquilla)
- Solo haz **clic directo sobre la casilla** del número que quieras cambiar.
- O presiona la tecla **F2** para abrir el panel de taquilla completo.


---

## 🌐 Cómo Publicarlo 100% Gratis en GitHub Pages (Para Smart TV o ver desde el Teléfono)

1. Sube los archivos de esta carpeta a un nuevo repositorio público en GitHub (ej. `cartelera-loteria`).
2. En GitHub ve a **Settings** > **Pages** > En *Branch* selecciona `main` y guarda.
3. En 1 minuto tendrás una dirección web gratuita (ej: `https://tuusuario.github.io/cartelera-loteria/`).
4. Abre esa dirección en el navegador del Smart TV de la agencia ¡y listo!

---

## ⌨️ Atajos de Teclado
- **`F2`**: Abre el Panel de Taquilla / Corrección de Discrepancias.
- **`Escape`**: Cierra el panel administrativo.
- **`F11`**: Activa o desactiva la pantalla completa del navegador.
- **Clic sobre cualquier número**: Abre la ventana de edición inmediata para ese número.
