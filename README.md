# InvestJS

Panel personal para controlar inversiones en acciones, ETFs y oro.

## Desarrollo local

```bash
npm install
npm run dev
```

Comandos de calidad:

```bash
npm run lint
npm run build
```

## GitHub Pages

El repositorio debe llamarse `InvestJS`. El workflow de `.github/workflows/deploy.yml` publica automáticamente la carpeta `dist` al hacer push sobre `main`. En la configuración del repositorio, selecciona **Settings > Pages > GitHub Actions** como origen.

## Estado actual

La primera versión incluye un dashboard responsive con métricas, evolución de cartera, distribución por activo y operaciones CRUD de posiciones. Actualmente los datos viven en el estado de la sesión del navegador; la persistencia cifrada mediante IndexedDB y Web Crypto se añadirá antes de usar datos reales.

GitHub Pages no ofrece autenticación de URL. El código publicado será accesible, por lo que no deben subirse inversiones, contraseñas, tokens ni claves de brokers.