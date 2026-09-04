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
npm run test:ui
npm run test:coverage
npm run test:e2e
npm run build
```

La suite actual contiene 17 tests, incluyendo 2 pruebas de interfaz en jsdom. La cobertura se genera con `@vitest/coverage-v8` y se excluye del repositorio. El build separa Recharts en un chunk independiente para reducir el JavaScript inicial.

Las pruebas E2E usan Chromium y levantan Vite automáticamente. Para publicar en GitHub Pages, activa **Settings > Pages > Source: GitHub Actions** en el repositorio; la URL esperada es `https://kasebas.github.io/InvestJS/`.

## GitHub Pages

El repositorio debe llamarse `InvestJS`. El workflow de `.github/workflows/deploy.yml` publica automáticamente la carpeta `dist` al hacer push sobre `main`. En la configuración del repositorio, selecciona **Settings > Pages > GitHub Actions** como origen.

## Estado actual

La primera versión incluye un dashboard responsive con métricas, evolución de cartera, distribución por activo, operaciones CRUD de posiciones y registro de compras, ventas, dividendos y comisiones. Las posiciones y operaciones se guardan localmente en IndexedDB cifradas con AES-GCM; la contraseña se utiliza para derivar la clave mediante PBKDF2 y nunca se guarda. Las bóvedas creadas por versiones anteriores se migran al nuevo contenedor de datos al guardar el siguiente cambio.

El dashboard permite exportar un backup JSON completo, restaurarlo después de validarlo y exportar las operaciones a CSV. El JSON exportado no está cifrado, así que debe guardarse en un lugar privado; el almacenamiento interno sí permanece cifrado.

Las carteras nuevas empiezan vacías. El botón **Borrar datos** elimina la bóveda local después de una confirmación y no se puede deshacer; exporta un backup antes de usarlo.

## Finanzas y fuentes de datos

- La divisa base puede ser EUR o USD y el tipo USD/EUR se introduce manualmente para evitar depender de una API con secretos.
- El resumen separa rentabilidad no realizada, rentabilidad realizada, dividendos y comisiones.
- El gráfico de evolución se construye a partir del historial de operaciones; las valoraciones automáticas de mercado todavía no están conectadas.
- Se pueden importar operaciones CSV con columnas de fecha, símbolo, tipo, cantidad e importe. El importador acepta compras y ventas de exportaciones habituales de MetaTrader, valida las filas y recalcula la cartera.
- Las cotizaciones actuales siguen siendo manuales mediante la edición de cada posición; no se presenta información de mercado en tiempo real.

GitHub Pages no ofrece autenticación de URL. El código publicado será accesible, por lo que no deben subirse inversiones, contraseñas, tokens ni claves de brokers.
