# Tourin App

Aplicación móvil construida con **Expo + React Native** para explorar puntos de interés, gestionar logros y consultar estadísticas de usuario dentro de una experiencia gamificada.

## 🚀 Stack principal

- Expo SDK 53
- React Native 0.79 + React 19
- Expo Router (navegación por archivos)
- MapLibre (mapas)
- Supabase (autenticación, base de datos y storage)
- PostHog (analítica y screen tracking)

## 📱 Funcionalidades

- Flujo de autenticación (`/auth`): inicio de sesión y registro.
- Dashboard con pantallas de:
  - Mapa
  - Pasaporte
  - Logros
  - Perfil
- Capas y componentes de mapa personalizados.
- Contextos para usuario y datos geográficos.
- Instrumentación de analítica con PostHog (tracking manual de pantallas con Expo Router).

## 📂 Estructura del proyecto

```text
app/
  _layout.jsx            # Layout raíz y configuración de navegación
  index.jsx              # Entrada principal
  auth/                  # Pantallas de autenticación
  dashboard/             # Pantallas principales de la app
components/              # Componentes reutilizables de UI y mapa
contexts/                # Providers globales (usuario, geodatos)
hooks/                   # Hooks de dominio (achievements, stats, leaderboard...)
lib/                     # Clientes externos (Supabase, PostHog)
constants/               # Colores y datos estáticos
assets/                  # Íconos e imágenes
```

## ✅ Requisitos

- Node.js 20+
- npm 9+
- Expo CLI (vía `npx expo`)

## ⚙️ Instalación

```bash
npm install
```

## ▶️ Ejecución en desarrollo

```bash
npm run start
```

También puedes abrir directamente por plataforma:

```bash
npm run android
npm run ios
npm run web
```

## 🔐 Variables de entorno

Crea un archivo `.env` en la raíz del proyecto (si no existe):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxx
EXPO_PUBLIC_POSTHOG_API_KEY=phc_xxxxxxxxxxxxxxxxx
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

> La app deshabilita PostHog automáticamente si `EXPO_PUBLIC_POSTHOG_API_KEY` no está configurada.

### Override de ubicación en desarrollo

Opcionalmente puedes simular una ubicación fija en builds de desarrollo. Solo se activa cuando la app corre en modo `__DEV__`; en builds de producción se ignora aunque las variables existan.

```env
EXPO_PUBLIC_DEV_LOCATION_LAT=-33.4489
EXPO_PUBLIC_DEV_LOCATION_LON=-70.6693
EXPO_PUBLIC_DEV_LOCATION_ACCURACY=5
```

Después de cambiar estos valores, reinicia Metro con cache limpia:

```bash
npx expo start --dev-client --clear
```

### EAS Build

El archivo `.env` es solo para desarrollo local y no se sube al repositorio. Para builds remotos de EAS, configura las mismas variables en el ambiente correspondiente antes de crear el binario:

```bash
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "<your-supabase-url>" --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "<your-publishable-key>" --visibility sensitive
eas env:list --environment preview
eas build --platform android --profile preview --clear-cache
```

Las variables `EXPO_PUBLIC_*` se incluyen en el bundle de la app, por lo que no deben contener secretos privados ni service-role keys. Si cambias una variable usada por la app, vuelve a generar el build preview para que Metro la inserte en el bundle.

## 🧭 Configuración de servicios

### Supabase

La configuración del cliente Supabase se encuentra en `lib/supabase.js` e incluye:

- Project URL
- Publishable key
- Persistencia de sesión con AsyncStorage

Si necesitas cambiar entorno (dev/staging/prod), actualiza `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
Para builds remotos, también actualiza esas variables en EAS (`development`, `preview` o `production`) según el perfil definido en `eas.json`.

### PostHog

La inicialización está en `lib/posthog.js` y usa valores cargados desde `app.config.js` (`expo.extra`).

## 📦 Scripts disponibles

- `npm run start` — Inicia Expo en modo desarrollo.
- `npm run android` — Abre en Android.
- `npm run ios` — Abre en iOS.
- `npm run web` — Abre en web.

## 🛠️ Notas de desarrollo

- El tracking de pantallas está implementado de forma manual en `app/_layout.jsx` usando `usePathname` de Expo Router.
- La app solicita permisos de ubicación en iOS/Android desde `app.config.js`.
- La configuración EAS se encuentra en `eas.json`.

## 📄 Licencia

Actualmente este repositorio no declara una licencia explícita.
