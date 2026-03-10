# 📘 Tainy Project Handover & Status Report

**Fecha:** 09 de Marzo de 2026
**Proyecto:** Tainy - Bot de Música Avanzado con Dashboard Web
**Stack:** Node.js (Backend), React + Vite (Frontend), Discord.js, Fastify, QuickDB (MySQL Driver).

---

## 🚀 Estado Actual del Proyecto

El proyecto ha madurado significativamente, puliendo la experiencia de usuario (UX/UI), la estabilidad del sistema y la navegación.

### 🛡️ Actualización de Seguridad (Marzo 2026)

Se han realizado correcciones críticas de seguridad en el backend para prevenir accesos no autorizados y suplantación de identidad.

1.  **Protección de Playlists**:
    *   Se eliminó el bypass de autenticación que permitía modificar playlists sin token válido en `/v1/playlists`.
    *   Ahora todas las operaciones de escritura (POST, PATCH, DELETE) requieren un token Bearer válido.
    *   Las operaciones de lectura (GET) siguen siendo accesibles si se diseñaron como públicas, pero bajo control estricto.

2.  **Validación de Identidad en Admin**:
    *   **Problema Corregido**: Los endpoints de administración (`/v1/admin/reports`, `/v1/admin/action`) confiaban ciegamente en el parámetro `userId` enviado por el cliente.
    *   **Solución**: Se implementó `getAuthedUserId` (en `src/web/util/auth.ts`) que valida el token contra la API de Discord para obtener la identidad real del solicitante.
    *   El parámetro `userId` en query/body ha sido eliminado o ignorado para fines de autorización.

3.  **Protección Global de Admin**:
    *   Se aseguró que todas las rutas bajo `/v1/admin` estén cubiertas por el middleware de autenticación global (`preValidation` hook).

### ✅ Funcionalidades Completadas y Mejoradas

1.  **Dashboard Web (`/dashboard`)**:
    *   **Control Total**: Play, Pause, Skip, Volume (limitado a 100%), Shuffle, Loop.
    *   **Gestión de Cola (Drag & Drop)**: Implementación robusta de reordenamiento mediante arrastrar y soltar usando `framer-motion`.
        *   **Lógica de Índices**: El frontend maneja la lista "A continuación" (índices 0..N) y traduce automáticamente a índices "visuales" (1..N+1) antes de enviarlos al backend, respetando el contrato de API.
        *   **Estabilidad**: Se utilizan IDs únicos (`track.id` o URIs) para evitar conflictos de renderizado en React al mover items.
    *   **Acciones Rápidas**: Botón de "Me gusta" (❤️) añadido directamente en los items de la cola para guardar en playlists, junto al botón de eliminar.
    *   **Estabilidad WebSocket**: Implementación de lógica robusta de reconexión y eliminación de logs de error "spam" en la consola. Carga silenciosa de estado.

2.  **Navegación y Autenticación**:
    *   **Flujo de Login Mejorado**: El login con Discord redirige al usuario a la página de inicio (`/`) en lugar de forzar la entrada al Dashboard.
    *   **Persistencia de Ruta**: Al recargar la página (F5), el usuario permanece en la sección que estaba visitando (ej. `/library`, `/settings`) en lugar de ser enviado al Dashboard.
    *   **Menú de Usuario**: Nuevo menú desplegable en el header con acceso rápido a "Dashboard" y "Cerrar Sesión", eliminando botones redundantes.
    *   **Sidebar Móvil**: Navegación lateral responsiva (Drawer) con animaciones fluidas para dispositivos móviles.

3.  **Internacionalización (i18n)**:
    *   **Soporte Real**: Cambio dinámico entre Inglés (EN) y Español (ES) sin recargar.
    *   **Persistencia Inteligente**: El idioma se sincroniza con la preferencia del usuario pero permite cambios manuales temporales sin "resetearse" agresivamente.
    *   **Bienvenida Personalizada**: Mensajes adaptativos ("Bienvenido de nuevo, [Usuario]" vs "Bienvenido").

4.  **Social y Explorar (`/explore`)**:
    *   **Meta Tags (Open Graph)**: Embeds enriquecidos con imagen grande y descripción al compartir el enlace en Discord/Twitter.
    *   **Sistema de Comentarios y Reportes**: Funcionalidad completa con moderación automática (ocultar tras 5 reportes).

5.  **Biblioteca (`/library`)**:
    *   **Gestión de Playlists**: Creación, edición y borrado de playlists.
    *   **Seguridad**: Modal de confirmación antes de eliminar playlists para evitar accidentes.
    *   **Interfaz**: Diseño de tarjetas mejorado y adaptable a móvil.

---

## 🐛 Correcciones Recientes (Hotfixes)

Se han solucionado bugs críticos relacionados con la visualización y manipulación de la cola de reproducción:

1.  **Visualización de Cola ("Missing First Item")**:
    *   **Problema**: La primera canción de la lista "A continuación" no se mostraba, y el contador difería de la cantidad de tarjetas visibles.
    *   **Causa**: El frontend aplicaba incorrectamente un `.slice(1)` a la lista recibida, asumiendo que el índice 0 era la canción actual. Sin embargo, el backend ya separa `{ current, queue }`, donde `queue` es estrictamente la lista "upcoming".
    *   **Solución**: Se eliminó el slice redundante en `QueueCard.tsx`. Ahora la UI refleja exactamente el estado del servidor.

2.  **Sincronización de Move (Backend/Frontend)**:
    *   **Problema**: Desfase de índices al mover canciones.
    *   **Solución**:
        *   **Frontend**: Renderiza solo `upcoming`. Al mover, calcula `visualFrom = index + 1` y `visualTo = index + 1` para omitir el índice 0 (reservado para current).
        *   **Backend**: Recibe índices visuales, valida que no sean 0, resta 1 para obtener el índice real en el array `queue`, y aplica el movimiento de forma determinista.

---

## 🛑 Ciclo de Desarrollo (¡NO OLVIDAR!)

Este proyecto usa **TypeScript** tanto para el Backend como para el Frontend.

### Regla de Oro: ¡COMPILA SIEMPRE!
Cada vez que hagas un cambio en el código (`.ts`, `.tsx`, `.yml`):

1.  **Detén el proceso actual** (Ctrl+C).
2.  **Compila todo**:
    ```bash
    npm run build
    ```
    *(Esto compila el TypeScript del bot y construye el frontend de React con Vite)*.
3.  **Inicia el bot**:
    ```bash
    npm start
    ```

**¿Por qué?** El bot ejecuta el código compilado en `dist/`. Si no compilas, tus cambios en `src/` serán ignorados.

---

## 🔑 Gestión de Credenciales (`app.yml`)

El archivo **`app.yml`** es el centro de configuración.
*   **NO** subir a repositorios públicos.
*   **IDs de Discord**: Usar comillas simples para evitar redondeo de números grandes.
*   **Base de Datos**: Configurado para MySQL. El puerto por defecto es 3306 (no poner clave `port` dentro del objeto de config db si usas el default, ya que el validador es estricto).

---

## 📡 Contrato de API (Move, Remove, Add)

Se ha estandarizado la lógica de manipulación de la cola para garantizar consistencia.

### 1. Move (Reordenar)
*   **Endpoint:** `PATCH /v1/players/:guildId`
*   **Body:** `{ "move": { "from": number, "to": number } }`
*   **Semántica:**
    *   `from` y `to` son **índices visuales** (1..N = Upcoming Queue).
    *   **0 = Current Track** (No se permite mover).
    *   Backend traduce: `realIndex = visualIndex - 1`.

### 2. Remove (Eliminar)
*   **Endpoint:** `PATCH /v1/players/:guildId`
*   **Body:** `{ "remove": number }`
*   **Semántica:**
    *   El número es el **índice visual** de la canción a eliminar.
    *   **0 = Current Track** (No se permite eliminar por esta vía, usar Skip).
    *   Backend traduce: `realIndex = visualIndex - 1`.

### 3. Add (Añadir)
*   **Endpoint:** `PATCH /v1/players/:guildId`
*   **Body:** `{ "add": string[] | { "encoded": string } }`
*   **Semántica:**
    *   Si se envía un array de strings, se procesan como URIs o búsquedas.
    *   Si se envía `{ "encoded": "BASE64..." }`, se carga **exactamente** ese track decodificándolo en Lavalink, sin búsqueda adicional.
    *   El frontend envía `encoded:` (prefijo legacy) o el objeto JSON.

---

## 🎵 Sistema de Búsqueda Unificado (Tier 1 & 2)

Se ha implementado un nuevo módulo de búsqueda (`src/music/search/SearchService.ts`) que es utilizado tanto por el bot de Discord (`/play`, `/search`) como por el Dashboard.

### Objetivo
Priorizar versiones oficiales de canciones y evitar versiones alteradas (Nightcore, Slowed, etc.) a menos que el usuario las solicite explícitamente.

### Pipeline de Búsqueda
1.  **SearchIntent**: Analiza la query del usuario para detectar flags explícitos (`remix`, `live`, `nightcore`, etc.).
2.  **Tier 1 (Official Catalog)**: Intenta buscar metadatos en Spotify (`spsearch:`) para obtener el título y artista correctos ("Ground Truth").
3.  **Tier 2 (Playback Source)**: Usa los metadatos oficiales (o la query limpia) para buscar en YouTube/SoundCloud.
4.  **SearchRanker**: Puntúa los resultados basándose en:
    *   Coincidencia con metadatos oficiales (+50).
    *   Canal oficial de YouTube (+25).
    *   Penalización por versiones alteradas NO solicitadas (-60 a -80).

### Nota sobre Internacionalización (i18n) en Dashboard
> **IMPORTANTE**: Cualquier nueva funcionalidad añadida al Dashboard (Frontend), sin importar su ubicación, **DEBE** estar integrada con el sistema de multi-lenguaje (`react-i18next`). Revisa `src/client/locales` para añadir las traducciones correspondientes.

---

## 🚧 Tareas Pendientes y Sugerencias (Roadmap)

Si retomas el proyecto, aquí es donde nos quedamos:

1.  **Optimización de Carga (Performance)**:
    *   Vite advierte sobre "Large chunks" (>500kb).
    *   **Acción**: Implementar Code Splitting (división de código) usando `React.lazy` y `Suspense` para las rutas principales (`Dashboard`, `Library`, `Admin`) para reducir el tiempo de carga inicial.

2.  **Mejoras en Explorar/Social**:
    *   Actualmente `/explore` muestra playlists, pero podría enriquecerse con "Playlists Destacadas" o "Más Escuchadas" si el backend soportara métricas de uso.
    *   Simular una experiencia más social mostrando avatares de usuarios que dieron "Like" (si se implementa sistema de likes).

3.  **Panel de Administración Real (`/admin`)**:
    *   Conectar las gráficas de estadísticas a datos reales en tiempo real (uso de RAM, CPU, total de canciones reproducidas hoy). Actualmente son funcionales pero básicos.

4.  **Pruebas End-to-End (E2E)**:
    *   No hay tests automatizados. Sería ideal añadir Cypress o Playwright para asegurar que el flujo de Login -> Dashboard -> Reproducir no se rompa con futuros cambios.

---

## 🔮 ByteBlaze Social: La Visión Futura (Roadmap Extendido)

Se ha propuesto una evolución mayor del Dashboard para convertirlo en una **Plataforma Social de Música**. A continuación se detalla el plan maestro dividido por fases.

### 🌟 Fase 1: Identidad y Perfiles Públicos
*   **Backend**:
    *   Ampliar la base de datos para almacenar perfiles enriquecidos (`biografía`, `banner`, `redes_sociales`, `color_perfil`).
    *   Crear endpoint `GET /v1/users/:userId` para visualizar perfiles de terceros.
*   **Frontend**:
    *   Transformar `/profile` en un editor completo.
    *   Crear vista "Modo Visitante" para ver perfiles ajenos.

### 🤝 Fase 2: Sistema de Amigos y Privacidad
*   **Backend**:
    *   Tabla `relationships` (PENDING, FRIENDS, BLOCKED).
    *   Endpoints para enviar/aceptar solicitudes y bloquear usuarios.
*   **Playlists Colaborativas y Privacidad**:
    *   Nueva opción de visibilidad: **"Solo Amigos"**.
    *   **Sistema de Permisos**: Permitir compartir edición de playlists con amigos específicos (dueño mantiene control total, colaboradores pueden añadir).
    *   **Historial de Cambios**: Registrar quién añadió cada canción ("Añadido por [Usuario]").

### 💬 Fase 3: Chat en Tiempo Real
*   **Infraestructura**: Aprovechar el servidor WebSocket existente (`src/web/socket/`) para un nuevo canal de chat.
*   **Frontend**:
    *   Chat flotante o Sidebar lateral para conversar mientras se escucha música.
    *   Indicadores de estado (En línea / Escuchando ahora...).

### 🛡️ Fase 4: Seguridad y Moderación
*   Sistema de reportes de usuarios y playlists.
*   Herramientas de moderación en el panel `/admin`.
