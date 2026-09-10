import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Search,
  Mic,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/common';
import { Button } from '@/components/common';
import { api, type DashboardStats } from '@/services/api';
import { mapDashboard, mapInstalledBase } from '@/lib/mappers';
import type { ClientInstalledBase } from '@/types';
import { SharedPowerCard } from '@/components/shared/SharedPowerCard';

interface DashboardStatsExtended extends DashboardStats {
  by_modality: Record<string, number>;
  status_counts: Record<string, number>;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<ClientInstalledBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [dashboardStats, installedBase] = await Promise.all([
          api.dashboard(),
          api.installedBase(),
        ]);
        setStats(mapDashboard(dashboardStats) as DashboardStatsExtended);
        setClients(mapInstalledBase(installedBase));
      } catch (err) {
        setError('Error cargando el dashboard');
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-900 mb-2">Error al cargar</h2>
          <p className="text-surface-500">{error}</p>
          <Button variant="primary" onClick={() => window.location.reload()} className="mt-4">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const totalEquipments = stats?.total_equipment ?? 0;
  const totalClients = stats?.total_clients ?? 0;
  const pendingConfirmations = stats?.pending_confirmations ?? 0;
  const renewalOpportunities = stats?.renewal_opportunities ?? 0;

  const byModality = stats?.by_modality ?? {};

  const statusCounts = stats?.status_counts ?? {};

  const topClients = [...clients]
    .sort((a, b) => b.totalEquipmentCount - a.totalEquipmentCount)
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 border-b border-surface-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-700">Inteligencia de base instalada</p>
          <h1 className="text-3xl font-bold tracking-tight text-surface-900">Dashboard</h1>
          <p className="mt-1 text-surface-500">Visión general de la base instalada y actividad reciente</p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => navigate('/capture')}>
            <Mic className="w-4 h-4 mr-2" /> Nueva Captura
          </Button>
          <Button variant="secondary" onClick={() => navigate('/queries')}>
            <Search className="w-4 h-4 mr-2" /> Consultar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { name: 'Total Equipos', value: totalEquipments, icon: Database, color: 'text-blue-600 bg-blue-100' },
          { name: 'Clientes Activos', value: totalClients, icon: CheckCircle, color: 'text-accent-700 bg-accent-100' },
          { name: 'Por Confirmar', value: pendingConfirmations, icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
          { name: 'Oportunidades Renovación', value: renewalOpportunities, icon: TrendingUp, color: 'text-amber-700 bg-amber-100' },
        ].map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-500">{stat.name}</p>
                  <p className="mt-1 text-3xl font-bold text-surface-900">{stat.value}</p>
                </div>
               <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
              <p className="mt-4 text-xs text-surface-400">Lectura actual de la base local</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SharedPowerCard />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Clientes por Equipos</CardTitle>
            <CardDescription>Clientes con mayor base instalada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topClients.length > 0 ? (
                topClients.map((client) => (
                  <Link key={client.clientName} to={`/installed-base/${client.clientName}`} className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-50 transition-colors group">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-200 transition-colors">
                      <Database className="w-5 h-5 text-primary-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-900 truncate">{client.clientName}</p>
                      <p className="text-xs text-surface-500 truncate">{client.city}, {client.country}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-surface-900">{client.totalEquipmentCount}</p>
                      <p className="text-xs text-red-600">Ver detalles</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-surface-500">No hay datos de clientes</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Modalidad</CardTitle>
            <CardDescription>Equipos en la base instalada por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(byModality).length > 0 ? (
              <div className="h-56 flex items-end justify-center gap-4 border-b border-surface-200 px-4">
                {Object.entries(byModality).map(([name, value]) => (
                  <div key={name} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-primary-500 rounded-t transition-all hover:opacity-90" style={{ height: `${Math.max((value / Math.max(...Object.values(byModality))) * 100, 10)}%` }} />
                    <span className="mt-2 text-xs font-medium text-surface-600">{name}</span>
                    <span className="text-sm font-bold text-surface-900">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-sm text-surface-500">
                La distribución aparecerá cuando haya equipos registrados.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Estado de Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.keys(statusCounts).length > 0 ? Object.entries(statusCounts).map(([label, value]) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded ${
                    label === 'Confirmado' ? 'bg-accent-500' :
                    label === 'Reportado' ? 'bg-blue-500' :
                    label === 'Estimado' ? 'bg-amber-500' : 'bg-surface-400'
                  }`} />
                  <span className="text-sm text-surface-600 flex-1">{label}</span>
                  <span className="text-sm font-medium text-surface-900">{value}</span>
                </div>
              )) : (
                <p className="text-sm text-surface-500">Aún no hay estados registrados.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
