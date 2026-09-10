import { useState } from "react";
import { Database, Zap, Shield, Bell, Palette, Save, Sun, Moon, Monitor } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Button,
  Input,
  Select,
  Badge,
} from "@/components/common";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "general" | "qvac" | "sync" | "appearance" | "notifications"
  >("general");
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState("system");
  const [density, setDensity] = useState("standard");

  const tabs = [
    { id: "general", label: "General", icon: Database },
    { id: "qvac", label: "QVAC / IA", icon: Zap },
    { id: "sync", label: "Sincronización", icon: Shield },
    { id: "appearance", label: "Apariencia", icon: Palette },
    { id: "notifications", label: "Notificaciones", icon: Bell },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Configuración</h1>
        <p className="mt-1 text-surface-500">
          Personaliza tu experiencia en ATLAS
        </p>
      </div>

      <div className="flex gap-6">
        <nav className="w-48 flex-shrink-0" aria-label="Configuración">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary-50 text-primary-700"
                      : "text-surface-600 hover:bg-surface-50 hover:text-surface-900"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1">
          {activeTab === "general" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Información del Usuario</CardTitle>
                  <CardDescription>
                    Datos de tu perfil en la plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Nombre completo"
                      defaultValue="Usuario Demo"
                    />
                    <Input
                      label="Email"
                      type="email"
                      defaultValue="demo@philips.com"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select
                      label="Rol"
                      options={[
                        {
                          value: "field_engineer",
                          label: "Ingeniero de Campo",
                        },
                        { value: "sales", label: "Ventas" },
                        { value: "specialist", label: "Especialista" },
                        { value: "admin", label: "Administrador" },
                      ]}
                      value="field_engineer"
                    />
                    <Select
                      label="Región"
                      options={[
                        { value: "latam", label: "Latinoamérica" },
                        { value: "north_america", label: "Norteamérica" },
                        { value: "europe", label: "Europa" },
                        { value: "apac", label: "APAC" },
                      ]}
                      value="latam"
                    />
                  </div>
                  <Input
                    label="Organización"
                    defaultValue="Philips Healthcare"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Preferencias de Captura</CardTitle>
                  <CardDescription>
                    Configura cómo trabajas en campo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select
                      label="Idioma por defecto"
                      options={[
                        { value: "es", label: "Español" },
                        { value: "en", label: "English" },
                        { value: "pt", label: "Português" },
                      ]}
                      value="es"
                    />
                    <Select
                      label="Unidad de medida"
                      options={[
                        { value: "metric", label: "Métrico (años)" },
                        { value: "imperial", label: "Imperial" },
                      ]}
                      value="metric"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="auto-extract"
                      defaultChecked
                      className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label
                      htmlFor="auto-extract"
                      className="text-sm text-surface-700"
                    >
                      Extraer información automáticamente al terminar la captura
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="voice-enabled"
                      defaultChecked
                      className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label
                      htmlFor="voice-enabled"
                      className="text-sm text-surface-700"
                    >
                      Habilitar captura por voz (requiere micrófono)
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="photo-enabled"
                      defaultChecked
                      className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label
                      htmlFor="photo-enabled"
                      className="text-sm text-surface-700"
                    >
                      Permitir adjuntar fotos de placas/etiquetas
                    </label>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "qvac" && (
            <Card>
              <CardHeader>
                <CardTitle>Configuración QVAC / IA Local</CardTitle>
                <CardDescription>
                  Modelos y parámetros de inferencia en dispositivo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium text-surface-900 mb-4">
                    Modelos de Inferencia
                  </h4>
                  <div className="space-y-4">
                    {[
                      {
                        name: "Extracción de Equipos (Qwen3)",
                        model: "qwen3-0.6b-q4_0.gguf",
                        size: "~400 MB",
                        type: "llamacpp-completion",
                      },
                      {
                        name: "Transcripción de Voz (Whisper)",
                        model: "whisper-small-q4_0.gguf",
                        size: "~250 MB",
                        type: "whispercpp-transcription",
                      },
                      {
                        name: "Embeddings (Gemma)",
                        model: "embeddinggemma-300m-q4_0.gguf",
                        size: "~150 MB",
                        type: "llamacpp-embedding",
                      },
                    ].map((model) => (
                      <div
                        key={model.model}
                        className="flex items-center justify-between p-4 bg-surface-50 rounded-lg border border-surface-200"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-surface-900">
                            {model.name}
                          </p>
                          <p className="text-sm text-surface-500">
                            {model.model} · {model.size} · {model.type}
                          </p>
                        </div>
                        <Badge variant="success">Cargado</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-surface-200 pt-6">
                  <h4 className="font-medium text-surface-900 mb-4">
                    Parámetros de Inferencia
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Temperatura (creatividad)</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        defaultValue={0.1}
                        className="w-full"
                      />
                      <p className="text-xs text-surface-500 mt-1">
                        0.1 - Determinista, extracción precisa
                      </p>
                    </div>
                    <div>
                      <label className="label">Max Tokens</label>
                      <input
                        type="number"
                        min="512"
                        max="4096"
                        step="512"
                        defaultValue={2048}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Device Preference</label>
                      <Select
                        options={[
                          {
                            value: "cpu",
                            label: "CPU (compatible, más lento)",
                          },
                          {
                            value: "gpu",
                            label: "GPU (más rápido, requiere hardware)",
                          },
                          { value: "auto", label: "Auto (recomendado)" },
                        ]}
                        value="auto"
                      />
                    </div>
                    <div>
                      <label className="label">Contexto máximo</label>
                      <input
                        type="number"
                        min="1024"
                        max="8192"
                        step="1024"
                        defaultValue={4096}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-surface-200 pt-6">
                  <div className="mb-4 flex items-center gap-3">
                    <h4 className="font-medium text-surface-900">Potencia compartida</h4>
                    <Badge variant="default" size="sm">Activo</Badge>
                  </div>
                  <p className="text-sm text-surface-600 mb-4">
                    Desde el dashboard puedes compartir el procesador de esta laptop con el móvil. El móvil escanea un código QR y ATLAS delega automáticamente texto y audio a la laptop, con fallback local si la conexión falla.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="fallback-local"
                      defaultChecked
                      disabled
                      className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label
                      htmlFor="fallback-local"
                      className="text-sm text-surface-700"
                    >
                      Fallback a inferencia local automático
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "sync" && (
            <Card>
              <CardHeader>
                <CardTitle>Sincronización y Almacenamiento</CardTitle>
                <CardDescription>
                  Configura cómo se sincronizan los datos entre dispositivos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium text-surface-900 mb-4">
                    Backend Local (Python)
                  </h4>
                  <div className="space-y-4">
                    <Input
                      label="API Base URL"
                      defaultValue="http://localhost:8000"
                    />
                    <Input
                      label="WebSocket URL"
                      defaultValue="ws://localhost:8000/ws"
                    />
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="auto-sync"
                        defaultChecked
                        className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label
                        htmlFor="auto-sync"
                        className="text-sm text-surface-700"
                      >
                        Sincronizar automáticamente al detectar conexión
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="offline-first"
                        defaultChecked
                        className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label
                        htmlFor="offline-first"
                        className="text-sm text-surface-700"
                      >
                        Modo offline-first (guardar local, sincronizar después)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="border-t border-surface-200 pt-6">
                  <h4 className="font-medium text-surface-900 mb-4">
                    Outbox / Cola de Sincronización
                  </h4>
                  <div className="space-y-3">
                    <p className="text-sm text-surface-600">
                      Observaciones pendientes de sincronizar:{" "}
                      <span className="font-medium text-primary-600">3</span>
                    </p>
                    <div className="flex gap-3">
                      <Button variant="secondary" size="sm">
                        Sincronizar Ahora
                      </Button>
                      <Button variant="ghost" size="sm">
                        Ver Cola
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-surface-200 pt-6">
                  <h4 className="font-medium text-surface-900 mb-4">
                    Almacenamiento Local
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-4 bg-surface-50 rounded-lg border border-surface-200 text-center">
                      <p className="text-2xl font-bold text-surface-900">
                        2.4 MB
                      </p>
                      <p className="text-sm text-surface-500">SQLite Local</p>
                    </div>
                    <div className="p-4 bg-surface-50 rounded-lg border border-surface-200 text-center">
                      <p className="text-2xl font-bold text-surface-900">
                        18 MB
                      </p>
                      <p className="text-sm text-surface-500">Modelos QVAC</p>
                    </div>
                    <div className="p-4 bg-surface-50 rounded-lg border border-surface-200 text-center">
                      <p className="text-2xl font-bold text-surface-900">
                        5.2 MB
                      </p>
                      <p className="text-sm text-surface-500">Cache / Assets</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "appearance" && (
            <Card>
              <CardHeader>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>Personaliza la interfaz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="label">Tema</label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { value: "light", label: "Claro", icon: Sun },
                      { value: "dark", label: "Oscuro", icon: Moon },
                      { value: "system", label: "Sistema", icon: Monitor },
                    ].map((themeOption) => (
                      <button
                        key={themeOption.value}
                        type="button"
                        onClick={() => setTheme(themeOption.value)}
                        aria-pressed={theme === themeOption.value}
                        className={`p-4 rounded-lg border-2 text-center transition-colors ${theme === themeOption.value ? "border-primary-500 bg-primary-50" : "border-surface-200 hover:border-surface-300"}`}
                      >
                        <span className="mb-1 block">
                          <themeOption.icon className="mx-auto h-6 w-6 text-primary-600" />
                        </span>
                        <span className="font-medium text-surface-900">
                          {themeOption.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-surface-200 pt-6">
                  <label className="label">Densidad de Información</label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        value: "comfortable",
                        label: "Cómoda",
                        desc: "Más espacio",
                      },
                      {
                        value: "standard",
                        label: "Estándar",
                        desc: "Equilibrado",
                      },
                      {
                        value: "compact",
                        label: "Compacta",
                        desc: "Más datos",
                      },
                    ].map((densityOption) => (
                      <button
                        key={densityOption.value}
                        type="button"
                        onClick={() => setDensity(densityOption.value)}
                        aria-pressed={density === densityOption.value}
                        className={`p-4 rounded-lg border-2 text-center transition-colors ${density === densityOption.value ? "border-primary-500 bg-primary-50" : "border-surface-200 hover:border-surface-300"}`}
                      >
                        <span className="font-medium text-surface-900">
                          {densityOption.label}
                        </span>
                        <p className="text-xs text-surface-500">
                          {densityOption.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notificaciones</CardTitle>
                <CardDescription>Configura qué alertas recibes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    label: "Nuevas observaciones de colegas",
                    desc: "Cuando alguien del equipo capture un equipo en un cliente compartido",
                    default: true,
                  },
                  {
                    label: "Duplicados detectados",
                    desc: "Alerta cuando el sistema detecta posibles duplicados",
                    default: true,
                  },
                  {
                    label: "Oportunidades de renovación",
                    desc: "Notificación semanal de equipos >7 años sin confirmar",
                    default: true,
                  },
                  {
                    label: "Baja confianza en extracción",
                    desc: "Cuando la IA tiene poca certeza en una extracción",
                    default: false,
                  },
                  {
                    label: "Sincronización completada",
                    desc: "Confirmación cuando el outbox se vacía correctamente",
                    default: false,
                  },
                  {
                    label: "Actualizaciones de modelos QVAC",
                    desc: "Nuevas versiones de modelos disponibles para descarga",
                    default: true,
                  },
                ].map((notif, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-surface-50 rounded-lg border border-surface-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-surface-900">
                        {notif.label}
                      </p>
                      <p className="text-sm text-surface-500">{notif.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={notif.default}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200">
            <Button
              variant="secondary"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
