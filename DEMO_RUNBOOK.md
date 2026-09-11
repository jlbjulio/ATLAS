# ATLAS Demo Runbook

Este runbook prepara una demostración local y reproducible. No requiere nube ni emuladores.

## Antes de empezar

1. Verifica Node.js 22.17+ y Python 3.11+.
2. Instala las dependencias de raíz, web y celular:

```bash
npm ci
npm ci --prefix web
npm ci --prefix mobile
python3 -m venv .venv
.venv/bin/python -m pip install -e . pytest==8.3.2 ruff==0.12.11 httpx==0.28.1
```

En Windows usa `.venv\Scripts\python` en lugar de `.venv/bin/python`.

3. Descarga los modelos si aún no están presentes:

```bash
npm run models:download
```

4. Comprueba las capacidades locales:

```bash
npm run qvac:health
```

La salida debe indicar `local_only: true`. `extraction_mode: "base"` es válido para la demo; indica que Qwen3 local se ejecuta sin un adaptador LoRA opcional. No iniciar la demo si falta alguno de los pesos base.

## Validación previa

```bash
npm run check
python3 -m atlas.main init
python3 -m atlas.main seed
```

El comando de seed deja una base local con 20 activos y 13 clientes sintéticos. No borres `data/local/` después de esta preparación.

## Ejecutar la demostración web

Terminal 1:

```bash
.venv/bin/python -m uvicorn web.server.main:app --host 127.0.0.1 --port 8000
```

Terminal 2:

```bash
npm --prefix web run dev
```

Abre `http://localhost:5173` y confirma `GET /api/health` desde la interfaz antes de capturar.

## Guion de 4 minutos

1. **Dashboard:** muestra los 13 clientes, 20 activos y oportunidades de revisión. Explica que son datos sintéticos locales.
2. **Smart Capture:** escribe una nota o dicta una observación. ATLAS ejecuta Whisper/Qwen localmente y propone campos candidatos.
3. **Foto autorizada:** carga una placa real de equipo, marca la autorización y ejecuta VisionPsy local. Valida esta foto antes de la presentación; una imagen ajena a un equipo no es un caso de demostración válido. La foto queda como evidencia local y cualquier `privacy_flag` bloquea la confirmación.
4. **Revisión humana:** corrige un campo, conserva los desconocidos y confirma el registro.
5. **Resultado:** abre Base Instalada para mostrar el nuevo activo, su evidencia, estados y oportunidad de revisión.

No presentes como implementado: descubrimiento automático entre redes ni cómputo repartido de una misma inferencia. El P2P actual delega una tarea completa de texto o audio a una laptop emparejada en la misma red. La sincronización de registros y la visión local en el celular sí están implementadas y pueden mostrarse.

## Aplicación para celular

El celular demuestra captura de texto y voz con QVAC en el dispositivo, visión local de placas, sincronización de la cola hacia la laptop y delegación P2P a una laptop de la misma red. Para generar un APK sigue [`mobile/README.md`](mobile/README.md). Antes de la demo descarga los modelos en el teléfono, ya que el respaldo local requiere que estén disponibles.

### Potencia compartida (laptop + celular)

1. Conecta laptop y Android a una Wi-Fi privada de la demo.
2. Abre el panel de ATLAS en la laptop usando su **IP local**, no `localhost`. Arranca el backend expuesto a la LAN:

```bash
export ATLAS_P2P_PAIRING_CODE='un-codigo-unico-de-demo'
.venv/bin/python -m uvicorn web.server.main:app --host 0.0.0.0 --port 8000
```

3. En el panel presiona **Compartir** dentro de la tarjeta *Potencia compartida*. Se muestra un código QR.
4. En ATLAS Field presiona **Conectar** y escanea el QR. Los dispositivos se enlazan sin IPs ni códigos visibles.
5. Dicta o extrae texto. ATLAS usa la laptop automáticamente; si no responde, vuelve al celular sin interrumpir el flujo.
6. Desde **Base local**, presiona **Sincronizar pendientes con laptop** para enviar las observaciones guardadas.

El enlace es de un solo uso y expira en 5 minutos. El token de sesión no se guarda en el celular, vive sólo en memoria en la laptop y expira en 60 minutos. HTTP sin TLS es únicamente para una red privada y controlada de demo; para cualquier despliegue real usa HTTPS e identidad de dispositivo.

## Recuperación rápida

Si la UI no inicia, confirma que el backend responde:

```bash
curl http://127.0.0.1:8000/api/health
```

Si una inferencia falla, no continúes la demo: revisa `npm run qvac:health`, los logs del backend y que todos los archivos base de `models/` estén presentes. Las métricas locales quedan en `data/local/performance.jsonl`.
