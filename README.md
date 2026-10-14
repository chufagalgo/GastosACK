# GASTOSACK

App web (PWA, mobile-first) para registrar los gastos de empresa de ACK Logic y generar cada mes la hoja de liquidación en Excel y un Word con los tickets.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres + Auth + Storage) · Vercel.

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Clientes + km desde ACK Logic, Ajustes, login | ✅ |
| 2 | Gastos + foto + lectura con IA | ✅ |
| 3 | Exportar Excel (plantilla `templates/Gastos_Marzo.xlsx`) | ⏳ |
| 4 | Exportar Word con los tickets | ⏳ |
| 5 | PWA y pulido | ⏳ |

## Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Conexión |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → *Publishable key* (`sb_publishable_…`) | Conexión (pública: los datos los protege RLS). También vale la antigua *anon key* en `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `GOOGLE_MAPS_API_KEY` | Google Cloud → *Routes API* | Km ida y vuelta a cada cliente |
| `OPENROUTESERVICE_API_KEY` | openrouteservice.org (opcional) | Alternativa gratuita si no hay clave de Google |
| `ANTHROPIC_API_KEY` | <https://console.anthropic.com> → *API Keys* → *Create Key* (`sk-ant-…`) | Leer los tickets. Sin ella, los datos se escriben a mano |

Las variables sin `NEXT_PUBLIC_` solo se usan en el servidor y nunca llegan al navegador.
No hace falta la *service role key*: la app trabaja siempre con la sesión del usuario.

> Google ya no deja activar *Distance Matrix API* en proyectos nuevos; la app usa **Routes API**, que hace lo mismo con la misma clave. Si no hay clave, los km se escriben a mano.

## Puesta en marcha

### 1. Supabase

1. <https://supabase.com> → **New project** (`gastosack`, región *West EU* o *Central EU*, plan Free).
2. **Authentication → Sign In / Providers**: desactiva **Allow new users to sign up**.
3. **Authentication → Users → Add user → Create new user**: tu email y contraseña, marcando *Auto Confirm User*.
4. Crea las tablas, la seguridad y el bucket de fotos desde tu ordenador:

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>   # el ref está en la URL del panel
   npx supabase db push                                  # aplica supabase/migrations
   ```

### 2. Google Maps (km)

1. <https://console.cloud.google.com> → crea un proyecto → **APIs y servicios → Biblioteca** → activa **Routes API**.
2. **Credenciales → Crear credenciales → Clave de API**. Restringe la clave a *Routes API*.
3. Google pide una cuenta de facturación, pero el uso de esta app está muy por debajo del crédito gratuito mensual.

### 3. Anthropic (lectura de tickets)

1. <https://console.anthropic.com> → crea la cuenta y añade saldo en **Billing** (cada ticket cuesta céntimos).
2. **API Keys → Create Key** → cópiala en Vercel como `ANTHROPIC_API_KEY`. Es secreta: no la pegues en chats ni en el código.

### 4. Vercel

1. <https://vercel.com> → **Add New… → Project** → importa `gastosack`.
2. Pega las variables de entorno de la tabla de arriba → **Deploy**.

Cada push a `main` se publica solo. Si cambia el esquema, vuelve a ejecutar `npx supabase db push`.

### 5. Primer uso

Entra con el usuario del paso 1.3 → **Ajustes**: comprueba tu nombre, la dirección de origen (por defecto Carrer dels Argenters 2, Cerdanyola del Vallès) y la tarifa €/km → **Clientes**: da de alta los clientes (los km se calculan solos).

## Cómo se registra un gasto

1. **Nuevo gasto** → *Hacer foto del ticket* (abre la cámara) o *Elegir imagen o PDF*.
2. La foto se reduce a 1600 px en el móvil y se sube a Supabase Storage (carpeta privada del usuario). De los PDF se guarda el original y una imagen de la 1.ª página para el Word.
3. El servidor se la manda a Claude, que devuelve fecha, comercio, total con IVA, CIF/NIF y tipo de gasto.
4. Revisas el formulario pre-rellenado y lo guardas. **Nada se guarda sin confirmar.**
   - Al elegir el cliente se rellenan Lloc y el último proyecto usado con él.
   - Si el cliente tiene km, puedes añadir el desplazamiento de ese día en el mismo paso (no se duplica si ya existe).
   - La fecha tiene que caer en el mes en el que estás; si el ticket es de otro mes, la app te ofrece guardarlo allí.
5. *Solo kilometraje*: para días sin ticket. Los km salen del cliente y se pueden cambiar; importe = km × €/km.

## Desarrollo

Requiere Docker para el Supabase local.

```bash
npm install
npx supabase start            # Supabase local (aplica las migraciones)
cp .env.example .env.local    # pon la URL y la clave publishable que muestra el comando anterior
npm run dev                   # http://localhost:3000
npm test                      # tests de lógica
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
