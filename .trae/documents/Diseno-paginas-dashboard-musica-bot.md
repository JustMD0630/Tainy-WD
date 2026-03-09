# Diseño de páginas (desktop-first)

## Estilo global

* **Paleta**: Blanco #FFFFFF (base), Gris #111827/#374151 (texto/fondos), Azul #2563EB (acción), Rosa #EC4899 (acento).

* **Tipografía**: Inter/Roboto; escala 12/14/16/20/24/32.

* **Componentes**: cards con borde 1px gris suave, sombras sutiles, radius 12px.

* **Botones**: primario (azul), secundario (gris), acento (rosa). Hover con +4% brillo, focus ring azul.

* **Animaciones**: framer-motion; transiciones 180–240ms; easing suave; skeleton loaders.

* **Layout**: grid 12 columnas; contenedor 1200–1320px; sidebar fijo (260px) en desktop.

## Página: Inicio de sesión

* **Meta**: title “Acceder | Music Bot Dashboard”; description “Accede para administrar la música del bot”.

* **Estructura**: split layout (izq formulario, der visual con degradado rosa→azul sobre gris).

* **Secciones/Componentes**:

  * Logo + nombre del producto.

  * Form card: email, contraseña, CTA “Entrar”, link “Olvidé mi contraseña”.

  * Estados: loading, error inline, success toast.

## Página: Dashboard (Reproducción en vivo)

* **Meta**: title “Dashboard | Music Bot”; description “Control en tiempo real”.

* **Estructura**: topbar + sidebar + contenido en 2 columnas.

* **Secciones/Componentes**:

  * Topbar: selector de contexto (si aplica), indicador conexión (dot animado), botón “Reconectar”.

  * Card “Ahora sonando”: artwork, título/artista, barra progreso, tiempo, acciones.

  * Controles: play/pausa/stop, anterior/siguiente, slider volumen, slider seek (si soportado).

  * Card “Cola”: lista virtualizada, drag & drop reordenar, acciones por ítem (quitar), CTA “Añadir desde biblioteca”.

  * Notificaciones: toasts; banner sticky si WS cae.

* **Interacción WS**: updates incrementales de estado/cola; animar reordenamiento y cambios de pista.

## Página: Biblioteca & Playlists

* **Meta**: title “Biblioteca | Music Bot”; description “Gestiona pistas y playlists”.

* **Estructura**: tabs “Biblioteca” / “Playlists”.

* **Secciones/Componentes**:

  * Toolbar: búsqueda, filtros básicos, botón “Crear playlist”.

  * Biblioteca (tabla/card list): título, artista, duración; acciones “Añadir a cola” / “Ver”.

  * Playlists: grid de cards; abrir detalle (drawer) con listado de pistas.

  * Editor playlist: nombre/descr; agregar/quitar pistas; botón “Enviar a cola”.

## Página: Ajustes

* **Meta**: title “Ajustes | Music Bot”; description “Conexión, acceso y preferencias”.

* **Estructura**: 3 secciones en acordeón o cards.

* **Secciones/Componentes**:

  * Conexión Bot: inputs URL API y URL WS, botón “Probar”, log de errores recientes (compacto).

  * Acceso y roles: lista usuarios, rol por dropdown, invitar (email), revocar.

  * Preferencias UI: densidad, resaltado rosa/azul, guardar por usuario.

