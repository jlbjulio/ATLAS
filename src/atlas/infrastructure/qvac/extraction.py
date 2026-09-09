"""Extracción local y estructurada de observaciones mediante QVAC."""
import sys
import json
import asyncio
import re

# Importaciones oficiales del SDK de QVAC para Text Generation
from tetherto.qvac_sdk import Client, completion, load_model, unload_model
# Usaremos la versión de 600M o 1.7B que incluye el SDK para auto-descarga
from tetherto.qvac_sdk.models import QWEN3_1_7B_INST_Q4

class ExtractionService:
    """
    Servicio de extracción estructurada usando LLM local vía QVAC.
    Implementa carga perezosa (Lazy Load) para cuidar la memoria RAM.
    """

    def __init__(self):
        # Usamos el modelo del registro interno del SDK
        self.model_src = QWEN3_1_7B_INST_Q4
        
        # El System Prompt es clave: obliga al modelo a comportarse como un 
        # extractor de JSON puro, evitando texto conversacional innecesario.
        self.system_prompt = (
            "Eres ATLAS, un asistente de inteligencia experto en extraer inventario "
            "de equipos médicos a partir de notas de campo. "
            "Extrae la información en un formato JSON estricto. "
            "Usa siempre la siguiente estructura: \n"
            "{\n"
            '  "customer": "Nombre del hospital o cliente",\n'
            '  "equipment": [\n'
            '    {\n'
            '      "modality": "Categoría (ej. MR, CT, Ultrasound)",\n'
            '      "quantity": número entero,\n'
            '      "estimated_age_years": número entero o null,\n'
            '      "confidence_level": "Reported" o "Estimado"\n'
            '    }\n'
            '  ]\n'
            "}\n"
            "Responde ÚNICAMENTE con el bloque JSON, sin markdown ni explicaciones adicionales."
        )

    def _print_progress(self, p) -> None:
        """Imprime el progreso si el modelo se está descargando por primera vez."""
        line = f"▸ Descargando Qwen3 {p.percentage:.0f}% ({p.downloaded / 1e6:.1f}/{p.total / 1e6:.1f} MB)"
        print(line, end="\r" if sys.stderr.isatty() else "\n", file=sys.stderr)
        if p.percentage >= 100:
            print(file=sys.stderr)

    async def extract_equipment(self, observation_text: str) -> dict:
        """
        Carga Qwen3, procesa el texto pidiendo JSON, y libera la memoria.
        """
        print(f"[Extracción] Analizando: '{observation_text}'")
        
        extracted_json = {"customer": "Unknown", "equipment": []}
        
        async with Client() as client:
            t = client.transport
            model_id = None
            try:
                print("▸ Cargando Qwen3 (Lazy Load)...")
                # 1. Cargar el modelo en RAM
                model_id = await load_model(
                    t,
                    model_src=self.model_src,
                    model_config={"ctx_size": 2048}, # Contexto ajustado para notas de campo
                    on_progress=self._print_progress,
                )
                
                # 2. Configurar la conversación
                history = [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": observation_text},
                ]

                print("▸ Realizando inferencia (esto puede tomar unos segundos)...")
                # 3. Llamada de completación (sin stream, esperamos el bloque final)
                run = completion(
                    t, 
                    model_id=model_id, 
                    history=history,
                    # generationParams para bajar temperatura y evitar alucinaciones
                    generationParams={"temp": 0.0, "predict": 512} 
                )
                
                final = await run.final
                raw_response = final.content_text
                
                # 4. Limpieza robusta del JSON (Por si el LLM añade "```json")
                json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
                if json_match:
                    clean_json_str = json_match.group(0)
                    extracted_json = json.loads(clean_json_str)
                else:
                    print("No se encontró una estructura JSON válida en la respuesta.")
                
                print("[Extracción] Finalizada.")
                
            except json.JSONDecodeError as e:
                print(f"Error al parsear JSON del modelo: {e}")
                print(f"Respuesta cruda fue: {raw_response}")
            except Exception as e:
                print(f"Error en QVAC: {e}", file=sys.stderr)
                
            finally:
                # 5. ¡LIBERAR MEMORIA! 
                if model_id:
                    print("▸ Liberando RAM (Unloading Qwen3)...")
                    await unload_model(t, model_id)

        return extracted_json

# Bloque para probar el módulo independientemente
if __name__ == "__main__":
    extractor = ExtractionService()
    texto = "Visité el Hospital Alpha en São Paulo. Vi 3 resonadores magnéticos y 2 tomógrafos. Un resonador se veía algo viejo, como de 8 años."
    
    # Ejecutamos de forma asíncrona
    datos = asyncio.run(extractor.extract_equipment(texto))
    
    print("\n--- Resultado JSON Estructurado ---")
    print(json.dumps(datos, indent=2, ensure_ascii=False))