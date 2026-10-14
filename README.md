# GASTOSACK

App web (PWA, mobile-first) para registrar los gastos de empresa de ACK Logic y generar cada mes la hoja de liquidación en Excel y un Word con los tickets.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres + Auth + Storage) · Vercel.

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Clientes + km desde ACK Logic, Ajustes, login | ✅ |
| 2 | Gastos con foto del ticket | ✅ |
| 3 | Cierre de mes y exportar Excel (plantilla `templates/Gastos_Marzo.xlsx`) | ✅ |
| 4 | Exportar Word con los tickets | ⏳ |
| 5 | PWA y pulido | ⏳ |

## Coste

Todo funciona con planes gratuitos y sin tarjeta: Supabase *Free*, Vercel *Hobby* y OpenRouteService *Standard*.

## Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Conexión |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → *Publishable key* (`sb_publishable_…`) | Conexión (pública: los datos los protege RLS). También vale la antigua *anon key* en `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `OPENROUTESERVICE_API_KEY` | <https://openrouteservice.org/dev> (gratis, sin tarjeta) | Km ida y vuelta a cada cliente. Opcional: sin ella, los km se escriben a mano |

Las variables sin `NEXT_PUBLIC_` solo se usan en el servidor y nunca llegan al navegador.
No hace falta la *service role key*: la app trabaja siempre con la sesión del usuario.

## Puesta en marcha

### 1. Supabase

1. <https://supabase.com> → **New project** (`gastosack`, región *West EU* o *Central EU*, plan Free).
2. **Authentication → Sign In / Providers**: desactiva **Allow new users to sign up**.
3. **Authentication → Users → Add user → Create new user**: tu email y contraseña, marcando *Auto Confirm User*.
4. Crea las tablas, la seguridad y el bucket de fotos: **SQL Editor → New query**, pega el contenido de [`supabase/setup.sql`](supabase/setup.sql) y pulsa **Run** (una sola vez).

   Alternativa desde tu ordenador: `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push`.

### 2. OpenRouteService (km, gratis)

1. <https://openrouteservice.org/dev/#/signup> → crea la cuenta (no pide tarjeta).
2. **Dashboard → Tokens → Create token** (tipo *Standard*) y cópialo en `OPENROUTESERVICE_API_KEY`.
3. El plan gratuito permite 2.000 rutas al día; la app solo calcula al crear un cliente o al pulsar *Recalcular*.

### 3. Vercel

1. <https://vercel.com> → **Add New… → Project** → importa `gastosack`.
2. Pega las variables de entorno de la tabla de arriba → **Deploy**.

Cada push a `main` se publica solo. Si cambia el esquema, vuelve a ejecutar `npx supabase db push` (o pega en el SQL Editor la migración nueva).

### 4. Primer uso

Entra con el usuario del paso 1.3 → **Ajustes**: comprueba tu nombre, la dirección de origen (por defecto Carrer dels Argenters 2, Cerdanyola del Vallès) y la tarifa €/km → **Clientes**: da de alta los clientes (los km se calculan solos).

## Cómo se registra un gasto

1. **Nuevo gasto** → *Hacer foto del ticket* (abre la cámara) o *Elegir imagen o PDF*.
2. La foto se reduce a 1600 px en el móvil y se sube a Supabase Storage (carpeta privada del usuario). De los PDF se guarda el original y una imagen de la 1.ª página para el Word.
3. Rellenas los datos del ticket (fecha, tipo, cliente, proyecto, importe…) y lo guardas.
   - Al elegir el cliente se rellenan Lloc y el último proyecto usado con él.
   - Si el cliente tiene km, puedes añadir el desplazamiento de ese día en el mismo paso (no se duplica si ya existe).
   - La fecha tiene que caer en el mes en el que estás; si el ticket es de otro mes, la app te ofrece guardarlo allí.
4. *Solo kilometraje*: para días sin ticket. Los km salen del cliente y se pueden cambiar; importe = km × €/km.

## Cierre de mes y Excel

**Cierre** (o el botón *Cierre* de Inicio): anticipos (*Bestretes a compte*, hasta 4 con fecha e importe), *Hores imputades ITM* y *Control horari*. **Guardar y descargar Excel** genera `Gastos_<Mes>_<Any>.xlsx` a partir de `templates/Gastos_Marzo.xlsx`:

- B3 empresa, B4 nombre, K4 mes en catalán, M4 año.
- Filas 9–39 = días 1–31: A día · B cliente · C proyecto · D lloc · E km · F €/km · G `=F*E` · H–L Autopistes/Dietes/Allotjaments/Bitllets/Altres · M total del día.
- Varios tickets de la misma columna un mismo día → fórmula suma (`=12.82+2+6.5`); varios km → `=40+12.5`; varios clientes → unidos con ` / `.
- Días que no existen en el mes: fila vacía. Las celdas P8:Q13 (cálculos antiguos) se vacían.
- Anticipos en A44:B47; M42/M43 `si`/`no`; M44–M46 conservan sus fórmulas y Excel lo recalcula todo al abrir.

Para cambiar el formato basta con sustituir `templates/Gastos_Marzo.xlsx` (mismas posiciones de celdas).

Los km se multiplican sin redondear en el Excel (`=F*E`, como en la plantilla); en la app cada desplazamiento se redondea al céntimo, así que el total puede diferir como mucho en algún céntimo.

## Desarrollo

Requiere Docker para el Supabase local.

```bash
npm install
npx supabase start            # Supabase local (aplica las migraciones)
cp .env.example .env.local    # pon la URL y la clave publishable que muestra el comando anterior
npm run dev                   # http://localhost:3000
npm test                      # tests de lógica y del Excel (compara con la plantilla; con LibreOffice instalado también recalcula los totales)
npm run typecheck && npm run lint
npm run db:types              # regenerar tipos tras cambiar el esquema
```

Test de seguridad (RLS) contra el Supabase local, con los usuarios `hector@test.local` y `otro@test.local` (contraseña `test12345`):

```bash
SUPABASE_TEST_URL=http://127.0.0.1:54321 SUPABASE_TEST_ANON_KEY=<anon key> npm test
```

## Notas

- Importes en céntimos (enteros); km con un decimal; tarifa con tres decimales.
- Cada gasto de km guarda la tarifa del momento: cambiarla en Ajustes no altera meses ya registrados.
- Los clientes con gastos no se borran: se archivan.
- Todas las tablas y el bucket `receipts` tienen RLS: cada usuario solo ve sus datos.
- El plan Free de Supabase pausa el proyecto tras 7 días sin actividad; se reactiva desde el panel.
