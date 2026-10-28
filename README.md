# Meme Atlas

Aplicación Next.js con renderizado del lado del servidor para explorar y administrar el contenido de `memes.db`.

## Configuración

1. Instala las dependencias con `npm install --legacy-peer-deps`.
2. Crea `.env.local` a partir de `.env.example`.
3. Define `ADMIN_PASSWORD` y un `AUTH_SECRET` largo y aleatorio.
4. Inicia el entorno local con `npm run dev`.

La aplicación usa `./memes.db` por defecto. Se puede indicar otra ruta con `MEME_DB_PATH`.

`MEME_CONTENT_COLUMN` define la columna mostrada en la portada y en cada publicación. Admite `summary`, `summary_tr`, `content_md` o `content_tr`. Si la variable no existe, se utiliza `content_md`.

## Rutas

- `/`: archivo público renderizado en el servidor.
- `/memes/[slug]`: detalle y registro de visita.
- `/admin`: métricas, edición y eliminación de entradas.

Desde `/admin` también se puede iniciar `meme_scraper.py` en segundo plano, seleccionar el modo, idioma y límite, y revisar su salida. Si `python` no está disponible en el `PATH`, configura `PYTHON_EXECUTABLE` con la ruta del intérprete.

En desarrollo, si `ADMIN_PASSWORD` no está definido, la contraseña temporal es `admin`. En producción la variable es obligatoria.

## Verificación

```bash
npm test
npm run lint
npm run build
```
