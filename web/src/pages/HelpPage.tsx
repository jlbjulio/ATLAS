import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  PageHeader,
} from "@/components/common"
import {
  BookOpen,
  Github,
  ExternalLink,
  Zap,
  Mic,
  Database,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Settings,
  HelpCircle,
  ArrowRight,
  ChevronDown,
} from "lucide-react"

const sections = [
  {
    title: "Primeros Pasos",
    icon: BookOpen,
    items: [
      {
        title: "Guía de Inicio Rápido",
        description: "Cómo capturar tu primera observación en 5 minutos",
        icon: Zap,
      },
      {
        title: "Configuración de QVAC Local",
        description: "Descarga y configuración de modelos en tu laptop",
        icon: Settings,
      },
      {
        title: "Conexión P2P Laptop-Móvil",
        description: "Configurar inferencia delegada entre dispositivos",
        icon: Shield,
      },
    ],
  },
  {
    title: "Captura de Observaciones",
    icon: Mic,
    items: [
      {
        title: "Captura por Voz",
        description: "Mejores prácticas para dictado en entornos hospitalarios",
        icon: Mic,
      },
      {
        title: "Captura por Texto",
        description: "Formato recomendado para observaciones escritas",
        icon: Database,
      },
      {
        title: "Fotos de Placas/ Etiquetas",
        description:
          "Cómo fotografiar etiquetas de equipos para mejor extracción",
        icon: ExternalLink,
      },
      {
        title: "Campos Requeridos vs Opcionales",
        description: "Qué información es obligatoria para cada observación",
        icon: AlertTriangle,
      },
    ],
  },
  {
    title: "Consultas en Lenguaje Natural",
    icon: Search,
    items: [
      {
        title: "Sintaxis de Consultas",
        description: "Ejemplos de preguntas que entiende el sistema",
        icon: BookOpen,
      },
      {
        title: "Filtros Avanzados",
        description: "Cómo combinar modalidad, marca, antigüedad y ubicación",
        icon: Shield,
      },
      {
        title: "Exportar Resultados",
        description: "CSV, JSON y SQL generado automáticamente",
        icon: Download,
      },
    ],
  },
  {
    title: "Base Instalada",
    icon: Database,
    items: [
      {
        title: "Vista por Cliente",
        description: "Navegar y filtrar la base instalada por hospital",
        icon: Database,
      },
      {
        title: "Estados de Confirmación",
        description: "Entender CONFIRMED, REPORTED, ESTIMATED, UNKNOWN",
        icon: CheckCircle,
      },
      {
        title: "Detección de Duplicados",
        description:
          "Cómo el sistema identifica equipos reportados múltiples veces",
        icon: AlertTriangle,
      },
      {
        title: "Oportunidades de Renovación",
        description: "Criterios para marcar equipos candidatos a renovación",
        icon: Clock,
      },
    ],
  },
]

const faqs = [
  {
    q: "¿Funciona sin conexión a internet?",
    a: "Sí. ATLAS está diseñado para funcionar sin conexión. La inferencia QVAC corre localmente en tu dispositivo (laptop o celular). Los datos se guardan en SQLite local y se sincronizan cuando hay conexión.",
  },
  {
    q: "¿Qué modelos de IA usa ATLAS?",
    a: "Usa QVAC SDK con: Qwen3 0.6B para extracción de equipos, Whisper Small para transcripción de voz, y EmbeddingGemma para búsquedas semánticas. Todos corren localmente via llama.cpp / whisper.cpp.",
  },
  {
    q: "¿Cómo funciona la potencia compartida?",
    a: "La laptop puede compartir su procesador con el celular. Desde el panel se genera un código QR; al escanearlo desde ATLAS Field, ambos dispositivos se enlazan en la misma red Wi-Fi. ATLAS delega automáticamente texto y audio a la laptop más potente, y si la conexión falla continúa en el celular.",
  },
  {
    q: "¿Puedo usar ATLAS en el celular?",
    a: "Sí, hay una app Expo/React Native (separada) que usa @qvac/sdk/expo-plugin. Requiere dispositivo físico Android (minSdk 29) o iOS. No funciona en emulador.",
  },
  {
    q: "¿Cómo se exportan los datos?",
    a: "Desde la página de Consultas NL puedes exportar a CSV. También hay API programática. El backend Python expone endpoints para integración con CRM/ERP.",
  },
]

const resources = [
  {
    title: "QVAC SDK Documentation",
    url: "https://docs.qvac.tether.io",
    icon: ExternalLink,
    desc: "Docs oficiales de inferencia local y P2P",
  },
  {
    title: "Repositorio ATLAS",
    url: "https://github.com/philips/atlas",
    icon: Github,
    desc: "Código fuente y issues",
  },
]

function FaqItem({ faq }: { faq: { q: string; a: string } }) {
  const [open, setOpen] = useState(false)
  return (
    <details
      className="group border border-border rounded-lg overflow-hidden"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
        <p className="font-medium text-foreground">{faq.q}</p>
        <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" />
      </summary>
      <div className="px-4 pb-4 border-t border-border text-muted-foreground">
        {faq.a}
      </div>
    </details>
  )
}

export function HelpPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Soporte"
        title="Ayuda y documentación"
        description="Guías, preguntas frecuentes y recursos para sacar el máximo partido a ATLAS."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <section.icon className="w-6 h-6 text-primary" />
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <button
                      key={item.title}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <item.icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <p className="font-medium text-foreground">
                          {item.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-primary" />
                <CardTitle className="text-lg">Preguntas Frecuentes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <FaqItem key={i} faq={faq} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recursos Externos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resources.map((resource) => (
                  <a
                    key={resource.title}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <resource.icon className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {resource.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {resource.desc}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accesos Rápidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: "Nueva Captura", icon: Mic, href: "/capture" },
                  {
                    label: "Consultar Base Instalada",
                    icon: Search,
                    href: "/queries",
                  },
                  {
                    label: "Ver Base Instalada",
                    icon: Database,
                    href: "/installed-base",
                  },
                  {
                    label: "Configuración",
                    icon: Settings,
                    href: "/settings",
                  },
                ].map((item) => (
                  <Button
                    key={item.href}
                    variant="secondary"
                    className="w-full justify-start gap-2"
                    onClick={() => navigate(item.href)}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-primary-readable">
                    Versión Hackathon Demo
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Esta es una versión de demostración para la hackathon Philips.
                    Algunos datos son simulados. La inferencia QVAC real requiere
                    entorno nativo (Node.js/Electron/Expo).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
