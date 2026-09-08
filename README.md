# ATLAS | Installed Base Intelligence

ATLAS convierte las notas de una visita hospitalaria en un inventario de equipos que se puede revisar y consultar. Un colaborador dicta lo que observó, escribe una nota o fotografía una placa. QVAC procesa el contenido en el mismo equipo y ATLAS prepara el registro antes de guardarlo.

## Funciones

- Captura observaciones por voz, texto y fotografía.
- Extrae cliente, ciudad, país, modalidad, cantidad, marca, modelo y antigüedad.
- Acepta datos incompletos y pregunta por el campo faltante más útil.
- Clasifica cada dato como `Confirmado`, `Reportado`, `Estimado` o `Desconocido`.
- Detecta posibles duplicados sin fusionarlos automáticamente.
- Mantiene vistas por cliente y ubicación, alertas de información antigua y oportunidades de renovación.
- Permite consultar el inventario en lenguaje natural.
- Trabaja sin conexión con SQLite y modelos locales.

## Uso

1. El colaborador abre una visita y selecciona el cliente.
2. Graba una nota, escribe la observación o toma una foto de la placa.
3. ATLAS presenta los campos extraídos y señala cuáles faltan.
4. El colaborador corrige los datos, responde una pregunta de seguimiento y confirma el registro.
5. La observación queda disponible en la vista del cliente. Si coincide con otro activo, ATLAS muestra ambos registros para revisión.

El puntaje de confianza se calcula con reglas visibles que consideran la evidencia, la fecha, la cantidad de campos presentes y las confirmaciones independientes. Una corrección crea una nueva versión. La evidencia anterior permanece en el historial.

## Modelos locales

| Función | Modelo |
| --- | --- |
| Extracción y consultas | Qwen3 1.7B Instruct Q4_0 |
| Dictado | Whisper Small Q8 + Silero VAD |
| Lectura de placas | OCR Latin |
| Duplicados | EmbeddingGemma 300M Q8 |
| Respuesta hablada | Supertonic 3 Q4 |

Qwen3 usa JSON Schema para mantener una salida predecible. El modelo también admite SFT con un adaptador LoRA entrenado mediante QVAC. Ese ajuste se limita a extracción fiel, manejo de valores desconocidos, estados de evidencia y selección de la siguiente pregunta.

Los conjuntos se guardan en `data/finetuning/`. `train`, `validation` y `test` permanecen separados. Los adaptadores, checkpoints y métricas se escriben en `training/output/`, una ruta excluida de Git.

## Entorno

El equipo preparado tiene Python 3.11, Node.js 24, QVAC SDK 0.19.0, QVAC CLI 0.13.0, Flet 0.86.5, FFmpeg 9 y los modelos descargados. Python utiliza la instalación normal del usuario. No se crea `.venv`.

```console
python tools/prepare_environment.py
```

Para ejecutar el fine-tuning LoRA cuando corresponda:

```console
python training/train_lora.py
```

Los pesos utilizados están en `models/` y sus rutas se encuentran en `config/models.json`. Los archivos de gran tamaño permanecen fuera de Git.

## Estructura

```text
atlas-qvac/
├── assets/              Recursos de la interfaz
├── config/              Configuración del producto
├── data/finetuning/     Datos SFT
├── migrations/          Cambios de SQLite
├── models/              Pesos locales de QVAC
├── schemas/             Contratos JSON
├── tools/               Preparación y descarga de modelos
├── training/            Fine-tuning LoRA y resultados locales
├── src/atlas/
│   ├── application/     Casos de uso
│   ├── domain/          Entidades y reglas
│   ├── infrastructure/  QVAC, SQLite y almacenamiento
│   └── ui/              Vistas y componentes Flet
└── tests/               Pruebas y fixtures
```

## Origen de la base

La preparación inicial fue realizada por Julio Lara. Incluye la estructura, dependencias, el entrenamiento local, el esquema de observaciones y cuatro registros sintéticos. QVAC procede del [repositorio oficial de Tether](https://github.com/tetherto/qvac). Flet, Pydantic y RapidFuzz conservan sus licencias originales. La base no contiene la aplicación funcional ni datos reales de clientes.
