import flet as ft
import sys
import uuid
import asyncio
import os
import subprocess
import tempfile
from pathlib import Path

# Ajustamos el path (NO importamos numpy ni sounddevice para evitar el bloqueo de seguridad)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from src.atlas.infrastructure.database.sqlite import DatabaseManager
from src.atlas.infrastructure.qvac.extraction import ExtractionService
from src.atlas.infrastructure.qvac.speech import SpeechTranscriber

# --- CONFIGURA ESTO con el nombre exacto que te dio:
# ffmpeg -list_devices true -f dshow -i dummy
MICROPHONE_DEVICE_NAME = "Microphone (C-Media(R) Audio)"


async def main(page: ft.Page):
    # 1. Configuración de la App
    page.title = "ATLAS | Field Ops"
    page.window.width = 420
    page.window.height = 800
    page.theme_mode = ft.ThemeMode.LIGHT
    page.scroll = ft.ScrollMode.ADAPTIVE
    page.padding = 20
    page.horizontal_alignment = ft.CrossAxisAlignment.CENTER

    # 2. Inicialización de Servicios
    db = DatabaseManager()
    extractor = ExtractionService()
    transcriber = SpeechTranscriber()
    extracted_data_state = {"equipment": []}

    # --- GRABADOR DE AUDIO VIA FFMPEG (proceso externo, sin extensiones de Flet) ---
    is_recording = False
    recording_process = None
    temp_wav_path = os.path.join(tempfile.gettempdir(), "atlas_temp_record.wav")

    # 3. Cargar Clientes
    def load_customers():
        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id, name FROM Customers ORDER BY name")
                return cursor.fetchall()
        except Exception as e:
            print(f"Error cargando clientes: {e}")
            return []

    # 4. Componentes Base
    title = ft.Text("Registro de Observación", size=24, weight=ft.FontWeight.BOLD)

    customer_dropdown = ft.Dropdown(
        label="Instalación / Hospital",
        options=[ft.dropdown.Option(key=c["id"], text=c["name"]) for c in load_customers()],
        width=350,
        autofocus=True
    )

    observation_input = ft.TextField(
        label="Texto de la observación",
        multiline=True,
        min_lines=4,
        max_lines=6,
        width=350,
        hint_text="Escribe o usa el micrófono..."
    )

    loading_ring = ft.ProgressRing(visible=False)
    results_column = ft.Column(width=350, spacing=10)

    # --- 5. LÓGICA DEL MICRÓFONO VIA FFMPEG ---
    async def toggle_recording(e):
        nonlocal is_recording, recording_process

        if not is_recording:
            # COMENZAR A GRABAR
            if os.path.exists(temp_wav_path):
                os.remove(temp_wav_path)

            try:
                cmd = [
                    "ffmpeg",
                    "-y",
                    "-f", "dshow",
                    "-i", f"audio={MICROPHONE_DEVICE_NAME}",
                    "-ar", "16000",
                    "-ac", "1",
                    temp_wav_path,
                ]
                recording_process = subprocess.Popen(
                    cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                is_recording = True

                mic_btn.text = "🔴 Detener Grabación..."
                mic_btn.bgcolor = "red"
                page.update()
            except FileNotFoundError:
                page.snack_bar = ft.SnackBar(
                    ft.Text("❌ ffmpeg no encontrado. Instálalo y agrégalo al PATH."),
                    bgcolor="red",
                )
                page.snack_bar.open = True
                page.update()
            except Exception as ex:
                page.snack_bar = ft.SnackBar(ft.Text(f"Error de micrófono: {ex}"), bgcolor="red")
                page.snack_bar.open = True
                page.update()

        else:
            # DETENER GRABACIÓN: ffmpeg escucha 'q' en stdin para cerrar el archivo correctamente
            is_recording = False
            mic_btn.text = "⏳ Transcribiendo..."
            mic_btn.bgcolor = "grey"
            mic_btn.disabled = True
            page.update()

            def stop_ffmpeg():
                try:
                    recording_process.communicate(input=b"q", timeout=10)
                except Exception:
                    recording_process.terminate()
                    recording_process.wait()

            # correrlo en un hilo aparte para no bloquear el loop de eventos
            await asyncio.to_thread(stop_ffmpeg)

            if os.path.exists(temp_wav_path):
                try:
                    page.snack_bar = ft.SnackBar(ft.Text("Procesando audio con Whisper..."), bgcolor="blue")
                    page.snack_bar.open = True
                    page.update()

                    texto = await transcriber.transcribe_audio_file(temp_wav_path)

                    current_text = observation_input.value or ""
                    if current_text:
                        observation_input.value = current_text + " " + texto
                    else:
                        observation_input.value = texto

                except Exception as ex:
                    print(f"Error transcribiendo: {ex}")
                    page.snack_bar = ft.SnackBar(ft.Text("❌ Error en transcripción."), bgcolor="red")
                    page.snack_bar.open = True
            else:
                page.snack_bar = ft.SnackBar(ft.Text("❌ No se detectó archivo de audio."), bgcolor="red")
                page.snack_bar.open = True

            mic_btn.text = "🎤 Dictar Observación"
            mic_btn.bgcolor = "orange"
            mic_btn.disabled = False
            page.update()

    mic_btn = ft.ElevatedButton(
        "🎤 Dictar Observación",
        on_click=toggle_recording,
        width=350,
        bgcolor="orange",
        color="white"
    )

    # 6. Lógica de Extracción de Texto (Qwen3)
    async def analyze_click(e):
        if not customer_dropdown.value or not observation_input.value:
            page.snack_bar = ft.SnackBar(ft.Text("Selecciona cliente y añade una observación."))
            page.snack_bar.open = True
            page.update()
            return

        analyze_btn.disabled = True
        loading_ring.visible = True
        results_column.controls.clear()
        save_btn.visible = False
        page.update()

        data = await extractor.extract_equipment(observation_input.value)

        loading_ring.visible = False
        analyze_btn.disabled = False

        equipments = data.get("equipment", [])
        extracted_data_state["equipment"] = equipments

        if not equipments or (len(equipments) == 1 and equipments[0].get("modality") == "Unknown"):
            results_column.controls.append(ft.Text("No se detectaron equipos médicos claros.", color="red"))
        else:
            results_column.controls.append(ft.Text("Equipos Detectados:", weight=ft.FontWeight.BOLD))
            for eq in equipments:
                modality = eq.get('modality', 'Desconocido')
                qty = eq.get('quantity', 1)
                age = eq.get('estimated_age_years')
                age_text = f"{age} años aprox." if age else "Edad desconocida"

                card = ft.Card(
                    content=ft.Container(
                        padding=10,
                        content=ft.Row([
                            ft.Text("🏥", size=30),
                            ft.Column([
                                ft.Text(f"{qty}x {modality}", weight=ft.FontWeight.BOLD),
                                ft.Text(age_text, size=12, color="grey")
                            ], spacing=2)
                        ])
                    )
                )
                results_column.controls.append(card)

            save_btn.visible = True

        page.update()

    async def save_click(e):
        customer_id = customer_dropdown.value
        equipments = extracted_data_state.get('equipment', [])

        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                for eq in equipments:
                    cursor.execute('''
                        INSERT INTO Equipment (id, customer_id, modality, quantity, estimated_age_years, confidence_level, is_synced)
                        VALUES (?, ?, ?, ?, ?, 'Reported', 0)
                    ''', (
                        str(uuid.uuid4()),
                        customer_id,
                        str(eq.get('modality', 'Unknown')),
                        int(eq.get('quantity', 1)),
                        eq.get('estimated_age_years')
                    ))

                cursor.execute('''
                    INSERT INTO Observations (id, customer_id, original_text, is_synced)
                    VALUES (?, ?, ?, 0)
                ''', (str(uuid.uuid4()), customer_id, observation_input.value))

                conn.commit()

            observation_input.value = ""
            results_column.controls.clear()
            save_btn.visible = False
            page.snack_bar = ft.SnackBar(ft.Text("✅ Guardado en inventario local."), bgcolor="green")
            page.snack_bar.open = True
            page.update()

        except Exception as err:
            print(f"Error guardando: {err}")
            page.snack_bar = ft.SnackBar(ft.Text("❌ Error al guardar en base de datos."), bgcolor="red")
            page.snack_bar.open = True
            page.update()

    analyze_btn = ft.ElevatedButton("Procesar texto con IA", on_click=analyze_click, width=350)
    save_btn = ft.ElevatedButton("Confirmar y Guardar", on_click=save_click, width=350, visible=False, bgcolor="blue", color="white")

    # 7. Ensamblar la vista
    page.add(
        title,
        ft.Divider(),
        customer_dropdown,
        mic_btn,
        observation_input,
        analyze_btn,
        ft.Container(content=loading_ring, margin=10),
        results_column,
        save_btn
    )

if __name__ == "__main__":
    ft.run(main)