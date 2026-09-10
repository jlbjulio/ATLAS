import { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Copy,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  Filter,
  MessageCircle,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Button,
  Badge,
  StatusBadge,
} from '@/components/common';
import { SearchForm } from '@/components/forms';
import { api } from '@/services/api';
import { mapSearchResponse } from '@/lib/mappers';
import type { ClientInstalledBase, QueryIntent } from '@/types';

const exampleQueries = [
  'Clientes en Brasil con resonadores de más de siete años',
  'Tomógrafos Philips con más de 10 años de antigüedad',
  'Oportunidades de renovación en Colombia',
  'Equipos reportados sin confirmar',
  'Base instalada por país',
  'Duplicados detectados esta semana',
  'Equipos con confianza menor al 70%',
  'Resonadores Siemens instalados después de 2020',
];

const intentLabels: Record<QueryIntent, string> = {
  LIST_CLIENTS: 'Listar clientes',
  LIST_EQUIPMENT_BY_MODALITY: 'Equipos por modalidad',
  LIST_EQUIPMENT_BY_AGE: 'Equipos por antigüedad',
  LIST_EQUIPMENT_BY_BRAND: 'Equipos por marca',
  RENEWAL_OPPORTUNITIES: 'Oportunidades de renovación',
  DUPLICATES: 'Duplicados',
  CONFIDENCE_LOW: 'Baja confianza',
  UNKNOWN: 'Consulta general',
};

export function QueriesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState<{
    query: string;
    parsedIntent: QueryIntent;
    results: ClientInstalledBase[];
    filters: Record<string, unknown>;
  } | null>(null);
  const [stats, setStats] = useState<{
    total_equipment: number;
    confirmed: number;
    pending: number;
    renewals: number;
    clients: number;
    modalities: number;
    by_modality: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [dashboard] = await Promise.all([
          api.dashboard(),
        ]);
        setStats({
          total_equipment: dashboard.total_equipment,
          confirmed: dashboard.total_equipment - dashboard.pending_confirmations,
          pending: dashboard.pending_confirmations,
          renewals: dashboard.renewal_opportunities,
          clients: dashboard.total_clients,
          modalities: Object.keys(dashboard.by_modality ?? {}).length,
          by_modality: dashboard.by_modality ?? {},
        });
      } catch (err) {
        console.error('Stats load error:', err);
      }
    };
    loadStats();
  }, []);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setCurrentQuery(null);
    setQueryError(null);

    try {
      const response = await api.search(query);
       const { results, filters, intent } = mapSearchResponse(response);
      setCurrentQuery({
        query,
         parsedIntent: (intent as QueryIntent) ?? 'UNKNOWN',
        results,
        filters,
      });
    } catch (err) {
      console.error('Search error:', err);
      setQueryError('ATLAS no pudo responder esta pregunta. Revisa que el backend local y QVAC estén disponibles.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!currentQuery) return;
    const csv = [
      ['Cliente', 'Ciudad', 'País', 'Modalidad', 'Marca', 'Modelo', 'Años', 'Estado'],
      ...currentQuery.results.flatMap((c) =>
        c.equipments.map((e) => [c.clientName, c.city, c.country, e.modality, e.brand || '', e.model || '', e.ageYears?.toString() || '', e.status])
      ),
    ].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atlas-query-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySQL = () => {
    if (!currentQuery?.filters) return;
    navigator.clipboard.writeText(JSON.stringify(currentQuery.filters, null, 2));
  };

  const totalResults = currentQuery?.results.reduce((sum, c) => sum + c.equipments.length, 0) ?? 0;
  const uniqueClients = currentQuery?.results.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Consultas en Lenguaje Natural</h1>
          <p className="mt-1 text-surface-500">Conversa con ATLAS sobre la base instalada, como lo harías con un colega.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowExamples(!showExamples)}>
            <ChevronDown className="w-4 h-4 mr-1" /> Ejemplos
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
           <SearchForm onSearch={handleSearch} isLoading={isLoading} suggestions={exampleQueries} onSuggestionClick={handleSearch} />

           {queryError && (
             <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
               <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
               <span>{queryError}</span>
             </div>
           )}

           {isLoading && (
             <div className="flex items-center gap-3 text-sm text-surface-500" role="status">
               <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                 <MessageCircle className="h-5 w-5 animate-pulse" />
               </div>
               <span>ATLAS está preparando una respuesta con inferencia local...</span>
             </div>
           )}

           {showExamples && (
            <Card>
              <CardHeader>
                <CardTitle>Ejemplos de Consultas</CardTitle>
                <CardDescription>Haz clic en cualquier ejemplo para ejecutarlo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {exampleQueries.map((eq) => (
                    <Button key={eq} variant="ghost" size="sm" className="whitespace-nowrap" onClick={() => handleSearch(eq)} disabled={isLoading}>
                      {eq}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

           {currentQuery && (
             <div className="space-y-3">
               <div className="flex justify-end">
                 <div className="max-w-[90%] rounded-2xl rounded-br-md bg-[#071a26] px-4 py-3 text-sm text-white shadow-sm">
                   {currentQuery.query}
                 </div>
               </div>
               <div className="flex items-start gap-3">
                 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                   <MessageCircle className="h-5 w-5" />
                 </div>
                 <Card className="min-w-0 flex-1">
               <CardHeader>
                 <div className="flex items-center justify-between">
                   <div>
                     <CardTitle>Esto encontré</CardTitle>
                     <CardDescription>Interpreté tu pregunta como <strong>{intentLabels[currentQuery.parsedIntent]}</strong> · {uniqueClients} clientes · {totalResults} equipos</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Exportar CSV</Button>
                    <Button variant="ghost" size="sm" onClick={handleCopySQL}><Copy className="w-4 h-4 mr-1" /> Copiar Filtros</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {currentQuery.results.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-surface-900">Sin resultados</h3>
                    <p className="text-surface-500 mt-1">No se encontraron coincidencias para tu consulta</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentQuery.results.map((client) => (
                      <div key={client.clientId} className="border border-surface-200 rounded-lg overflow-hidden">
                        <div className="p-4 bg-surface-50 border-b border-surface-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-surface-900">{client.clientName}</h4>
                              <p className="text-sm text-surface-500">{client.city}, {client.country}</p>
                            </div>
                            <Badge>{client.equipments.length} equipos</Badge>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 max-h-60 overflow-y-auto scrollbar-thin">
                            {client.equipments.map((equipment) => (
                              <div key={equipment.id} className="p-3 bg-white border border-surface-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <StatusBadge status={equipment.status} size="sm" />
                                  <span className="font-medium text-sm text-surface-900">{equipment.modality}</span>
                                </div>
                                <p className="text-xs text-surface-500 truncate">{equipment.brand} {equipment.model || ''}</p>
                                {equipment.ageYears && <p className={`text-xs ${equipment.ageYears > 7 ? 'text-red-600' : 'text-surface-500'}`}>{equipment.ageYears} años {equipment.ageYears > 7 && <AlertTriangle className="inline w-3 h-3" />}</p>}
                                <p className="text-xs text-surface-400">Confianza: {(equipment.confidence * 100).toFixed(0)}%</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
               </CardContent>
                 </Card>
               </div>
             </div>
           )}

          {currentQuery && (
            <Card>
              <CardHeader><CardTitle>Filtros Aplicados</CardTitle></CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-surface-900 text-surface-100 p-4 rounded-lg overflow-x-auto text-sm font-mono max-h-48 overflow-y-auto">
                    <code>{JSON.stringify(currentQuery.filters, null, 2)}</code>
                  </pre>
                  <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={handleCopySQL}><Copy className="w-4 h-4 mr-1" /> Copiar</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Estadísticas Rápidas</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats && [
                  { label: 'Total Equipos', value: stats.total_equipment, icon: Database, color: 'text-blue-600 bg-blue-100' },
                  { label: 'Confirmados', value: stats.confirmed, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
                  { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
                  { label: 'Renovaciones (>7 años)', value: stats.renewals, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
                  { label: 'Clientes', value: stats.clients, icon: Database, color: 'text-purple-600 bg-purple-100' },
                  { label: 'Modalidades', value: stats.modalities, icon: Filter, color: 'text-orange-600 bg-orange-100' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: item.color.replace('text-', 'bg-').replace('600', '50').replace('100', '100') }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: item.color.replace('text-', 'bg-').replace('600', '100') }}>
                      <item.icon className="w-5 h-5" style={{ color: item.color.replace('bg-', 'text-').replace('100', '600') }} />
                    </div>
                    <div>
                      <p className="text-sm text-surface-500">{item.label}</p>
                      <p className="text-2xl font-bold text-surface-900">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Distribución por Modalidad</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats && Object.entries(stats.by_modality).map(([name, count]) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded bg-primary-500" />
                    <span className="text-sm text-surface-600 flex-1">{name}</span>
                    <span className="text-sm font-medium text-surface-900">{count}</span>
                    <div className="w-24 h-2 bg-surface-200 rounded overflow-hidden">
                      <div className="h-full bg-primary-500 rounded" style={{ width: `${(count / Math.max(...Object.values(stats.by_modality))) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
