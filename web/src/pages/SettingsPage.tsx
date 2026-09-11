import { useState } from "react"
import {
  Database,
  Zap,
  Shield,
  Bell,
  Palette,
  Save,
  Sun,
  Moon,
  Monitor,
} from "lucide-react"
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
  PageHeader,
} from "@/components/common"
import { useTheme } from "@/lib/theme"

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "general" | "qvac" | "sync" | "appearance" | "notifications"
  >("general")
  const [isSaving, setIsSaving] = useState(false)
  const { theme, setTheme } = useTheme()
  const [density, setDensity] = useState("standard")

  const tabs = [
    { id: "general", label: "General", icon: Database },
    { id: "qvac", label: "QVAC / IA", icon: Zap },
    { id: "sync", label: "Sincronización", icon: Shield },
    { id: "appearance", label: "Apariencia", icon: Palette },
    { id: "notifications", label: "Notificaciones", icon: Bell },
  ]

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Configuración"
        description="Personaliza tu experiencia en ATLAS. Todo se guarda en el dispositivo."
      />

      <div className="flex gap-6">
        <nav className="w-48 flex-shrink-0" aria-label="Configuración">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary-readable"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Información del Usuario</CardTitle>
                  <CardDescription>
                    Datos de tu perfil en la plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Nombre completo" defaultValue="Usuario Demo" />
                    <Input
                      label="Email"
                      type="email"
                      defaultValue="demo@philips.com"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select
                      label="Rol"
                      value="field_engineer"
                      options={[
                        { value: "field_engineer", label: "Ingeniero de Campo" },
                        { value: "sales", label: "Ventas" },
                        { value: "specialist", label: "Especialista" },
                        { value: "admin", label: "Administrador" },
                      ]}
                    />
                    <Select
                      label="Región"
                      value="latam"
                      options={[
                        { value: "latam", label: "Latinoamérica" },
                        { value: "north_america", label: "Norteamérica" },
                        { value: "europe", label: "Europa" },
                        { value: "apac", label: "APAC" },
                      ]}
                    />
                  </div>
                  <Input label="Organización" defaultValue="Philips Healthcare" />
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
                      value="es"
                      options={[
                        { value: "es", label: "Español" },
                        { value: "en", label: "English" },
                        { value: "pt", label: "Português" },
                      ]}
                    />
                    <Select
                      label="Unidad de medida"
                      value="metric"
                      options={[
                        { value: "metric", label: "Métrico (años)" },
                        { value: "imperial", label: "Imperial" },
                      ]}
                    />
                  </div>
                  {[
                    {
                      id: "auto-extract",
                      label:
                        "Extraer información automáticamente al terminar la captura",
                      defaultChecked: true,
                    },
                    {
                      id: "voice-enabled",
                      label: "Habilitar captura por voz (requiere micrófono)",
                      defaultChecked: true,
                    },
                    {
                      id: "photo-enabled",
                      label: "Permitir adjuntar fotos de placas/etiquetas",
                      defaultChecked: true,
                    },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={item.id}
                        defaultChecked={item.defaultChecked}
                        className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                      />
                      <label htmlFor={item.id} className="text-sm text-muted-foreground">
                        {item.label}
                      </label>
                    </div>
                  ))}
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
                  <h4 className="font-medium text-foreground mb-4">
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
                        className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {model.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {model.model} · {model.size} · {model.type}
                          </p>
                        </div>
                        <Badge variant="success">Cargado</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h4 className="font-medium text-foreground mb-4">
                    Parámetros de Inferencia
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Temperatura (creatividad)</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        defaultValue={0.1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        0.1 - Determinista, extracción precisa
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Max Tokens</label>
                      <Input type="number" min={512} max={4096} step={512} defaultValue={2048} />
                    </div>
                    <div>
                      <Select
                        label="Device Preference"
                        value="auto"
                        options={[
                          { value: "cpu", label: "CPU (compatible, más lento)" },
                          { value: "gpu", label: "GPU (más rápido, requiere hardware)" },
                          { value: "auto", label: "Auto (recomendado)" },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Contexto máximo</label>
                      <Input type="number" min={1024} max={8192} step={1024} defaultValue={4096} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <div className="mb-4 flex items-center gap-3">
                    <h4 className="font-medium text-foreground">
                      Potencia compartida
                    </h4>
                    <Badge variant="info">Activo</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Desde el dashboard puedes compartir el procesador de esta laptop con el móvil. El móvil escanea un código QR y ATLAS delega automáticamente texto y audio a la laptop, con fallback local si la conexión falla.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="fallback-local"
                      defaultChecked
                      disabled
                      className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                    />
                    <label
                      htmlFor="fallback-local"
                      className="text-sm text-muted-foreground"
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
                  <h4 className="font-medium text-foreground mb-4">
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
                    {[
                      {
                        id: "auto-sync",
                        label: "Sincronizar automáticamente al detectar conexión",
                        defaultChecked: true,
                      },
                      {
                        id: "offline-first",
                        label: "Modo offline-first (guardar local, sincronizar después)",
                        defaultChecked: true,
                      },
                    ].map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={item.id}
                          defaultChecked={item.defaultChecked}
                          className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                        />
                        <label htmlFor={item.id} className="text-sm text-muted-foreground">
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h4 className="font-medium text-foreground mb-4">
                    Outbox / Cola de Sincronización
                  </h4>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Observaciones pendientes de sincronizar:{" "}
                      <span className="font-medium text-primary-readable">3</span>
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

                <div className="border-t border-border pt-6">
                  <h4 className="font-medium text-foreground mb-4">
                    Almacenamiento Local
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { value: "2.4 MB", label: "SQLite Local" },
                      { value: "18 MB", label: "Modelos QVAC" },
                      { value: "5.2 MB", label: "Cache / Assets" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="p-4 bg-muted rounded-lg border border-border text-center"
                      >
                        <p className="text-2xl font-bold text-foreground">
                          {stat.value}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {stat.label}
                        </p>
                      </div>
                    ))}
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
                  <label className="mb-3 block text-sm font-medium text-foreground">Tema</label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { value: "light", label: "Claro", icon: Sun },
                      { value: "dark", label: "Oscuro", icon: Moon },
                      { value: "system", label: "Sistema", icon: Monitor },
                    ].map((themeOption) => (
                      <button
                        key={themeOption.value}
                        type="button"
                        onClick={() =>
                          setTheme(
                            themeOption.value as "light" | "dark" | "system",
                          )
                        }
                        aria-pressed={theme === themeOption.value}
                        className={`p-4 rounded-lg border-2 text-center transition-colors ${
                          theme === themeOption.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        <span className="mb-1 block">
                          <themeOption.icon
                            className={`mx-auto h-6 w-6 ${
                              theme === themeOption.value
                                ? "text-primary-readable"
                                : "text-muted-foreground"
                            }`}
                          />
                        </span>
                        <span className="font-medium text-foreground">
                          {themeOption.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <label className="mb-3 block text-sm font-medium text-foreground">
                    Densidad de Información
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { value: "comfortable", label: "Cómoda", desc: "Más espacio" },
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
                        className={`p-4 rounded-lg border-2 text-center transition-colors ${
                          density === densityOption.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        <span className="font-medium text-foreground">
                          {densityOption.label}
                        </span>
                        <p className="text-xs text-muted-foreground">
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
                <CardDescription>
                  Configura qué alertas recibes
                </CardDescription>
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
                    className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {notif.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {notif.desc}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={notif.default}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
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
  )
}
