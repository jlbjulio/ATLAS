# ATLAS Field

Aplicacion Expo para captura de observaciones en campo con inferencia QVAC local.

## Requisitos

- Android fisico con depuracion USB habilitada.
- Node.js >= 20 y npm >= 10.9.
- Android SDK/NDK configurados para Expo.
- No usar emulador: QVAC llamacpp requiere hardware fisico.

## Desarrollo

```bash
npm install
npx expo prebuild --clean --platform android
npm run android
```

El primer arranque descarga y carga Qwen3 600M y Whisper Tiny en el dispositivo. La inferencia posterior ocurre localmente. El bundle generado por QVAC se regenera durante `prebuild` y no se versiona.

## Release e instalacion por APK

Desde una copia actualizada del repositorio:

```bash
cd mobile
npm install
npx expo prebuild --clean --platform android
cd android
./gradlew assembleRelease --no-daemon
```

El APK queda en `mobile/android/app/build/outputs/apk/release/app-release.apk`.
Instalalo en un dispositivo conectado y autorizado por ADB:

```bash
adb devices
adb install -r app/build/outputs/apk/release/app-release.apk
adb shell am force-stop com.atlas.field
adb shell am start -n com.atlas.field/.MainActivity
```

Si hay varios dispositivos conectados, agrega `-s <serial>` a cada comando, por ejemplo:

```bash
adb -s R5CX50502HH install -r app/build/outputs/apk/release/app-release.apk
```

`mobile/android/` es un proyecto generado por Expo y no se versiona. Siempre ejecuta `prebuild` después de clonar o actualizar dependencias antes de compilar. QVAC requiere hardware físico; no uses un emulador.

## Diagnostico en tiempo real

Limpia el buffer y observa los logs mientras reproduces un flujo en el teléfono:

```bash
adb -s R5CX50502HH logcat -c
adb -s R5CX50502HH logcat -v time
```

Para consultar únicamente los crashes registrados:

```bash
adb -s R5CX50502HH logcat -b crash -v threadtime
```

Confirma si la aplicación sigue activa con:

```bash
adb -s R5CX50502HH shell pidof com.atlas.field
```

Si el comando no devuelve un PID, la aplicación se cerró. Para investigar, conserva las líneas de `FATAL EXCEPTION`, `AndroidRuntime`, `SIGABRT`, `SIGSEGV`, `ReactNativeJS` o `qvac`.

## Flujo implementado

1. Captura cliente, ciudad y observacion escrita.
2. Dictado con Whisper Tiny local.
3. Evidencia fotografica de equipos o placas autorizadas.
4. Extraccion estructurada con Qwen3 600M local.
5. Revision y edicion humana de cada equipo.
6. Persistencia SQLite offline con estado local.
7. Delegación P2P opcional de texto y audio a una laptop QVAC emparejada en la misma Wi-Fi, con fallback local automático.

Las fotos no se envian a ningun servicio y la app muestra una advertencia para retirar pacientes, gafetes, expedientes o personas antes de confirmar.

## Limitaciones actuales

- Vision QVAC en móvil queda como siguiente incremento. La delegación P2P actual ejecuta una tarea completa en la laptop; no divide un mismo modelo entre dispositivos.
- La sincronizacion del outbox aun no tiene transporte movil; las observaciones quedan guardadas localmente.
- El modelo de extraccion nunca marca datos como `Confirmado`; esa decision sigue siendo humana.

## Potencia compartida de demo

El proveedor es la API FastAPI de la laptop. En una red Wi-Fi privada, iníciala con un código efímero:

```bash
export ATLAS_P2P_PAIRING_CODE='un-codigo-unico-de-demo'
.venv/bin/python -m uvicorn web.server.main:app --host 0.0.0.0 --port 8000
```

Abre el dashboard de ATLAS en la laptop usando su **IP local** (no `localhost`) y pulsa **Compartir** en la tarjeta *Potencia compartida*. Se muestra un código QR. En el móvil pulsa **Conectar** y escanea el QR; no hace falta escribir IPs ni códigos. ATLAS envía sólo texto o el audio de la captura directamente a esa laptop y conserva QVAC local como fallback.

El enlace QR es de un solo uso y expira en 5 minutos. El token de sesión no se persiste en el móvil, vive sólo en memoria en la laptop y expira en 60 minutos. `usesCleartextTraffic` está habilitado sólo para la LAN de demo. No uses HTTP P2P en una red no confiable o para datos reales; un despliegue requiere HTTPS e identidad de dispositivo.
