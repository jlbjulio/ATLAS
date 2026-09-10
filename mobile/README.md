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
