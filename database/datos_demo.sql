-- =====================================================================
--  RANCHO CAPRINO — Datos de DEMOSTRACIÓN (opcional)
-- =====================================================================
--  Úsalo solo para probar la app con información de ejemplo.
--  Ejecuta primero schema.sql y luego este archivo en el SQL Editor.
--
--  Para borrar todo lo de demostración al terminar, ejecuta el bloque
--  "LIMPIEZA" que está al final de este archivo.
--  Todo lo de demostración lleva la marca [DEMO] en notas o cliente.
-- =====================================================================

do $$
declare
  hoy date := current_date;
  m1 uuid; m2 uuid;
  c record;
  k uuid;
  p uuid;
  e uuid;
  i int;
  d date;
  base numeric;
begin
  perform setseed(0.42);

  -- ---------------- Sementales ----------------
  insert into animales (identificador, nombre, sexo, raza, proposito, fecha_nacimiento, estado_productivo, lote, origen, peso_inicial, notas)
  values ('M-001','Rocky','macho','Boer','pie_de_cria', hoy - 1300,'semental','Sementales','comprado', 4.2,'[DEMO]')
  returning id into m1;
  insert into animales (identificador, nombre, sexo, raza, proposito, fecha_nacimiento, estado_productivo, lote, origen, peso_inicial, notas)
  values ('M-002','Torreón','macho','Saanen','leche', hoy - 1000,'semental','Sementales','nacido_en_rancho', 4.0,'[DEMO]')
  returning id into m2;

  -- ---------------- Hembras adultas ----------------
  insert into animales (identificador, nombre, sexo, raza, proposito, fecha_nacimiento, estado_productivo, lote, origen, partos_previos, notas) values
    ('C-001','Luna',    'hembra','Saanen',         'leche', hoy - 1600,'lactando','Producción','nacido_en_rancho',3,'[DEMO]'),
    ('C-002','Canela',  'hembra','Alpina Francesa','leche', hoy - 1450,'lactando','Producción','nacido_en_rancho',2,'[DEMO]'),
    ('C-003','Estrella','hembra','Toggenburg',     'leche', hoy - 1300,'lactando','Producción','comprado',        2,'[DEMO]'),
    ('C-004','Pinta',   'hembra','Nubia',          'doble', hoy - 1250,'lactando','Producción','nacido_en_rancho',1,'[DEMO]'),
    ('C-005','Blanca',  'hembra','Saanen',         'leche', hoy - 1500,'lactando','Gestantes', 'nacido_en_rancho',3,'[DEMO]'),
    ('C-006','Lola',    'hembra','LaMancha',       'leche', hoy - 1100,'lactando','Producción','comprado',        1,'[DEMO]'),
    ('C-007','Mora',    'hembra','Criolla',        'doble', hoy - 1400,'servicio','Servicio',  'nacido_en_rancho',2,'[DEMO]'),
    ('C-008','Tinta',   'hembra','Cruza',          'carne', hoy - 1200,'servicio','Servicio',  'nacido_en_rancho',1,'[DEMO]'),
    ('C-009','Paloma',  'hembra','Alpina Francesa','leche', hoy - 1350,'lactando','Producción','nacido_en_rancho',2,'[DEMO]'),
    ('C-010','Chata',   'hembra','Nubia',          'doble', hoy - 1700,'seca',    'Secas',     'nacido_en_rancho',4,'[DEMO]'),
    ('C-011','Fresa',   'hembra','Boer',           'carne', hoy - 1150,'seca',    'Secas',     'comprado',        1,'[DEMO]'),
    ('C-012','Nube',    'hembra','Saanen',         'leche', hoy - 1050,'lactando','Producción','nacido_en_rancho',1,'[DEMO]');

  -- ---------------- Reemplazos ----------------
  insert into animales (identificador, nombre, sexo, raza, proposito, fecha_nacimiento, estado_productivo, lote, origen, peso_inicial, notas) values
    ('R-101','Gota',  'hembra','Saanen','leche', hoy - 250,'reemplazo','Reemplazos','nacido_en_rancho',3.6,'[DEMO]'),
    ('R-102','Perla', 'hembra','Alpina Francesa','leche', hoy - 235,'reemplazo','Reemplazos','nacido_en_rancho',3.4,'[DEMO]'),
    ('R-103','Miel',  'hembra','Toggenburg','leche', hoy - 220,'reemplazo','Reemplazos','nacido_en_rancho',3.5,'[DEMO]');

  -- ---------------- Partos antiguos (con empadre) y crías ----------------
  -- Luna (C-001): parió hace 160 días, gemelos
  -- Canela (C-002): parió hace 70 días, doble
  -- Pinta (C-004): parió hace 55 días, sencillo
  -- Lola (C-006): parió hace 40 días, triple
  for c in
    select * from (values
      ('C-001', m2, 160, 1, 1, 0, 'normal'),
      ('C-002', m1,  70, 1, 1, 0, 'normal'),
      ('C-004', m1,  55, 0, 1, 0, 'asistido'),
      ('C-006', m2,  40, 2, 1, 1, 'normal')
    ) as t(madre, padre, dias, machos, hembras, muertos, dif)
  loop
    insert into empadres (id_hembra, id_macho, fecha_monta, estado, fecha_diagnostico, notas)
    select a.id, c.padre, hoy - c.dias - 150, 'servida', hoy - c.dias - 100, '[DEMO]'
      from animales a where a.identificador = c.madre
    returning id into e;

    insert into partos (id_empadre, id_madre, fecha_parto, machos, hembras, nacidos_muertos, dificultad, notas)
    select e, a.id, hoy - c.dias, c.machos, c.hembras, c.muertos, c.dif, '[DEMO]'
      from animales a where a.identificador = c.madre
    returning id into p;

    for i in 1 .. (c.machos + c.hembras) loop
      insert into animales (identificador, nombre, sexo, raza, proposito, fecha_nacimiento, estado_productivo, lote,
                            origen, peso_inicial, id_madre, id_padre, id_parto, notas)
      select 'K-' || right(c.madre, 2) || chr(64 + i),
             null,
             case when i <= c.machos then 'macho' else 'hembra' end,
             a.raza,
             case when i <= c.machos then 'carne' else 'leche' end,
             hoy - c.dias,
             case when c.dias > 90 then 'destetado' else 'cria' end,
             'Crías',
             'nacido_en_rancho',
             3.1 + i * 0.2,
             a.id, c.padre, p, '[DEMO]'
        from animales a where a.identificador = c.madre
      returning id into k;

      insert into pesajes (id_animal, fecha, peso, tipo, observaciones)
      values (k, hoy - c.dias, 3.1 + i * 0.2, 'nacimiento', '[DEMO]');
      insert into pesajes (id_animal, fecha, peso, tipo, observaciones)
      values (k, hoy - c.dias + 30, 8.5 + i * 0.4, 'rutina', '[DEMO]');
      if c.dias > 60 then
        insert into pesajes (id_animal, fecha, peso, tipo, observaciones)
        values (k, hoy - c.dias + 60, 15.2 + i * 0.6, 'destete', '[DEMO]');
      end if;
    end loop;
  end loop;

  -- Los empadres de esos partos quedaron en "pario" por el trigger.

  -- ---------------- Empadres vigentes ----------------
  insert into empadres (id_hembra, id_macho, tipo_monta, fecha_monta, fecha_diagnostico, estado, notas)
  select a.id, m1, 'monta_natural', hoy - 20, null, 'servida', '[DEMO]' from animales a where a.identificador = 'C-003';
  insert into empadres (id_hembra, id_macho, tipo_monta, fecha_monta, fecha_diagnostico, estado, notas)
  select a.id, m2, 'inseminacion', hoy - 95, hoy - 45, 'gestante', '[DEMO]' from animales a where a.identificador = 'C-009';
  insert into empadres (id_hembra, id_macho, tipo_monta, fecha_monta, fecha_diagnostico, estado, notas)
  select a.id, m2, 'monta_natural', hoy - 135, hoy - 85, 'gestante', '[DEMO] Parto próximo' from animales a where a.identificador = 'C-005';
  insert into empadres (id_hembra, id_macho, tipo_monta, fecha_monta, fecha_diagnostico, estado, notas)
  select a.id, m1, 'monta_natural', hoy - 120, hoy - 70, 'gestante', '[DEMO]' from animales a where a.identificador = 'C-012';
  insert into empadres (id_hembra, id_macho, tipo_monta, fecha_monta, fecha_diagnostico, estado, notas)
  select a.id, m1, 'monta_natural', hoy - 90, hoy - 40, 'vacia', '[DEMO] Diagnóstico negativo' from animales a where a.identificador = 'C-007';
  insert into empadres (id_hembra, id_macho, tipo_monta, fecha_monta, fecha_diagnostico, estado, notas)
  select a.id, null::uuid, 'inseminacion', hoy - 75, hoy - 30, 'aborto', '[DEMO] Aborto a los 105 días' from animales a where a.identificador = 'C-008';
  update empadres set macho_externo = 'Pajilla Boer importada' where macho_externo is null and id_macho is null and notas like '[DEMO]%';

  -- ---------------- Leche (últimos 75 días) ----------------
  for c in select id, identificador from animales
            where identificador in ('C-001','C-002','C-003','C-004','C-006','C-009','C-012','C-005') and notas = '[DEMO]'
  loop
    base := case c.identificador
              when 'C-001' then 2.1 when 'C-002' then 2.6 when 'C-003' then 1.9 when 'C-004' then 1.4
              when 'C-006' then 2.3 when 'C-009' then 2.0 when 'C-012' then 1.7 else 2.4 end;
    for i in 0 .. 74 loop
      d := hoy - i;
      insert into leche (id_animal, fecha, turno, litros, grasa_pct, proteina_pct, destino)
      values (c.id, d, 'manana', round((base * (0.92 + random() * 0.18))::numeric, 2),
              round((3.2 + random() * 1.1)::numeric, 2), round((2.8 + random() * 0.5)::numeric, 2),
              case when random() < 0.12 then 'consumo' else 'venta' end);
      insert into leche (id_animal, fecha, turno, litros, destino)
      values (c.id, d, 'tarde', round((base * 0.8 * (0.9 + random() * 0.2))::numeric, 2), 'venta');
    end loop;
  end loop;

  -- ---------------- Pesajes de reemplazos y adultos ----------------
  insert into pesajes (id_animal, fecha, peso, tipo, observaciones)
  select a.id, hoy - 90, 22 + (row_number() over (order by a.identificador)) * 0.8, 'rutina', '[DEMO]'
    from animales a where a.identificador like 'R-1%';
  insert into pesajes (id_animal, fecha, peso, tipo, observaciones)
  select a.id, hoy - 30, 28.5 + (row_number() over (order by a.identificador)) * 1.1, 'rutina', '[DEMO]'
    from animales a where a.identificador like 'R-1%';
  insert into pesajes (id_animal, fecha, peso, tipo, observaciones)
  select a.id, hoy - 2, 31.2 + (row_number() over (order by a.identificador)) * 1.2, 'rutina', '[DEMO]'
    from animales a where a.identificador like 'R-1%';
  insert into pesajes (id_animal, fecha, peso, tipo, observaciones)
  select a.id, hoy - 20, 52 + (row_number() over (order by a.identificador)) * 2.5, 'rutina', '[DEMO]'
    from animales a where a.identificador in ('C-001','C-002','C-003','C-005','C-009');
  insert into pesajes (id_animal, fecha, peso, tipo, observaciones)
  select a.id, hoy - 3, 53.5 + (row_number() over (order by a.identificador)) * 2.4, 'rutina', '[DEMO]'
    from animales a where a.identificador in ('C-001','C-002','C-003','C-005','C-009');

  -- ---------------- Salud ----------------
  -- Vacunación general reciente (con refuerzo programado)
  insert into salud (id_animal, fecha, tipo, medicamento, dosis, via, estado, proxima_fecha, responsable, costo, notas)
  select a.id, hoy - 20, 'vacuna', 'Bacterina triple (clostridiosis)', '2 ml', 'subcutanea', 'cerrado',
         hoy + 10 + (row_number() over (order by a.identificador))::int % 3 * 5, 'MVZ Ramírez', 18.50, '[DEMO]'
    from animales a where a.estado = 'activo' and a.notas = '[DEMO]' and a.identificador like 'C-%';
  -- Desparasitación
  insert into salud (id_animal, fecha, tipo, medicamento, dosis, via, estado, dias_retiro_leche, dias_retiro_carne, responsable, costo, notas)
  select a.id, hoy - 45, 'desparasitacion', 'Ivermectina 1%', '1 ml / 50 kg', 'subcutanea', 'cerrado', 0, 28, 'MVZ Ramírez', 22, '[DEMO]'
    from animales a where a.notas = '[DEMO]' and a.identificador in ('C-001','C-002','C-003','C-004','C-005','C-006');
  -- Mastitis abierta (retiro de leche vigente)
  insert into salud (id_animal, fecha, tipo, diagnostico, tratamiento, medicamento, dosis, via, gravedad, estado,
                     dias_retiro_leche, dias_retiro_carne, proxima_fecha, responsable, costo, notas)
  select a.id, hoy - 2, 'enfermedad', 'Mastitis clínica en ubre derecha',
         'Antibiótico intramamario por 3 días y masaje con compresas tibias', 'Cefalexina intramamaria', '1 jeringa cada 12 h',
         'intramamaria', 'moderada', 'abierto', 6, 14, hoy + 2, 'MVZ Ramírez', 260, '[DEMO]'
    from animales a where a.identificador = 'C-003';
  -- Cojera resuelta
  insert into salud (id_animal, fecha, tipo, diagnostico, tratamiento, gravedad, estado, responsable, costo, notas)
  select a.id, hoy - 35, 'enfermedad', 'Cojera por pietín', 'Recorte, limpieza y spray cicatrizante', 'leve', 'cerrado', 'Encargado', 60, '[DEMO]'
    from animales a where a.identificador = 'C-009';
  -- Diarrea en cría (abierto)
  insert into salud (id_animal, fecha, tipo, diagnostico, tratamiento, medicamento, dosis, via, gravedad, estado, dias_retiro_carne, proxima_fecha, responsable, costo, notas)
  select a.id, hoy - 1, 'tratamiento', 'Diarrea por coccidiosis', 'Sulfa oral y rehidratación', 'Toltrazuril', '1 ml', 'oral', 'moderada', 'abierto', 21, hoy + 3, 'MVZ Ramírez', 95, '[DEMO]'
    from animales a where a.identificador = 'K-06A';
  -- Pruebas de campaña
  insert into salud (id_animal, fecha, tipo, diagnostico, estado, proxima_fecha, responsable, costo, notas)
  select a.id, hoy - 60, 'prueba', 'Prueba de brucelosis: negativo', 'cerrado', hoy + 305, 'SENASICA', 0, '[DEMO]'
    from animales a where a.notas = '[DEMO]' and a.identificador in ('M-001','M-002','C-001','C-005');
  -- Revisión de preñez
  insert into salud (id_animal, fecha, tipo, diagnostico, estado, responsable, costo, notas)
  select a.id, hoy - 45, 'revision', 'Ultrasonido: gestación confirmada', 'cerrado', 'MVZ Ramírez', 120, '[DEMO]'
    from animales a where a.identificador = 'C-009';

  -- ---------------- Manejo ----------------
  insert into manejo (fecha, tipo, estado, id_animal, descripcion, responsable, costo, notas)
  select hoy - 50, 'descorne', 'realizado', a.id, 'Descorne térmico a los 10 días', 'Encargado', 15, '[DEMO]'
    from animales a where a.identificador in ('K-01A','K-01B','K-04A');
  insert into manejo (fecha, tipo, estado, id_animal, descripcion, responsable, notas)
  select hoy - 5, 'destete', 'realizado', a.id, 'Destete a los 65 días', 'Encargado', '[DEMO]'
    from animales a where a.identificador in ('K-01A');
  insert into manejo (fecha, tipo, estado, lote, descripcion, responsable, costo, notas)
  values (hoy + 5,  'recorte_pezunas', 'programado', 'Producción', 'Recorte de pezuñas de todo el lote', 'Encargado', 0, '[DEMO]'),
         (hoy - 3,  'limpieza',        'programado', 'Crías',      'Cambio de cama y desinfección del corral', 'Encargado', 150, '[DEMO]'),
         (hoy - 12, 'alimentacion',    'realizado',  'Producción', 'Cambio a ración con 18% de proteína', 'Encargado', 2400, '[DEMO]'),
         (hoy + 15, 'seleccion',       'programado', null,         'Revisión general de descartes del hato', 'MVZ Ramírez', 0, '[DEMO]');
  insert into manejo (fecha, tipo, estado, id_animal, descripcion, responsable, notas)
  select hoy + 8, 'secado', 'programado', a.id, 'Secar 60 días antes del parto', 'Encargado', '[DEMO]'
    from animales a where a.identificador = 'C-005';
  insert into manejo (fecha, tipo, estado, id_animal, lote, descripcion, responsable, notas)
  select hoy - 20, 'cambio_lote', 'realizado', a.id, 'Gestantes', 'Pasa a corral de gestantes', 'Encargado', '[DEMO]'
    from animales a where a.identificador = 'C-005';

  -- ---------------- Ventas ----------------
  -- Cabritos de engorda vendidos (carne)
  insert into animales (identificador, sexo, raza, proposito, fecha_nacimiento, estado_productivo, lote, origen, peso_inicial, notas)
  values ('V-301','macho','Boer','carne', hoy - 200,'engorda','Engorda','nacido_en_rancho',3.8,'[DEMO]'),
         ('V-302','macho','Boer','carne', hoy - 205,'engorda','Engorda','nacido_en_rancho',3.5,'[DEMO]'),
         ('V-303','macho','Nubia','carne', hoy - 190,'engorda','Engorda','nacido_en_rancho',3.9,'[DEMO]'),
         ('V-304','hembra','Criolla','pie_de_cria', hoy - 300,'reemplazo','Reemplazos','nacido_en_rancho',3.3,'[DEMO]');

  with v as (
    insert into ventas (fecha, cliente, tipo, ingreso, costo, peso_vivo, peso_canal, notas)
    values (hoy - 18, 'Carnicería El Corral [DEMO]', 'carne', 5200, 1400, 52, 26, '[DEMO] Dos cabritos')
    returning id)
  insert into venta_animales (venta_id, animal_id, precio, peso)
  select v.id, a.id, 2600, 26 from v, animales a where a.identificador in ('V-301','V-302');

  with v as (
    insert into ventas (fecha, cliente, tipo, ingreso, costo, peso_vivo, peso_canal, notas)
    values (hoy - 6, 'Restaurante La Cabaña [DEMO]', 'carne', 2900, 650, 28, 14.5, '[DEMO]')
    returning id)
  insert into venta_animales (venta_id, animal_id, precio, peso)
  select v.id, a.id, 2900, 28 from v, animales a where a.identificador = 'V-303';

  with v as (
    insert into ventas (fecha, cliente, tipo, ingreso, costo, notas)
    values (hoy - 40, 'Rancho Los Álamos [DEMO]', 'pie_cria', 6500, 300, '[DEMO] Hembra de reemplazo')
    returning id)
  insert into venta_animales (venta_id, animal_id, precio)
  select v.id, a.id, 6500 from v, animales a where a.identificador = 'V-304';

  -- Venta semanal de leche
  insert into ventas (fecha, cliente, tipo, ingreso, costo, litros, notas)
  select hoy - (w * 7), 'Quesería La Esperanza [DEMO]', 'leche',
         round((52 + random() * 14)::numeric, 0) * 18, 180, round((52 + random() * 14)::numeric, 0), '[DEMO]'
    from generate_series(0, 9) w;
  update ventas set ingreso = litros * 18 where notas = '[DEMO]' and tipo = 'leche';

  insert into ventas (fecha, cliente, tipo, ingreso, costo, notas)
  values (hoy - 25, 'Vivero San José [DEMO]', 'otro', 800, 0, '[DEMO] Venta de estiércol');
end;
$$;

select
  (select count(*) from animales where notas like '[DEMO]%') as animales,
  (select count(*) from leche) as registros_leche,
  (select count(*) from partos) as partos,
  (select count(*) from ventas where notas like '[DEMO]%') as ventas;


-- =====================================================================
--  LIMPIEZA — quita los datos de demostración
--  (quita el "--" de las líneas siguientes y ejecútalas)
-- =====================================================================
-- delete from ventas where notas like '[DEMO]%';
-- delete from manejo  where notas like '[DEMO]%';
-- delete from animales where notas like '[DEMO]%';   -- borra también sus partos, empadres, pesajes, leche y salud
