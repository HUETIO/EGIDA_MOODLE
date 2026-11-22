# EGIDA_MOODLE

Plataforma web para el Diplomado en Ciberseguridad. El catálogo público presenta el programa; el aula, las entregas y las funciones docentes requieren autenticación Google y un perfil académico asignado por coordinación.

## Requisitos

- Node.js 22 o superior y npm.
- Firebase CLI (`npm install --global firebase-tools`) para publicar.
- Una cuenta con permisos sobre el proyecto Firebase.

## Desarrollo local

```powershell
npm install
npm --prefix functions install
Copy-Item .env.example .env.local
npm run dev
```

Configura las variables `VITE_FIREBASE_*` de `.env.local` con la configuración de una aplicación web Firebase. Para validar tokens en el servidor local, configura `FIREBASE_PROJECT_ID` y `COORDINATOR_EMAILS` en `.env`, e inicia sesión con Application Default Credentials si corresponde. No añadas archivos `.env` al repositorio.

## Pruebas y compilación

```powershell
npm test
npm run lint
npm run build
npm --prefix functions run build
```

## Publicar en Firebase

1. Crea o selecciona un proyecto Firebase y habilita Firebase Authentication con el proveedor Google. Añade el dominio de Hosting a los dominios autorizados.
2. Verifica que la cuenta tenga permisos para agregar Firebase al proyecto Google Cloud y crear sitios de Hosting. El sitio configurado es `egida-moodle-2026` en `firebase.json`.
3. Las Cloud Functions requieren un proyecto con facturación habilitada (plan Blaze); vincula una cuenta de facturación antes de desplegarlas.
4. Inicia sesión y selecciona el proyecto:

   ```powershell
   firebase login
   firebase use egida-moodle-2026
   ```

5. Configura los valores públicos `VITE_FIREBASE_*` en `.env.local` antes de compilar el frontend. Configura `COORDINATOR_EMAILS` para las cuentas Google verificadas que administrarán roles.
6. Compila y publica Hosting y Functions:

   ```powershell
   npm install
   npm --prefix functions install
   npm test
   npm run lint
   firebase deploy --only functions,hosting --project egida-moodle-2026
   ```

Hosting reescribe `/api/**` a la función `egidaApi`; por eso publicar solo los archivos estáticos no proporciona una aplicación funcional. Si la activación de Firebase devuelve `PERMISSION_DENIED`, solicita a la persona administradora del proyecto u organización los permisos necesarios antes de volver a desplegar.

## Estado de persistencia

El almacén de datos actual es un archivo JSON local. La Cloud Function no escribe en disco persistente y no existe todavía una integración de Firestore. No uses este despliegue para guardar datos académicos reales ni para una cohorte activa hasta migrar el almacenamiento a una base de datos persistente y validarla.
