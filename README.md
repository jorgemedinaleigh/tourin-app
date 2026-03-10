# Tourin App

Aplicación móvil construida con **Expo + React Native** para explorar puntos de interés, gestionar logros y consultar estadísticas de usuario dentro de una experiencia gamificada.

## 🚀 Stack principal

- Expo SDK 53
- React Native 0.79 + React 19
- Expo Router (navegación por archivos)
- MapLibre (mapas)
- Appwrite (autenticación, base de datos y storage)
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
lib/                     # Clientes externos (Appwrite, PostHog)
constants/               # Colores y datos estáticos
assets/                  # Íconos e imágenes
```

## ✅ Requisitos

- Node.js 18+
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
EXPO_PUBLIC_POSTHOG_API_KEY=phc_xxxxxxxxxxxxxxxxx
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

> La app deshabilita PostHog automáticamente si `EXPO_PUBLIC_POSTHOG_API_KEY` no está configurada.

## 🧭 Configuración de servicios

### Appwrite

La configuración del cliente Appwrite se encuentra en `lib/appwrite.js` e incluye:

- Endpoint
- Project ID
- Platform/package identifier

Si necesitas cambiar entorno (dev/staging/prod), actualiza esos valores o centralízalos en variables de entorno.

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
