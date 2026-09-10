import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "@/components/common";
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
} from "lucide-react";

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
        description: "Criterios para flaggear equipos candidatos a renovación",
        icon: Clock,
      },
    ],
  },
];

const faqs = [
  {
    q: "¿Funciona sin conexión a internet?",
    a: "Sí. ATLAS está diseñado para funcionar offline-first. La inferencia QVAC corre localmente en tu dispositivo (laptop o móvil). Los datos se guardan en SQLite local y se sincronizan cuando hay conexión.",
  },
  {
    q: "¿Qué modelos de IA usa ATLAS?",
    a: "Usa QVAC SDK con: Qwen3 0.6B para extracción de equipos, Whisper Small para transcripción de voz, y EmbeddingGemma para búsquedas semánticas. Todos corren localmente via llama.cpp / whisper.cpp.",
  },
  {
    q: "¿Cómo funciona la inferencia P2P delegada?",
    a: 'La laptop del hospital actúa como "provider" QVAC (startQVACProvider). El móvil se conecta via Hyperswarm DHT y delega tareas pesadas (visión, embeddings grandes) a la laptop. Si falla, cae a inferencia local (fallbackToLocal).',
  },
  {
    q: "¿Puedo usar ATLAS en móvil?",
    a: "Sí, hay una app Expo/React Native (separada) que usa @qvac/sdk/expo-plugin. Requiere dispositivo físico Android (minSdk 29) o iOS. No funciona en emulador.",
  },
  {
    q: "¿Cómo se exportan los datos?",
    a: "Desde la página de Consultas NL puedes exportar a CSV. También hay API programática. El backend Python expone endpoints para integración con CRM/ERP.",
  },
];

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
];

export function HelpPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">
          Ayuda y Documentación
        </h1>
        <p className="mt-1 text-surface-500">
          Guías, FAQ y recursos para sacar el máximo partido a ATLAS
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <section.icon className="w-6 h-6 text-primary-600" />
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <button
                      key={item.title}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 transition-colors text-left"
                    >
                      <item.icon className="w-5 h-5 text-surface-400 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <p className="font-medium text-surface-900">
                          {item.title}
                        </p>
                        <p className="text-sm text-surface-500">
                          {item.description}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-surface-400" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-primary-600" />
                <CardTitle className="text-lg">Preguntas Frecuentes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <details
                    key={i}
                    className="group border border-surface-200 rounded-lg overflow-hidden"
                  >
                    <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                      <p className="font-medium text-surface-900">{faq.q}</p>
                      <AlertTriangle className="w-5 h-5 text-surface-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="px-4 pb-4 border-t border-surface-200 text-surface-600">
                      {faq.a}
                    </div>
                  </details>
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
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 transition-colors"
                  >
                    <resource.icon className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-900 truncate">
                        {resource.title}
                      </p>
                      <p className="text-xs text-surface-500 truncate">
                        {resource.desc}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-surface-400" />
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
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-2"
                  onClick={() => navigate("/capture")}
                >
                  <Mic className="w-4 h-4" />
                  Nueva Captura
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-2"
                  onClick={() => navigate("/queries")}
                >
                  <Search className="w-4 h-4" />
                  Consultar Base Instalada
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-2"
                  onClick={() => navigate("/installed-base")}
                >
                  <Database className="w-4 h-4" />
                  Ver Base Instalada
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start gap-2"
                  onClick={() => navigate("/settings")}
                >
                  <Settings className="w-4 h-4" />
                  Configuración
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary-200 bg-primary-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-primary-900">
                    Versión Hackathon Demo
                  </p>
                  <p className="text-sm text-primary-700 mt-1">
                    Esta es una versión de demostración para la hackathon
                    Philips. Algunos datos son simulados. La inferencia QVAC
                    real requiere entorno nativo (Node.js/Electron/Expo).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
