# Rancho Caprino — Sistema de gestión

Sistema web para llevar un rancho caprino: hato, empadre, partos, producción (peso), leche, salud, manejo y ventas, con dashboard y filtros en cada sección. Usa Supabase (base de datos, usuarios y tiempo real) y se puede publicar gratis en GitHub Pages.

## Puesta en marcha

1. **Crea un proyecto nuevo en [supabase.com](https://supabase.com).** No uses el del rancho ovino: este sistema tiene su propia base de datos.
2. En **SQL Editor → New query**, pega todo `database/schema.sql` y presiona **Run**.
   *(Opcional)* Para probar con datos de ejemplo, ejecuta después `database/datos_demo.sql`. Al final del archivo está el bloque para borrarlos.
3. En **Settings → API** copia la *Project URL* y la *anon public key* y pégalas en `js/config.js`.
4. Abre `index.html` (o súbelo a GitHub Pages), crea tu cuenta y listo.

> Si Supabase te pide confirmar el correo al registrarte, puedes desactivarlo en *Authentication → Providers → Email → Confirm email*.

## Secciones

| Sección | Qué hace |
|---|---|
| **Dashboard** | Indicadores del hato, leche por día, gestantes, partos, ventas y salud; gráficas por periodo (30 días a todo) y listas de próximos partos, actividades pendientes y retiros. |
| **Animales** | Inventario con genealogía, categoría, lote, peso y producción. Ficha individual con todo su historial. |
| **Empadre** | Montas e inseminaciones. Fecha probable de parto a los 150 días, confirmación de gestación y acceso directo a registrar el parto. |
| **Partos** | Partos con machos, hembras y nacidos muertos; da de alta a las crías en el mismo paso. Prolificidad, mortalidad e intervalo entre partos. |
| **Producción** | Control de peso y ganancia diaria (GDP). Pesaje por lote para capturar varios animales a la vez. |
| **Leche** | Litros por cabra, turno y destino; grasa y proteína opcionales. Captura de ordeño de todas las cabras en una sola pantalla y gráfica diaria. |
| **Salud** | Vacunas, desparasitaciones, enfermedades, tratamientos y pruebas. Se aplican a varios animales a la vez. Días de retiro de leche y carne. |
| **Manejo** | Descorne, destete, secado, cambio de lote, recorte de pezuñas, etc. Por animal, por lote o de todo el hato; realizadas o programadas. |
| **Ventas** | Carne (con rendimiento en canal), pie de cría, leche y otros. Ingreso, costo y utilidad. |

Todas las secciones tienen **filtros** (búsqueda, catálogos, rangos de fecha y de números, casillas rápidas), **resumen de lo filtrado**, orden por columna, paginación y **exportación a CSV** de lo que estás viendo.

## Automatismos de la base de datos

- Al registrar un **empadre**, la fecha probable de parto se calcula sola (monta + 150 días).
- Al registrar un **parto**, el empadre pasa a "Parió" y la madre a "Lactando".
- Al registrar una **venta de animales**, quedan como "Vendido"; si borras la venta, vuelven a "Activo".
- Un **manejo** realizado actualiza al animal: *destete* → "Destetado", *secado* → "Seca", *cambio de lote* → nuevo lote.
- Los **días de retiro** de un tratamiento marcan hasta cuándo la leche y la carne no son aptas; la captura de ordeño guarda esa leche como "Desecho".
- No se puede registrar leche a un macho, ni un empadre con un macho como hembra (o al revés).

## Seguridad

- Solo usuarios con sesión iniciada pueden leer o escribir datos (Row Level Security). La *anon key* de `config.js` es pública por diseño; sin sesión no da acceso a nada.
- Cualquiera que sepa la dirección de tu sitio puede crear una cuenta. Cuando ya hayan registrado a su equipo, desactiva el registro público en *Authentication → Sign In / Providers → Allow new users to sign up*.
- Para hacer administrador a un usuario: `update public.usuarios set rol = 'admin' where id = '...';`

## Estructura

```
index.html            Pantallas base
css/                  base (diseño y estructura), components, auth
js/config.js          URL y clave de Supabase
js/tablekit.js        Motor de filtros, tablas, orden y CSV (lo usan todas las secciones)
js/ui.js              Formularios, ventanas y captura rápida
js/animales.js …      Una sección por archivo (empadre, partos, produccion, leche, salud, manejo, ventas)
js/dashboard.js       Indicadores y gráficas
database/schema.sql   Base de datos completa para Supabase
database/datos_demo.sql   Datos de ejemplo (opcional)
```

Para agregar un filtro a una sección, basta con añadir una línea en su arreglo `filtros`.
