import { useEffect, useMemo, useState } from "react"
import { api } from "@/services/api"
import { mapInstalledBase } from "@/lib/mappers"
import type { ClientInstalledBase, Equipment } from "@/types"

export function useInstalledBase() {
  const [clients, setClients] = useState<ClientInstalledBase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        const data = await api.installedBase()
        if (mounted) setClients(mapInstalledBase(data))
      } catch (err) {
        console.error("Installed base load error:", err)
        if (mounted) setError("No se pudo cargar la base instalada.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const equipments = useMemo<Equipment[]>(
    () => clients.flatMap((c) => c.equipments),
    [clients],
  )

  return { clients, equipments, loading, error }
}
