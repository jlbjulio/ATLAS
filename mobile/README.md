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

Las fotos no se envian a ningun servicio y la app muestra una advertencia para retirar pacientes, gafetes, expedientes o personas antes de confirmar.

## Limitaciones actuales

- Vision QVAC y delegacion P2P hacia la laptop quedan como siguiente incremento.
- La sincronizacion del outbox aun no tiene transporte movil; las observaciones quedan guardadas localmente.
- El modelo de extraccion nunca marca datos como `Confirmado`; esa decision sigue siendo humana.
