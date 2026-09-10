# ATLAS | Installed Base Intelligence

ATLAS convierte fotografías, voz y notas de campo en una base instalada verificable y accionable. Procesa la información directamente en el dispositivo, funciona sin conexión y transforma observaciones incompletas en mejores decisiones de servicio, planificación y renovación.

## Del trabajo de campo a una decisión

```text
Fotografía autorizada + voz o texto
→ comprensión multimodal local
→ registro estructurado con evidencia
→ pregunta por el dato de mayor valor
→ detección de duplicados y conflictos
→ revisión humana
→ historial auditable y cola local de sincronización
→ Customer 360, calidad de datos y oportunidades
```

Una captura puede producir varios registros cuando se observan equipos de diferentes modalidades, marcas, modelos o edades. ATLAS conserva los valores desconocidos, nunca fusiona activos automáticamente y permite rastrear cada dato hasta su evidencia original.

## Capacidades

- **Smart Capture:** captura mediante fotografía, voz o texto aun sin conexión.
- **Asset Identity:** cliente, ubicación, modalidad, cantidad, fabricante, modelo, serie y antigüedad.
- **Next Best Question:** pregunta únicamente por el dato faltante que más valor aporta.
- **Confidence Engine:** puntaje explicable según completitud, evidencia, vigencia y confirmaciones independientes.
- **Entity Resolution:** encuentra duplicados y contradicciones sin alterar los registros originales.
- **Customer 360:** presenta la base instalada, su calidad y la última observación por cliente.
- **Territory Intelligence:** agrega modalidades, fabricantes y antigüedad por ciudad o país.
- **Opportunity Radar:** prioriza revisiones de renovación y actualización sin convertirlas en afirmaciones comerciales automáticas.
- **Evidence Ledger:** mantiene versiones, evidencia y una cadena local de auditoría verificable.
- **Offline Outbox:** conserva eventos idempotentes para integrarlos posteriormente con el transporte de sincronización elegido.

## Inteligencia local

Toda inferencia se ejecuta mediante `@qvac/sdk` 0.19.0 con rutas locales y sin fallback hacia APIs externas.

| Función                 | Modelo                                 | Cuantización                      |
| ----------------------- | -------------------------------------- | --------------------------------- |
| Comprensión visual      | `qvac/VisionPsy-Nano-460M-Flash-GGUFs` | Q4_K_M con imatrix + proyector Q8 |
| Extracción estructurada | Qwen3 600M Instruct                    | Q4_0                              |
| Transcripción           | Whisper Small + Silero VAD             | Q8_0                              |
| Similitud de activos    | EmbeddingGemma 300M                    | Q8_0                              |

VisionPsy es el núcleo de la captura visual: interpreta fotografías autorizadas de equipos y placas. Qwen convierte la evidencia en un contrato JSON estricto; Whisper procesa las notas habladas y EmbeddingGemma ayuda a ordenar candidatos duplicados.

Las salidas de los modelos siempre se consideran candidatas. El usuario confirma los campos antes de incorporarlos a la base instalada.

## Privacidad y confianza

- No se admiten fotografías de pacientes, expedientes, gafetes ni personas identificables.
- Una detección de contenido sensible bloquea la confirmación hasta retirar o redactar la imagen.
- Los archivos, índices, métricas y registros permanecen en el dispositivo.
- Las consultas naturales se convierten en filtros permitidos; nunca se ejecuta SQL generado por un modelo.
- Las oportunidades indican que un activo debe revisarse, no que deba reemplazarse.
- Cada cambio confirmado crea evidencia de auditoría y un evento idempotente de sincronización.

## Preparación

Requisitos verificados en el equipo de referencia:

- Windows 11.
- AMD Ryzen 7 5800H.
- 15.3 GB de RAM.
- NVIDIA RTX 3050 Laptop GPU de 4 GB.
- Node.js 24, npm 11 y Python 3.11.
- Sin entorno virtual de Python.

```console
python tools/prepare_environment.py
```

Comandos del núcleo:

```console
python -m atlas.main init
python -m atlas.main seed
python -m atlas.main capture --text "Observación de la visita"
python -m atlas.main capture --text "Observación revisada" --confirm --observer "usuario"
python -m atlas.main search --question "Tomógrafos en Panamá con más de siete años"
python -m atlas.main summary
npm run qvac:health
```

Los pesos se descargan y verifican con `tools/download-models.js`. Permanecen fuera de Git y sus rutas están declaradas en `config/models.json`.

Para ejecutar una demostración reproducible consulta [`DEMO_RUNBOOK.md`](DEMO_RUNBOOK.md). El adaptador LoRA es opcional: ATLAS usa el modelo base local cuando no hay un adaptador evaluado disponible.

## Datos

- `data/source/` conserva los archivos originales recibidos.
- `data/seed/installed-base.csv` contiene 20 observaciones sintéticas.
- `data/evaluation/` contiene casos de voz, inconsistencias y resultados reproducibles.
- `data/finetuning/` contiene fixtures SFT sintéticos para extracción estructurada.
- `data/local/` almacena SQLite, evidencia y métricas locales; no se publica en Git.

Todos los clientes, fabricantes, modelos y escenarios de demostración son ficticios.

## Base preexistente

El proyecto partió de los siguientes elementos preexistentes:

| Elemento                                                                          | Origen                    | Uso                                                                                                         |
| --------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Repositorio inicial (`48aa25d`, 8 de septiembre de 2026, 3:10 p. m. UTC-5)        | Julio Lara                | `.gitignore`, licencia y README inicial                                                                     |
| Scaffold técnico (`700d18b`, 8 de septiembre de 2026, 5:17 p. m. UTC-5)           | Julio Lara                | Arquitectura, configuración, esquemas, pruebas, stubs, herramientas de entorno y preparación de LoRA        |
| Actualización del README (`2f33371`, 8 de septiembre de 2026, 6:34 p. m. UTC-5)   | Julio Lara                | Ajuste de documentación                                                                                     |
| Primer prototipo funcional (`c0d250f`, 9 de septiembre de 2026, 1:04 a. m. UTC-5) | Ethan Martinez            | Interfaz inicial en Flet, SQLite, captura mediante FFmpeg y extracción preliminar con el SDK Python de QVAC |
| Fuentes y datos originales                                                        | Philips                   | Especificación y dataset sintético                                                                          |
| Datos derivados                                                                   | Equipo de ATLAS           | Conversión mecánica del workbook a CSV y JSON                                                               |
| Modelos locales                                                                   | QVAC y Tether AI Research | Pesos excluidos de Git                                                                                      |

El prototipo del commit `c0d250f` forma parte de la base preexistente. Toda nueva base, plantilla, fuente, modelo o componente externo incorporado se añadirá a esta declaración.

## Componentes externos

- `@qvac/sdk` y QVAC CLI para inferencia y herramientas locales.
- Pydantic y RapidFuzz para contratos y coincidencias explicables.
- Flet para la futura interfaz de escritorio.
- pytest, Ruff, ESLint, TypeScript, Vitest y Prettier para calidad.
- TensorBoard y TensorBoardX para seguimiento local del entrenamiento.

Las versiones exactas se encuentran en `package.json`, `package-lock.json` y `python-requirements.txt`. La licencia MIT cubre únicamente el código propio; los archivos, modelos y componentes externos conservan sus condiciones originales.
