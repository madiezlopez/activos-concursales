import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio';
import dayjs from 'dayjs'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_KEY!
const DAYS_BACK = parseInt(process.env.DAYS_BACK || '1', 10)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const keywords = ['liquidación', 'unidad productiva', 'subasta', 'venta de', 'concurso', 'activo']

const boeUrlForDate = (date: dayjs.Dayjs) =>
  `https://www.boe.es/diario_boe/txt.php?id=BOE-B-${date.format('YYYYMMDD')}`

const isRelevant = (text: string) =>
  keywords.some((k) => text.toLowerCase().includes(k))

async function scrapeOneDay(date: dayjs.Dayjs) {
  const res = await fetch(boeUrlForDate(date))
  if (!res.ok) return []

  const html = await res.text()
  const $ = cheerio.load(html)
  interface Activo {
  titulo: string
  tipo: string
  estado: string
  ubicacion: string
  enlace_oficial: string
  descripcion: string
  fecha_publicacion: string
  contacto: string
}

const activos: Activo[] = []

  $('div.sumario a').each((_, el) => {
    const titulo = $(el).text().trim()
    if (isRelevant(titulo)) {
      activos.push({
        titulo,
        tipo: 'BOE',
        estado: 'Publicado',
        ubicacion: 'España',
        enlace_oficial: 'https://www.boe.es' + $(el).attr('href'),
        descripcion: titulo,
        fecha_publicacion: date.format('YYYY-MM-DD'),
        contacto: '-',
      })
    }
  })

  return activos
}

export async function GET() {
  const today = dayjs()
  let total = 0

  for (let i = 0; i < DAYS_BACK; i++) {
    const date = today.subtract(i, 'day')
    const activos = await scrapeOneDay(date)

    if (activos.length > 0) {
      const { error } = await supabase.from('activos').upsert(activos, {
        onConflict: 'enlace_oficial',
      })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
        })
      }

      total += activos.length
    }
  }

  return new Response(JSON.stringify({ message: `✅ ${total} activos insertados.` }), {
    status: 200,
  })
}
