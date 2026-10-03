# Evidencia — TASK-WPO-PROP-02 (Anderson Villanes)

Optimización WPO del catálogo de propiedades (Sprint 2 · HU-PROP-02).

## Contenido

| Archivo | Descripción |
| ------- | ----------- |
| `lighthouse-report.json` | Reporte completo de Lighthouse 11.7.1 (categoría Performance) sobre el build de producción. |
| `build-despues.txt` | Salida real de `pnpm run build` (code splitting y tamaños de chunk). |

## Comandos ejecutados

```bash
cd frontend
pnpm test:coverage          # 6 suites / 83 pruebas en verde
pnpm run lint               # sin errores
pnpm run build              # build de producción (ver build-despues.txt)

# Lighthouse (navegador headless Microsoft Edge)
set VITE_ENABLE_MOCKS=true
pnpm run build
pnpm run preview -- --port 4321
set CHROME_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
pnpm dlx lighthouse@11 http://localhost:4321/ --only-categories=performance --output=json --output-path=lighthouse-report.json
```

## Resultados

### Bundle (antes → después)

* JS inicial: **353.22 kB / 116.73 kB gzip → 238.47 kB / 76.85 kB gzip**
  (**−32.5 % crudo / −34.2 % gzip**).
* `axios-mock-adapter` + fixtures (66.44 kB / 23.73 kB gzip) dejan de formar parte
  del bundle inicial y se cargan solo bajo demanda en modo demo.
* `react-vendor` separado para cacheo; catálogo y detalle en chunks diferidos.

### Lighthouse 11.7.1 (headless Edge, perfil móvil por defecto)

| Métrica | Valor |
| ------- | ----: |
| Performance score | 84 |
| FCP | 2.42 s |
| LCP | 3.26 s |
| TBT | 258 ms |
| **CLS** | **0.000** |

> Medición local con `VITE_ENABLE_MOCKS=true` para renderizar el catálogo sin
> backend; en producción el chunk de mocks no se descarga. El CLS objetivo
> (≤ 0.10) se cumple.
