# ATLAS Demo Runbook

Este runbook prepara una demostración local y reproducible. No requiere nube ni emuladores.

## Antes de empezar

1. Verifica Node.js 22.17+ y Python 3.11+.
2. Instala las dependencias de raíz, web y móvil:

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

No presentes como implementado: delegación P2P, sincronización entre teléfono y laptop, ni análisis visual móvil. Son siguientes incrementos; el flujo web sí procesa fotografía local con VisionPsy.

## Aplicación móvil

El móvil demuestra captura de texto y voz con QVAC en el dispositivo. Para generar un APK sigue [`mobile/README.md`](mobile/README.md). Antes de la demo descarga los modelos en el teléfono, ya que la primera carga requiere conectividad.

## Recuperación rápida

Si la UI no inicia, confirma que el backend responde:

```bash
curl http://127.0.0.1:8000/api/health
```

Si una inferencia falla, no continúes la demo: revisa `npm run qvac:health`, los logs del backend y que todos los archivos base de `models/` estén presentes. Las métricas locales quedan en `data/local/performance.jsonl`.
