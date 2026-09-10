import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Database,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  StatusBadge,
  Select,
  Modal,
} from '@/components/common';
import { api } from '@/services/api';
import { mapInstalledBase } from '@/lib/mappers';
import type { ClientInstalledBase, Equipment } from '@/types';

const MODALITY_FILTERS = [
  { value: '', label: 'Todas las modalidades' },
  { value: 'MRI', label: 'MRI' },
  { value: 'CT', label: 'CT' },
  { value: 'XRAY', label: 'X-Ray' },
  { value: 'ULTRASOUND', label: 'Ultrasonido' },
  { value: 'PET', label: 'PET' },
  { value: 'OTHER', label: 'Otro' },
];

const STATUS_FILTERS = [
  { value: '', label: 'Todos los estados' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'REPORTED', label: 'Reportado' },
  { value: 'ESTIMATED', label: 'Estimado' },
  { value: 'UNKNOWN', label: 'Desconocido' },
];

const BRAND_FILTERS = [
  { value: '', label: 'Todas las marcas' },
  { value: 'PHILIPS', label: 'Philips' },
  { value: 'SIEMENS', label: 'Siemens' },
  { value: 'GE', label: 'GE' },
  { value: 'CANON', label: 'Canon' },
  { value: 'OTHER', label: 'Otra' },
];

export function InstalledBasePage() {
  const [clients, setClients] = useState<ClientInstalledBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [modalityFilter, setModalityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientInstalledBase | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await api.installedBase();
        setClients(mapInstalledBase(data));
      } catch (err) {
        setError('Error cargando la base instalada');
        console.error('Installed base load error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.country.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesModality =
        !modalityFilter || client.equipments.some((e) => e.modality === modalityFilter);
      const matchesStatus =
        !statusFilter || client.equipments.some((e) => e.status === statusFilter);
      const matchesBrand =
        !brandFilter || client.equipments.some((e) => e.brand === brandFilter);

      return matchesSearch && matchesModality && matchesStatus && matchesBrand;
    });
  }, [clients, searchQuery, modalityFilter, statusFilter, brandFilter]);

  const allEquipments = useMemo(
    () => clients.flatMap((c) => c.equipments),
    [clients]
  );

  const handleViewDetails = (client: ClientInstalledBase) => {
    setSelectedClient(client);
  };

  const getStatusColor = (status: Equipment['status']) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'REPORTED': return 'bg-blue-100 text-blue-800';
      case 'ESTIMATED': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-surface-100 text-surface-700';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Base Instalada</h1>
          <p className="mt-1 text-surface-500">Gestión y visualización de equipos por cliente y geografía</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setViewMode('table')}>Tabla</Button>
          <Button variant="secondary" onClick={() => setViewMode('cards')}>Tarjetas</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Buscar cliente, ciudad, país..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
            <Select label="Modalidad" options={MODALITY_FILTERS} value={modalityFilter} onChange={(e) => setModalityFilter(e.target.value)} className="w-48" />
            <Select label="Estado" options={STATUS_FILTERS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-48" />
            <Select label="Marca" options={BRAND_FILTERS} value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="w-48" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center"><Database className="w-6 h-6 text-blue-600" /></div>
              <div><p className="text-sm text-surface-500">Total Equipos</p><p className="text-2xl font-bold text-surface-900">{allEquipments.length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center"><CheckCircle className="w-6 h-6 text-green-600" /></div>
              <div><p className="text-sm text-surface-500">Confirmados</p><p className="text-2xl font-bold text-surface-900">{allEquipments.filter(e => e.status === 'CONFIRMED').length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center"><Clock className="w-6 h-6 text-yellow-600" /></div>
              <div><p className="text-sm text-surface-500">Pendientes</p><p className="text-2xl font-bold text-surface-900">{allEquipments.length - allEquipments.filter(e => e.status === 'CONFIRMED').length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center"><TrendingUp className="w-6 h-6 text-red-600" /></div>
              <div><p className="text-sm text-surface-500">Oportunidades Renovación</p><p className="text-2xl font-bold text-surface-900">{allEquipments.filter(e => e.ageYears && e.ageYears > 7).length}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === 'cards' ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.clientId} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{client.clientName}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-sm text-surface-500">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{client.city}, {client.country}</span>
                    </div>
                  </div>
                  <Badge variant="success">{client.totalEquipmentCount} eq.</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-surface-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Última visita: {new Date(client.lastVisit).toLocaleDateString('es-ES')}
                  </span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {client.equipments.slice(0, 5).map((equipment) => (
                    <div key={equipment.id} className="flex items-center justify-between p-2 bg-surface-50 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(equipment.status)}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-surface-900 truncate">{equipment.modality}</p>
                          <p className="text-xs text-surface-500 truncate">
                            {equipment.brand} {equipment.model || ''} {equipment.ageYears ? `· ${equipment.ageYears} años` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-surface-500">
                        {equipment.ageYears && equipment.ageYears > 7 && <AlertTriangle className="w-3.5 h-3.5 text-red-500" aria-label="Candidato a renovación" />}
                        <span>×{equipment.quantity}</span>
                      </div>
                    </div>
                  ))}
                  {client.equipments.length > 5 && <p className="text-xs text-surface-500 text-center py-1">+{client.equipments.length - 5} equipos más</p>}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-surface-200">
                  <span className="text-sm text-surface-500">{client.renewalOpportunities} oportunidades de renovación</span>
                  <Button size="sm" variant="ghost" onClick={() => handleViewDetails(client)}>Ver detalles</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredClients.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Database className="w-12 h-12 text-surface-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-surface-900">No se encontraron clientes</h3>
              <p className="text-surface-500 mt-1">Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Ubicación</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Equipos</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Modalidades</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Renovaciones</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Última Visita</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {filteredClients.map((client) => (
                    <tr key={client.clientId} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-3"><p className="font-medium text-surface-900">{client.clientName}</p></td>
                      <td className="px-4 py-3"><p className="text-sm text-surface-500">{client.city}, {client.country}</p></td>
                      <td className="px-4 py-3"><Badge>{client.totalEquipmentCount} equipos</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set(client.equipments.map((e) => e.modality))).map((mod) => (
                            <Badge key={mod} variant="default" size="sm">{mod}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {client.renewalOpportunities > 0 ? (
                          <Badge variant="warning">{client.renewalOpportunities} oportunidades</Badge>
                        ) : (
                          <Badge variant="success">Sin urgencia</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-surface-500">{new Date(client.lastVisit).toLocaleDateString('es-ES')}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleViewDetails(client)}>Ver</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredClients.length === 0 && (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-surface-900">No se encontraron clientes</h3>
                <p className="text-surface-500 mt-1">Intenta ajustar los filtros de búsqueda</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedClient && (
        <Modal isOpen={!!selectedClient} onClose={() => setSelectedClient(null)} title={selectedClient.clientName} size="lg">
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-sm text-surface-500">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{selectedClient.city}, {selectedClient.country}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Última visita: {new Date(selectedClient.lastVisit).toLocaleDateString('es-ES')}</span>
            </div>
            <div>
              <h4 className="font-medium text-surface-900 mb-3">Equipos ({selectedClient.totalEquipmentCount})</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                {selectedClient.equipments.map((equipment) => (
                  <div key={equipment.id} className="p-3 bg-surface-50 rounded-lg border border-surface-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={equipment.status} size="sm" />
                          <span className="font-medium text-surface-900">{equipment.modality}</span>
                          {equipment.brand && <span className="text-sm text-surface-500">{equipment.brand}</span>}
                          {equipment.model && <span className="text-sm text-surface-400">{equipment.model}</span>}
                          {equipment.ageYears && <span className="text-sm text-surface-400">{equipment.ageYears} años</span>}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-surface-500">
                          <span>Cantidad: ×{equipment.quantity}</span>
                          <span>Confianza: {(equipment.confidence * 100).toFixed(0)}%</span>
                          {equipment.ageYears && equipment.ageYears > 7 && (
                            <span className="flex items-center gap-1 text-red-600"><AlertTriangle className="w-3.5 h-3.5" />Candidato renovación</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
