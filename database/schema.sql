-- =====================================================================
--  RANCHO CAPRINO — Esquema de base de datos (Supabase / PostgreSQL)
-- =====================================================================
--  Cómo usarlo:
--    1. Crea un proyecto NUEVO en https://supabase.com
--    2. Ve a SQL Editor → New query → pega TODO este archivo → Run
--    3. Copia la URL y la anon key (Settings → API) en js/config.js
--
--  Es seguro ejecutarlo en un proyecto vacío. NO lo ejecutes sobre la
--  base de datos del rancho ovino: usa un proyecto distinto.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. USUARIOS
--    Se crea solo al registrarse (trigger al final de esta sección).
-- ---------------------------------------------------------------------
create table public.usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text,
  rol         text not null default 'productor'
              check (rol in ('productor','veterinario','capturista','admin')),
  telefono    text,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text := coalesce(new.raw_user_meta_data->>'rol', 'productor');
begin
  -- Desde el registro público nadie puede asignarse 'admin'.
  -- Para crear un admin: update public.usuarios set rol = 'admin' where id = '...';
  if v_rol not in ('productor','veterinario','capturista') then
    v_rol := 'productor';
  end if;

  insert into public.usuarios (id, nombre, rol, telefono)
  values (
    new.id,
    new.raw_user_meta_data->>'nombre',
    v_rol,
    nullif(new.raw_user_meta_data->>'telefono', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 2. RAZAS (catálogo editable desde la app)
-- ---------------------------------------------------------------------
create table public.razas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  created_at  timestamptz not null default now()
);

insert into public.razas (nombre) values
  ('Saanen'),
  ('Alpina Francesa'),
  ('Toggenburg'),
  ('Nubia'),
  ('LaMancha'),
  ('Boer'),
  ('Criolla'),
  ('Cruza')
on conflict (nombre) do nothing;


-- ---------------------------------------------------------------------
-- 3. ANIMALES
-- ---------------------------------------------------------------------
create table public.animales (
  id                uuid primary key default gen_random_uuid(),
  identificador     text not null,                 -- número de arete del rancho
  nombre            text,
  arete_siniiga     text,                          -- arete oficial (opcional)
  sexo              text not null check (sexo in ('hembra','macho')),
  raza              text,
  proposito         text check (proposito in ('leche','carne','doble','pie_de_cria')),
  fecha_nacimiento  date,
  fecha_ingreso     date not null default current_date,
  origen            text not null default 'nacido_en_rancho'
                    check (origen in ('nacido_en_rancho','comprado')),
  estado            text not null default 'activo'
                    check (estado in ('activo','vendido','muerto','descartado')),
  estado_productivo text
                    check (estado_productivo in
                      ('cria','destetado','reemplazo','engorda','servicio',
                       'gestante','lactando','seca','semental')),
  lote              text,                          -- corral / grupo
  peso_inicial      numeric(6,2) check (peso_inicial > 0),
  partos_previos    int not null default 0 check (partos_previos >= 0),  -- partos antes de usar el sistema
  id_madre          uuid references public.animales(id) on delete set null,
  id_padre          uuid references public.animales(id) on delete set null,
  nombre_madre      text,                          -- si la madre no está registrada
  nombre_padre      text,                          -- si el padre no está registrado
  id_parto          uuid,                          -- parto en que nació (FK más abajo)
  fecha_baja        date,
  motivo_baja       text,
  notas             text,
  created_at        timestamptz not null default now()
);

create unique index animales_identificador_uk on public.animales (lower(identificador));
create index animales_estado_idx on public.animales (estado);
create index animales_sexo_idx   on public.animales (sexo);
create index animales_lote_idx   on public.animales (lote);


-- ---------------------------------------------------------------------
-- 4. EMPADRES
--    Gestación de la cabra: ~150 días (se calcula con trigger).
-- ---------------------------------------------------------------------
create table public.empadres (
  id                    uuid primary key default gen_random_uuid(),
  id_hembra             uuid not null references public.animales(id) on delete cascade,
  id_macho              uuid references public.animales(id) on delete set null,
  macho_externo         text,                      -- semental o pajilla no registrados
  tipo_monta            text not null default 'monta_natural'
                        check (tipo_monta in ('monta_natural','inseminacion')),
  fecha_monta           date not null,
  fecha_parto_estimada  date,
  fecha_diagnostico     date,
  estado                text not null default 'servida'
                        check (estado in ('servida','gestante','pario','aborto','vacia')),
  fecha_parto_real      date,
  notas                 text,
  created_at            timestamptz not null default now()
);

create index empadres_hembra_idx on public.empadres (id_hembra);
create index empadres_estado_idx on public.empadres (estado);

create or replace function public.calcular_parto_estimado()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.fecha_monta is distinct from old.fecha_monta then
    new.fecha_parto_estimada := new.fecha_monta + 150;
  end if;
  return new;
end;
$$;

create trigger trg_empadres_parto_estimado
  before insert or update on public.empadres
  for each row execute function public.calcular_parto_estimado();


-- ---------------------------------------------------------------------
-- 5. PARTOS
-- ---------------------------------------------------------------------
create table public.partos (
  id               uuid primary key default gen_random_uuid(),
  id_empadre       uuid references public.empadres(id) on delete set null,
  id_madre         uuid not null references public.animales(id) on delete cascade,
  fecha_parto      date not null,
  machos           int not null default 0 check (machos >= 0),
  hembras          int not null default 0 check (hembras >= 0),
  nacidos_muertos  int not null default 0 check (nacidos_muertos >= 0),
  total_nacidos    int generated always as (machos + hembras + nacidos_muertos) stored,
  tipo_parto       text generated always as (
                     case
                       when machos + hembras + nacidos_muertos >= 4 then 'multiple'
                       when machos + hembras + nacidos_muertos  = 3 then 'triple'
                       when machos + hembras + nacidos_muertos  = 2 then 'doble'
                       else 'sencillo'
                     end) stored,
  dificultad       text not null default 'normal'
                   check (dificultad in ('normal','asistido','distocia')),
  notas            text,
  created_at       timestamptz not null default now(),
  constraint partos_con_crias check (machos + hembras + nacidos_muertos >= 1)
);

create index partos_madre_idx on public.partos (id_madre);
create index partos_fecha_idx on public.partos (fecha_parto);

alter table public.animales
  add constraint animales_id_parto_fk
  foreign key (id_parto) references public.partos(id) on delete set null;


-- ---------------------------------------------------------------------
-- 6. PESAJES (módulo "Producción": crecimiento y ganancia diaria)
-- ---------------------------------------------------------------------
create table public.pesajes (
  id            uuid primary key default gen_random_uuid(),
  id_animal     uuid not null references public.animales(id) on delete cascade,
  fecha         date not null default current_date,
  peso          numeric(6,2) not null check (peso > 0),
  tipo          text not null default 'rutina'
                check (tipo in ('nacimiento','rutina','destete','engorda','venta')),
  observaciones text,
  created_at    timestamptz not null default now(),
  constraint pesajes_uno_por_dia unique (id_animal, fecha)
);

create index pesajes_fecha_idx on public.pesajes (fecha);


-- ---------------------------------------------------------------------
-- 7. LECHE (ordeño por cabra, fecha y turno)
-- ---------------------------------------------------------------------
create table public.leche (
  id            uuid primary key default gen_random_uuid(),
  id_animal     uuid not null references public.animales(id) on delete cascade,
  fecha         date not null default current_date,
  turno         text not null default 'manana' check (turno in ('manana','tarde','unico')),
  litros        numeric(6,2) not null check (litros >= 0),
  grasa_pct     numeric(4,2) check (grasa_pct between 0 and 20),
  proteina_pct  numeric(4,2) check (proteina_pct between 0 and 20),
  destino       text not null default 'venta'
                check (destino in ('venta','consumo','crias','desecho')),
  notas         text,
  created_at    timestamptz not null default now(),
  constraint leche_un_registro_por_turno unique (id_animal, fecha, turno)
);

create index leche_fecha_idx on public.leche (fecha);


-- ---------------------------------------------------------------------
-- 8. SALUD
--    Los días de retiro marcan hasta cuándo no se debe vender/consumir
--    la leche o la carne después de un tratamiento.
-- ---------------------------------------------------------------------
create table public.salud (
  id                   uuid primary key default gen_random_uuid(),
  id_animal            uuid not null references public.animales(id) on delete cascade,
  id_usuario           uuid default auth.uid() references public.usuarios(id) on delete set null,
  fecha                date not null default current_date,
  tipo                 text not null
                       check (tipo in ('vacuna','desparasitacion','tratamiento','enfermedad','prueba','revision')),
  diagnostico          text,
  tratamiento          text,
  medicamento          text,
  dosis                text,
  via                  text check (via in ('oral','intramuscular','subcutanea','intravenosa','topica','intramamaria')),
  gravedad             text check (gravedad in ('leve','moderada','grave')),
  estado               text not null default 'cerrado' check (estado in ('abierto','cerrado')),
  dias_retiro_leche    int check (dias_retiro_leche >= 0),
  dias_retiro_carne    int check (dias_retiro_carne >= 0),
  fin_retiro_leche     date generated always as (fecha + dias_retiro_leche) stored,
  fin_retiro_carne     date generated always as (fecha + dias_retiro_carne) stored,
  proxima_fecha        date,                       -- refuerzo, revisión o siguiente dosis
  responsable          text,
  costo                numeric(10,2) check (costo >= 0),
  notas                text,
  created_at           timestamptz not null default now()
);

create index salud_animal_idx on public.salud (id_animal);
create index salud_fecha_idx  on public.salud (fecha);


-- ---------------------------------------------------------------------
-- 9. MANEJO
--    Actividades del hato: individuales (id_animal), por lote (lote)
--    o de todo el hato (ambos vacíos). Pueden quedar programadas.
-- ---------------------------------------------------------------------
create table public.manejo (
  id           uuid primary key default gen_random_uuid(),
  fecha        date not null default current_date,
  tipo         text not null
               check (tipo in ('identificacion','descorne','destete','castracion','recorte_pezunas',
                               'secado','cambio_lote','alimentacion','seleccion','limpieza','otro')),
  estado       text not null default 'realizado' check (estado in ('programado','realizado')),
  id_animal    uuid references public.animales(id) on delete cascade,
  lote         text,
  descripcion  text,
  responsable  text,
  costo        numeric(10,2) check (costo >= 0),
  notas        text,
  created_at   timestamptz not null default now()
);

create index manejo_fecha_idx  on public.manejo (fecha);
create index manejo_animal_idx on public.manejo (id_animal);


-- ---------------------------------------------------------------------
-- 10. VENTAS
-- ---------------------------------------------------------------------
create table public.ventas (
  id           uuid primary key default gen_random_uuid(),
  fecha        date not null default current_date,
  cliente      text,
  tipo         text not null check (tipo in ('carne','pie_cria','leche','otro')),
  ingreso      numeric(12,2) not null default 0 check (ingreso >= 0),
  costo        numeric(12,2) not null default 0 check (costo >= 0),
  utilidad     numeric(12,2) generated always as (ingreso - costo) stored,
  peso_vivo    numeric(8,2) check (peso_vivo > 0),     -- carne: peso en pie
  peso_canal   numeric(8,2) check (peso_canal > 0),    -- carne: peso en canal
  rendimiento  numeric(5,1) generated always as (
                 case when peso_vivo > 0 and peso_canal is not null
                      then round(peso_canal / peso_vivo * 100, 1) end) stored,
  litros       numeric(8,2) check (litros > 0),        -- leche
  notas        text,
  created_at   timestamptz not null default now()
);

create index ventas_fecha_idx on public.ventas (fecha);

create table public.venta_animales (
  id         uuid primary key default gen_random_uuid(),
  venta_id   uuid not null references public.ventas(id) on delete cascade,
  animal_id  uuid not null references public.animales(id) on delete restrict,
  precio     numeric(10,2) check (precio >= 0),
  peso       numeric(6,2) check (peso > 0),
  notas      text,
  constraint venta_animales_unico unique (venta_id, animal_id)
);

create index venta_animales_animal_idx on public.venta_animales (animal_id);


-- =====================================================================
-- AUTOMATISMOS (triggers)
-- =====================================================================

-- Valida el sexo del animal en tablas donde importa.
-- Uso: execute function exigir_sexo('columna', 'hembra', 'mensaje')
create or replace function public.exigir_sexo()
returns trigger
language plpgsql
as $$
declare
  v_id uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
  v_sexo text;
begin
  if v_id is null then
    return new;
  end if;
  select sexo into v_sexo from public.animales where id = v_id;
  if v_sexo is distinct from tg_argv[1] then
    raise exception '%', tg_argv[2];
  end if;
  return new;
end;
$$;

create trigger trg_empadre_hembra before insert or update on public.empadres
  for each row execute function public.exigir_sexo('id_hembra', 'hembra', 'El animal elegido como hembra no es una hembra');
create trigger trg_empadre_macho before insert or update on public.empadres
  for each row execute function public.exigir_sexo('id_macho', 'macho', 'El animal elegido como macho no es un macho');
create trigger trg_parto_madre before insert or update on public.partos
  for each row execute function public.exigir_sexo('id_madre', 'hembra', 'La madre debe ser una hembra');
create trigger trg_leche_hembra before insert or update on public.leche
  for each row execute function public.exigir_sexo('id_animal', 'hembra', 'Solo las hembras tienen registros de leche');

-- Al registrar un parto: cierra el empadre y deja a la madre como "lactando".
create or replace function public.al_registrar_parto()
returns trigger
language plpgsql
as $$
begin
  if new.id_empadre is not null then
    update public.empadres
       set estado = 'pario', fecha_parto_real = new.fecha_parto
     where id = new.id_empadre;
  end if;

  update public.animales
     set estado_productivo = 'lactando'
   where id = new.id_madre and estado = 'activo';

  return new;
end;
$$;

create trigger trg_parto_insert after insert on public.partos
  for each row execute function public.al_registrar_parto();

-- Al borrar un parto: el empadre vuelve a "gestante" si no tiene otros partos.
create or replace function public.al_borrar_parto()
returns trigger
language plpgsql
as $$
begin
  if old.id_empadre is not null
     and not exists (select 1 from public.partos where id_empadre = old.id_empadre and id <> old.id) then
    update public.empadres
       set estado = 'gestante', fecha_parto_real = null
     where id = old.id_empadre and estado = 'pario';
  end if;
  return old;
end;
$$;

create trigger trg_parto_delete after delete on public.partos
  for each row execute function public.al_borrar_parto();

-- Venta de un animal: lo marca como vendido (y lo reactiva si se quita de la venta).
create or replace function public.al_vender_animal()
returns trigger
language plpgsql
as $$
begin
  update public.animales
     set estado = 'vendido',
         fecha_baja = (select fecha from public.ventas where id = new.venta_id),
         motivo_baja = 'venta'
   where id = new.animal_id;
  return new;
end;
$$;

create trigger trg_venta_animal_insert after insert on public.venta_animales
  for each row execute function public.al_vender_animal();

create or replace function public.al_quitar_animal_de_venta()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.venta_animales where animal_id = old.animal_id and id <> old.id) then
    update public.animales
       set estado = 'activo', fecha_baja = null, motivo_baja = null
     where id = old.animal_id and estado = 'vendido';
  end if;
  return old;
end;
$$;

create trigger trg_venta_animal_delete after delete on public.venta_animales
  for each row execute function public.al_quitar_animal_de_venta();

-- Manejo realizado: destete, secado y cambio de lote actualizan al animal.
create or replace function public.al_aplicar_manejo()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'realizado'
     and new.id_animal is not null
     and (tg_op = 'INSERT' or old.estado is distinct from 'realizado') then

    if new.tipo = 'destete' then
      update public.animales set estado_productivo = 'destetado' where id = new.id_animal;
    elsif new.tipo = 'secado' then
      update public.animales set estado_productivo = 'seca' where id = new.id_animal;
    elsif new.tipo = 'cambio_lote' and new.lote is not null then
      update public.animales set lote = new.lote where id = new.id_animal;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_manejo_aplicar after insert or update on public.manejo
  for each row execute function public.al_aplicar_manejo();


-- =====================================================================
-- VISTAS (la app las usa para tablas y filtros)
--   security_invoker = true → respetan las políticas RLS de las tablas.
-- =====================================================================

create or replace view public.v_animales with (security_invoker = true) as
select
  a.*,
  a.partos_previos + coalesce(pt.n, 0)                       as numero_partos,
  pt.ultimo                                                  as ultimo_parto,
  pn.tipo_parto                                              as tipo_nacimiento,
  up.peso                                                    as ultimo_peso,
  up.fecha                                                   as fecha_ultimo_peso,
  (em.id is not null)                                        as gestante,
  em.fecha_parto_estimada                                    as parto_estimado,
  coalesce(l.litros, 0)                                      as litros_30d,
  case when a.fecha_nacimiento is null then null
       else (extract(year  from age(current_date, a.fecha_nacimiento)) * 12
           + extract(month from age(current_date, a.fecha_nacimiento)))::int
  end                                                        as edad_meses
from public.animales a
left join lateral (
  select count(*)::int as n, max(fecha_parto) as ultimo
    from public.partos where id_madre = a.id
) pt on true
left join public.partos pn on pn.id = a.id_parto
left join lateral (
  select peso, fecha from public.pesajes
   where id_animal = a.id order by fecha desc limit 1
) up on true
left join lateral (
  select id, fecha_parto_estimada from public.empadres
   where id_hembra = a.id and estado in ('servida','gestante')
   order by fecha_monta desc limit 1
) em on true
left join lateral (
  select sum(litros) as litros from public.leche
   where id_animal = a.id and fecha >= current_date - 30
) l on true;

create or replace view public.v_pesajes with (security_invoker = true) as
select
  p.*,
  lag(p.peso)  over w as peso_anterior,
  lag(p.fecha) over w as fecha_anterior,
  p.fecha - lag(p.fecha) over w as dias,
  case when lag(p.fecha) over w is not null and p.fecha > lag(p.fecha) over w
       then round(((p.peso - lag(p.peso) over w) * 1000 / (p.fecha - lag(p.fecha) over w))::numeric, 0)
  end as gdp_g                                      -- ganancia diaria de peso, en gramos
from public.pesajes p
window w as (partition by p.id_animal order by p.fecha);


-- =====================================================================
-- SEGURIDAD (Row Level Security)
--   Solo usuarios con sesión iniciada pueden leer o escribir.
--   Sin sesión (anon) no se ve nada, aunque la anon key sea pública.
-- =====================================================================

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.usuarios       enable row level security;
alter table public.razas          enable row level security;
alter table public.animales       enable row level security;
alter table public.empadres       enable row level security;
alter table public.partos         enable row level security;
alter table public.pesajes        enable row level security;
alter table public.leche          enable row level security;
alter table public.salud          enable row level security;
alter table public.manejo         enable row level security;
alter table public.ventas         enable row level security;
alter table public.venta_animales enable row level security;

create policy "usuarios: ver todos"      on public.usuarios for select to authenticated using (true);
create policy "usuarios: editar el suyo" on public.usuarios for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Cada usuario puede cambiar solo su nombre y teléfono (no su rol).
revoke update on public.usuarios from authenticated;
grant  update (nombre, telefono) on public.usuarios to authenticated;

create policy "autenticados" on public.razas          for all to authenticated using (true) with check (true);
create policy "autenticados" on public.animales       for all to authenticated using (true) with check (true);
create policy "autenticados" on public.empadres       for all to authenticated using (true) with check (true);
create policy "autenticados" on public.partos         for all to authenticated using (true) with check (true);
create policy "autenticados" on public.pesajes        for all to authenticated using (true) with check (true);
create policy "autenticados" on public.leche          for all to authenticated using (true) with check (true);
create policy "autenticados" on public.salud          for all to authenticated using (true) with check (true);
create policy "autenticados" on public.manejo         for all to authenticated using (true) with check (true);
create policy "autenticados" on public.ventas         for all to authenticated using (true) with check (true);
create policy "autenticados" on public.venta_animales for all to authenticated using (true) with check (true);


-- =====================================================================
-- TIEMPO REAL (Supabase Realtime)
-- =====================================================================
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['razas','animales','empadres','partos','pesajes',
                             'leche','salud','manejo','ventas','venta_animales']
    loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then
        null;   -- ya estaba agregada
      end;
    end loop;
  end if;
end;
$$;

select 'Base de datos del rancho caprino lista' as resultado;
