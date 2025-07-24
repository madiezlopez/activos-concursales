import 'dotenv/config';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import dayjs from 'dayjs';
import { createClient } from '@supabase/supabase-js';

// Cargar claves Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const DAYS_BACK = parseInt(process.env.DAYS_BACK || '3', 10);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('⛔  Faltan claves de Supabase – revisa tu archivo .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// URL del BOE para un día concreto
const boeUrlForDate = (date) => {
  const y = date.format('YYYY');
  const m = date.format('MM');
  const d = date.format('DD');
  return `https://www.boe.es/diario_boe/txt.php?id=BOE-B-${y}${m}${d}`;
};

// Palabras clave para filtrar publicaciones
const keywords = ['liquidación', 'liquidacion', 'unidad productiva', 'subasta', 'venta de'];

// Verifica si un texto contiene alguna de las palabras clave
const isRelevant = (text) => {
  return keywords.some((k) => text.toLowerCase().includes(k));
};

// Scrapea un día
async function scrapeOneDay(date) {
  const url = boeUrlForDate(date);
  console.log(`🔎 Buscando en ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`⚠️ No se pudo acceder a ${url}`);
    return [];
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const activos = [];

  $('div.sumario a').each((_, el) => {
    const titulo = $(el).text().trim();
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
      });
    }
  });

  return activos;
}

// Ejecutar scraping en varios días
async function main() {
  const today = dayjs();
  let total = 0;

  for (let i = 0; i < DAYS_BACK; i++) {
    const date = today.subtract(i, 'day');
    const activos = await scrapeOneDay(date);

    if (activos.length > 0) {
      const { error } = await supabase.from('activos').upsert(activos, {
        onConflict: 'enlace_oficial',
      });

      if (error) {
        console.error('❌ Error al insertar en Supabase:', error.message);
      } else {
        console.log(`✅ ${activos.length} activos añadidos del día ${date.format('YYYY-MM-DD')}`);
        total += activos.length;
      }
    }
  }

  console.log(`📦 Total activos nuevos en ${DAYS_BACK} días: ${total}`);
}

main();

