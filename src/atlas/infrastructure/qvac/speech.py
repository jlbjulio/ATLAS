"""Captura de voz, VAD y transcripción local con QVAC."""

import sys
from pathlib import Path
import asyncio

# Importaciones del SDK de QVAC
from tetherto.qvac_sdk import (
    Client,
    TranscribeRequest,
    load_model,
    transcribe,
    unload_model,
)
# Usamos el modelo que viene en el registro del SDK para evitar descargas manuales
from tetherto.qvac_sdk.models import WHISPER_TINY

class SpeechTranscriber:
    """
    Servicio para transcribir audio usando el modelo Whisper Tiny integrado en el SDK.
    Implementa carga perezosa para ahorrar RAM.
    """
    def __init__(self):
        # Usamos la constante del SDK, no rutas locales
        self.model_src = WHISPER_TINY

    def _print_progress(self, p) -> None:
        """Imprime el progreso de descarga si el modelo no está en caché."""
        line = f"▸ Descargando {p.percentage:.0f}% ({p.downloaded / 1e6:.1f}/{p.total / 1e6:.1f} MB)"
        print(line, end="\r" if sys.stderr.isatty() else "\n", file=sys.stderr)
        if p.percentage >= 100:
            print(file=sys.stderr)

    async def transcribe_audio_file(self, audio_file_path: str) -> str:
        """Carga Whisper, transcribe el archivo y descarga el modelo de RAM."""
        if not Path(audio_file_path).exists():
            raise FileNotFoundError(f"No se encontró el archivo: {audio_file_path}")

        transcribed_text = ""
        
        async with Client() as client:
            t = client.transport
            model_id = None
            try:
                print("▸ Cargando modelo Whisper (Lazy Load)...")
                # El modelo se descarga aquí si es la primera vez
                model_id = await load_model(
                    t,
                    model_src=self.model_src,
                    # Usamos configuración mínima
                    model_config={"audio_format": "f32le", "language": "es"}, 
                    on_progress=self._print_progress,
                )
                
                print("▸ Transcribiendo...")
                request = TranscribeRequest.model_validate(
                    {
                        "type": "transcribe",
                        "modelId": model_id,
                        "audioChunk": {"type": "filePath", "value": str(audio_file_path)},
                        "metadata": False,
                    }
                )

                segments = []
                async for response in transcribe(t, request):
                    if hasattr(response, 'text') and response.text:
                        segments.append(response.text)
                    elif hasattr(response, 'segment') and response.segment:
                        segments.append(response.segment.text)

                transcribed_text = "".join(segments).strip()
                print("▸ Éxito.")

            except Exception as e:
                print(f"Error: {e}", file=sys.stderr)
            finally:
                if model_id:
                    print("▸ Liberando RAM (Unloading)...")
                    await unload_model(t, model_id)

        return transcribed_text