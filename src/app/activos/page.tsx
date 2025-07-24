'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase' // 👈 nota el import relativo

export default function ActivosPage() {
  const [activos, setActivos] = useState<any[]>([])

  useEffect(() => {
    const fetchActivos = async () => {
      const { data, error } = await supabase.from('activos').select('*')
      if (error) console.error('Error:', error)
      else setActivos(data)
    }

    fetchActivos()
  }, [])

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Activos en Liquidación</h1>

      {activos.length === 0 && <p>No hay activos aún.</p>}

      <ul className="space-y-4">
        {activos.map((activo) => (
          <li key={activo.id} className="border p-4 rounded shadow">
            <h2 className="text-xl font-semibold">{activo.titulo}</h2>
            <p><strong>Tipo:</strong> {activo.tipo}</p>
            <p><strong>Ubicación:</strong> {activo.ubicacion}</p>
            <p><strong>Estado:</strong> {activo.estado}</p>
            <p>{activo.descripcion}</p>
            {activo.enlace_oficial && (
              <a href={activo.enlace_oficial} target="_blank" className="text-blue-600 underline">
                Ver fuente oficial
              </a>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}
