# Evidencias — Sprint 2 (APF1 Final)

**Proyecto:** HouseBroker Perú
**Sprint:** 2 · Semanas 5–6 · **APF 1 Final**
**Scrum Master:** Brandy Sinche
**Miembros:** Brandy Sinche (Scrum Master / Dev 1), Jhon Ordoñez (Dev 2), Yohan Ñato (Dev 3), Anderson Villanes (Dev 4)

---

## Propósito

En la bitácora de Daily Scrums (`../dailies.md`), cada día registra el campo **Evidencia** con el avance reportado por cada integrante. Esta carpeta centraliza **las capturas y archivos de respaldo** que demuestran que esas tareas se ejecutaron realmente, a modo de soporte verificable del Sprint 2.

---

## Qué debe contener por integrante / tarea

Crear una subcarpeta por integrante y, dentro de cada una, una subcarpeta por tarea asignada:
(Ejemplo)
```
evidencias/
├── Brandy_Sinche/
│   ├── TASK-ARC-PROP-02/   (especificación contrato API paginación/catálogo)
│   ├── TASK-MOCK-PROP-02/  (servicio Mock paginación)
│   ├── TASK-ARC-PROP-03/   (especificación contrato API búsqueda por filtros)
│   └── TASK-MOCK-PROP-03/  (servicio Mock búsqueda filtrada)
├── Jhon_Ordonez/
│   ├── TASK-UI-PROP-02/    (prototipo Figma catálogo y detalle)
│   └── TASK-A11Y-PROP-02/  (etiquetas ARIA y navegación por teclado — WCAG 2.2 AA)
├── Yohan_Ñato/
│   ├── TASK-FRONT-PROP-02/ (vista de catálogo y detalle en React)
│   └── TASK-FRONT-PROP-03/ (lógica de filtrado dinámico)
└── Anderson_Villanes/
    ├── TASK-TEST-PROP-02/  (pruebas unitarias de renderizado en Jest)
    ├── TASK-WPO-PROP-02/   (carga perezosa con React.lazy y Suspense)
    ├── TASK-TEST-PROP-03/  (pruebas unitarias filtros)
    └── TASK-WPO-PROP-03/   (debounce en inputs de búsqueda)
```

## Tipos de evidencia aceptados

| Tipo | Ejemplos | Formato |
|---|---|---|
| Capturas de pantalla | UI en desktop/mobile, mensajes de error/vacío/loading | `.png` / `.jpg` |
| Registros de ejecución | Salida de consola, corridas de pruebas | `.png` / `.txt` / `.log` |
| Resultados de pruebas | Jest/RTL 100% en verde | `.png` / `.txt` |
| Auditoría de accesibilidad | Reporte AXE DevTools (WCAG 2.2 AA) aprobado | `.png` / `.json` / `.txt` |
| Prototipos | Evidencia del Figma (vista del diseño) | `.png` / `.pdf` |
| Enlaces | URL al prototipo/repo/PR referenciada en texto | `.md` (dentro de la subcarpeta) |

## Reglas de uso

1. La estructura **debe coincidir con los IDs de tarea** del `planning.md` para trazabilidad.
2. Cada evidencia debe corresponder a un avance registrado en el daily del comportamiento correspondiente (día 1–4).
3. Nombres descriptivos prefijados con fecha, ej.: `2026-09-11_catalogo-paginado.png`.
4. Si no hay evidencia para un día, se deja escrito `N/A (Sin evidencia registrada)` en el daily y no se crea subcarpeta vacía.
5. Verificar contra el **DoD del Sprint 2** (`../planning.md`): código en `main` vía PR aprobado, paginación y filtros funcionales, pruebas unitarias verdes en Jest y auditoría AXE WCAG 2.2 AA aprobada.