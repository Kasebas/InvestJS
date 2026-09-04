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
npm test
npm run build
```

## GitHub Pages

El repositorio debe llamarse `InvestJS`. El workflow de `.github/workflows/deploy.yml` publica automáticamente la carpeta `dist` al hacer push sobre `main`. En la configuración del repositorio, selecciona **Settings > Pages > GitHub Actions** como origen.

## Estado actual

La primera versión incluye un dashboard responsive con métricas, evolución de cartera, distribución por activo, operaciones CRUD de posiciones y registro de compras, ventas, dividendos y comisiones. Las posiciones y operaciones se guardan localmente en IndexedDB cifradas con AES-GCM; la contraseña se utiliza para derivar la clave mediante PBKDF2 y nunca se guarda. Las bóvedas creadas por versiones anteriores se migran al nuevo contenedor de datos al guardar el siguiente cambio.

El dashboard permite exportar un backup JSON completo, restaurarlo después de validarlo y exportar las operaciones a CSV. El JSON exportado no está cifrado, así que debe guardarse en un lugar privado; el almacenamiento interno sí permanece cifrado.

GitHub Pages no ofrece autenticación de URL. El código publicado será accesible, por lo que no deben subirse inversiones, contraseñas, tokens ni claves de brokers.
