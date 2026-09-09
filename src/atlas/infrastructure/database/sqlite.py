"""Conexión, transacciones y migraciones de SQLite."""

import sqlite3
import uuid
import os
from pathlib import Path
import openpyxl 

# Calculamos la raíz del proyecto.
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
DB_PATH = BASE_DIR / "atlas_local.db"
EXCEL_PATH = BASE_DIR / "Dummy_Installed_Base_Hackathon.xlsx"

class DatabaseManager:
    """Gestor principal de la base de datos local SQLite."""

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row 
        return conn

    def init_schema(self):
        """Crea el esquema de tablas."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS Customers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    city TEXT,
                    country TEXT,
                    is_synced BOOLEAN DEFAULT 0
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS Equipment (
                    id TEXT PRIMARY KEY,
                    customer_id TEXT,
                    modality TEXT NOT NULL,
                    manufacturer TEXT,
                    model TEXT,
                    quantity INTEGER DEFAULT 1,
                    estimated_age_years INTEGER,
                    confidence_level TEXT DEFAULT 'Reported',
                    is_synced BOOLEAN DEFAULT 0,
                    FOREIGN KEY (customer_id) REFERENCES Customers (id)
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS Observations (
                    id TEXT PRIMARY KEY,
                    customer_id TEXT,
                    original_text TEXT,
                    capture_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_synced BOOLEAN DEFAULT 0,
                    FOREIGN KEY (customer_id) REFERENCES Customers (id)
                )
            ''')
            
            conn.commit()
            print("Esquema de SQLite inicializado correctamente.")

    def seed_from_excel(self, excel_path: str = EXCEL_PATH):
        """Lee el Excel sintético usando openpyxl (evitando bloqueos de seguridad)."""
        if not os.path.exists(excel_path):
            print(f"No se encontró el archivo: {excel_path}")
            return

        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) FROM Customers")
            if cursor.fetchone()[0] > 0:
                print("ℹLa base de datos ya contiene información. Omitiendo siembra.")
                return

            print("Procesando archivo Excel con openpyxl puro...")
            try:
                wb = openpyxl.load_workbook(excel_path, data_only=True)
                sheet = wb.active
                
                headers = [str(cell.value).strip() if cell.value else f"col_{i}" for i, cell in enumerate(sheet[1])]
                clientes_procesados = {}
                equipos_insertados = 0
                
                for row in sheet.iter_rows(min_row=2, values_only=True):
                    if not any(row): continue 
                    
                    row_data = dict(zip(headers, row))
                    
                    customer_name = str(row_data.get('Customer') or f'Unknown_{uuid.uuid4()}').strip()
                    city = str(row_data.get('City') or 'Unknown').strip()
                    country = str(row_data.get('Country') or 'Unknown').strip()
                    modality = str(row_data.get('Modality') or 'Unknown').strip()
                    manufacturer = str(row_data.get('Manufacturer') or 'Unknown').strip()
                    
                    try: quantity = int(row_data.get('Quantity') or 1)
                    except: quantity = 1
                    
                    try: age = int(row_data.get('Age') or 0)
                    except: age = 0

                    # 1. Insertar Cliente (corregido con los 4 parámetros)
                    if customer_name not in clientes_procesados:
                        customer_id = str(uuid.uuid4())
                        clientes_procesados[customer_name] = customer_id
                        cursor.execute('''
                            INSERT INTO Customers (id, name, city, country, is_synced)
                            VALUES (?, ?, ?, ?, 1)
                        ''', (customer_id, customer_name, city, country)) # <-- Aquí estaba el error
                    else:
                        customer_id = clientes_procesados[customer_name]
                        
                    # 2. Insertar Equipo
                    cursor.execute('''
                        INSERT INTO Equipment (id, customer_id, modality, manufacturer, quantity, estimated_age_years, confidence_level, is_synced)
                        VALUES (?, ?, ?, ?, ?, ?, 'Confirmed', 1)
                    ''', (str(uuid.uuid4()), customer_id, modality, manufacturer, quantity, age))
                    
                    equipos_insertados += 1
                    
                conn.commit()
                print(f"Éxito: {len(clientes_procesados)} clientes y {equipos_insertados} equipos cargados de forma segura.")
                
            except Exception as e:
                print(f"Error al procesar el Excel: {e}")

if __name__ == "__main__":
    db = DatabaseManager()
    db.init_schema()
    db.seed_from_excel()