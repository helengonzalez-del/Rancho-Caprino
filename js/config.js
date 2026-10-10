// config.js — Conexión con Supabase y constantes del sistema

const SUPABASE_URL = 'https://jreovjjdhgfnlblfylbp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_C_KXtxYe-Wpd0IDlwfd4ew_u-zoj3p-';

const CONFIG_PENDIENTE = SUPABASE_URL.includes('TU-PROYECTO') || SUPABASE_KEY.startsWith('TU-');

// Días de historial de leche que se cargan al abrir (el resto se carga bajo demanda)
const LECHE_DIAS_INICIAL = 180;
// Gestación de la cabra (debe coincidir con el trigger de la base de datos)
const GESTACION_DIAS = 150;

const db = window.supabase.createClient(
  CONFIG_PENDIENTE ? 'https://placeholder.supabase.co' : SUPABASE_URL,
  CONFIG_PENDIENTE ? 'placeholder' : SUPABASE_KEY
);
