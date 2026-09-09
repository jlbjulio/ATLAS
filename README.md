# ATLAS | Installed Base Intelligence

ATLAS convierte observaciones de campo en una visión viva, confiable y accionable de los equipos instalados en cada cliente. El colaborador fotografía una placa autorizada y añade una observación por voz o texto; la aplicación procesa todo localmente, pregunta por los datos esenciales que falten y presenta el registro para confirmación.

## Flujo principal

```text
Fotografía + voz o texto
→ VisionPsy y QVAC en el dispositivo
→ extracción estructurada
→ validación y pregunta de seguimiento
→ detección de duplicados o conflictos
→ confirmación humana
→ SQLite
→ Customer 360, mapa, dashboard y oportunidades
```

Una captura puede producir varios registros cuando menciona equipos de distintas modalidades, marcas o edades. Los valores desconocidos permanecen vacíos; ATLAS no inventa información ni fusiona registros sin revisión.

## Funciones

- Captura multimodal mediante fotografía, voz y texto.
- Extracción de cliente, ubicación, modalidad, cantidad, fabricante, modelo y antigüedad.
- Estados `Confirmed`, `Reported`, `Estimated` y `Unknown`.
- Pregunta por el dato faltante más valioso.
- Detección de duplicados y observaciones contradictorias.
- Customer 360, navegación geográfica y panel agregado.
- Confianza, vigencia, trazabilidad y oportunidades de renovación.
- Intercambio P2P mediante Pears sin depender de inferencia remota.

## IA local

Todas las operaciones principales de inferencia se ejecutarán mediante `@qvac/sdk` en el dispositivo. La interfaz Python/Flet se comunicará con el runtime local TypeScript y no llamará servicios de IA externos. ATLAS no utiliza RAG; las consultas naturales se convertirán en filtros seguros sobre SQLite.

El modelo Psy central es:

| Campo | Valor |
| --- | --- |
| Repositorio | `qvac/VisionPsy-Nano-460M-Flash-GGUFs` |
| Modelo | `visionpsy-nano-460m-flash-q4_k_m-imat.gguf` |
| Cuantización | `Q4_K_M` con imatrix |
| Proyector | `mmproj-visionpsy-nano-460m-flash-q8.gguf` |
| Función | Comprensión de fotografías permitidas de equipos y placas |

La salida visual siempre se considera evidencia candidata. El usuario confirma modalidad, fabricante, modelo y texto detectado antes de guardar.

## Datos de demostración

- `data/source/`: archivos originales proporcionados por Philips.
- `data/seed/installed-base.csv`: 20 observaciones sintéticas.
- `data/evaluation/voice-cases.jsonl`: 10 casos conversacionales.
- `data/evaluation/data-quality-cases.json`: inconsistencias que deben detectarse.
- `data/finetuning/`: cuatro fixtures sintéticos que validan el formato SFT; no constituyen un modelo entrenado.
- `config/`: reglas, valores de referencia y modelos.
- `schemas/`: contratos de extracción y rendimiento.

Todos los clientes, fabricantes, modelos y escenarios son ficticios. La demostración no utiliza información confidencial, imágenes de pacientes ni fotografías sin autorización.

## Entorno

- Windows 11 Home Single Language 10.0.26200
- AMD Ryzen 7 5800H, 16 procesadores lógicos
- 15.3 GB de RAM
- NVIDIA GeForce RTX 3050 Laptop GPU, 4 GB
- Node.js 24.14.0, npm 11.9.0 y Python 3.11

```console
python tools/prepare_environment.py
```

El registro reproducible incluye modelo, cuantización, prompt, tokens de entrada y salida, tiempo de carga, TTFT, duración total y tokens por segundo.

## Servicios remotos

Ninguno para inferencia, RAG o procesamiento sensible. La experiencia principal debe seguir funcionando sin conexión.

## Cobertura de los requisitos

### Requisito general

| Requisito | Implementación en ATLAS | Estado |
| --- | --- | --- |
| Construcción sobre QVAC | `@qvac/sdk` 0.19.0 es el runtime obligatorio para toda inferencia principal | Preparado |
| Inferencia local o P2P | `allow_cloud_inference: false` y rutas de modelos locales en `config/models.json` | Preparado |
| Sin APIs de inferencia en la nube | No se configura ningún proveedor remoto de IA | Preparado |
| Uso de Pears | Intercambio P2P de observaciones entre dispositivos, sin convertirlo en dependencia de la experiencia principal | Por implementar |
| Problema real y flujo completo | Captura, extracción, validación, confirmación, almacenamiento y visualización | Por implementar |
| Repositorio accesible | Código, configuración, datos sintéticos e instrucciones reproducibles | Pendiente de publicación |
| Video demostrativo | Demostración en español de máximo cinco minutos y accesible sin credenciales | Pendiente |
| Base preexistente | Declarada íntegramente en la sección siguiente | Cumplido |

### Reto de Philips

| Requisito | Cobertura en ATLAS |
| --- | --- |
| Captura natural | Voz, texto y fotografía autorizada |
| Extracción estructurada | Cliente, ciudad, país, modalidad, cantidad, fabricante, modelo y antigüedad |
| Datos incompletos | Valores vacíos y pregunta por el dato faltante más valioso |
| Dataset estructurado | SQLite inicializado desde `data/seed/installed-base.csv` |
| Estado de observación | `Confirmed`, `Reported`, `Estimated` o `Unknown` |
| Vista por cliente | Customer 360 con observaciones, equipos y última actualización |
| Agregación | Dashboard y navegación geográfica |
| Duplicados | Candidatos por coincidencia, sin fusión automática |
| Confianza y vigencia | Puntaje explicable, confirmaciones independientes y alertas de información antigua |
| Consultas naturales | Conversión local a filtros seguros sobre SQLite |
| Oportunidades | Identificación explicable de equipos posiblemente renovables |
| Fotografías | VisionPsy analiza únicamente equipos o placas permitidas |

### Reto Psy

| Requisito | Cobertura en ATLAS | Estado |
| --- | --- | --- |
| Modelo Psy central | VisionPsy-Nano-460M-Flash procesa la evidencia visual del flujo principal | Preparado |
| `@qvac/sdk` para inferencia | El runtime evaluado será TypeScript y utilizará exclusivamente `@qvac/sdk` | Preparado |
| Hardware edge declarado | Ryzen 7 5800H, 15.3 GB RAM y RTX 3050 Laptop 4 GB | Cumplido |
| Aplicación útil sin servicios remotos | Datos, modelos y SQLite permanecen locales | Diseñado |
| Modelo y cuantización honestos | Repositorio, archivo, proyector y Q4_K_M imatrix identificados | Cumplido |
| Código abierto permisivo | Licencia MIT | Cumplido |
| Limitaciones y seguridad | Evidencia candidata, confirmación humana y prohibición de imágenes de pacientes | Cumplido |
| Calidad medible | Casos de voz, inconsistencias y métricas de extracción reproducibles | Preparado |
| Registro de rendimiento | Esquema con carga, prompt, tokens, TTFT y throughput | Preparado; faltan mediciones |
| Flujo funcional completo | Captura hasta visualización y oportunidad | Por implementar |
| Video de hasta cinco minutos | Debe mostrar el flujo y el hardware declarado | Pendiente |

## Uso de los archivos proporcionados

| Contenido original | Uso dentro del proyecto |
| --- | --- |
| Documento del reto | Fuente de los requisitos funcionales y de diseño |
| `Dummy Installed Base` | 20 registros preservados en el XLSX y convertidos a CSV para SQLite |
| `Agent Question Logic` | 12 pasos convertidos a `config/question-logic.json` |
| `Dummy Reference Lists` | 19 valores convertidos a `config/reference-values.json` |
| `Voice Test Prompts` | 10 pruebas convertidas a `data/evaluation/voice-cases.jsonl` |
| Inconsistencias detectadas | Dos casos conservados en `data/evaluation/data-quality-cases.json` |

El XLSX guardado en `data/source/` coincide mediante SHA-256 con el archivo proporcionado. Las conversiones no sustituyen ni modifican el original.

## Base preexistente

Antes del inicio de la ventana oficial de desarrollo existían los siguientes elementos:

| Elemento | Origen | Uso |
| --- | --- | --- |
| Repositorio inicial (`48aa25d`) | Julio Lara, antes de la ventana oficial | `.gitignore`, licencia y README inicial |
| Scaffold técnico (`700d18b`) | Julio Lara con asistencia de OpenAI Codex, antes de la ventana oficial | Arquitectura, README, configuración, esquemas, pruebas, stubs Python/Flet, herramientas de entorno y preparación de LoRA |
| Actualización del README (`2f33371`) | Julio Lara, antes de la ventana oficial | Ajuste de documentación |
| Primer prototipo funcional (`c0d250f`, 9 de septiembre de 2026, 1:04 a. m. UTC-5) | Ethan Martinez, antes de la ventana oficial | Interfaz inicial en Flet, almacenamiento SQLite, captura de audio mediante FFmpeg, transcripción y extracción preliminar con el SDK Python de QVAC |
| Cuatro fixtures SFT sintéticos | Generados por el equipo con asistencia de OpenAI Codex | Validación de formato; no se entrenó un adaptador final |
| Modelos locales descargados | Registro oficial de QVAC y repositorios de Tether AI Research | Preparación del entorno; pesos excluidos de Git |
| `customer-installed-base-challenge.docx` | Philips | Especificación del problema |
| `dummy-installed-base.xlsx` | Philips | Dataset sintético |
| CSV y JSON derivados | Conversión mecánica del XLSX mediante Python y openpyxl | Semilla y evaluación |
| Logo y banner | Generados con OpenAI antes de la construcción funcional; almacenados fuera del repositorio | Identidad de la entrega |

El prototipo del commit `c0d250f` constituye trabajo funcional previo y se declara expresamente para cumplir las reglas de participación. Su existencia no implica que sea la implementación final evaluada. Toda nueva librería, plantilla, fuente, modelo o componente incorporado se añadirá a esta declaración.

## Componentes externos

- `@qvac/sdk` 0.19.0, QVAC CLI y modelos QVAC/Tether: inferencia y herramientas locales.
- Flet, Pydantic y RapidFuzz: interfaz, validación y coincidencias.
- pytest, Ruff, ESLint, TypeScript, Vitest y Prettier: calidad y pruebas.
- TensorBoard y TensorBoardX: seguimiento local de entrenamiento.
- Python y openpyxl: conversión del workbook proporcionado.

Las versiones exactas están fijadas en `package.json`, `package-lock.json` y `python-requirements.txt`. No se utilizan APIs remotas de IA.

## Licencia

El código propio se publica bajo la licencia MIT. Los archivos suministrados en `data/source/` conservan sus condiciones de origen y no se relicencian.
