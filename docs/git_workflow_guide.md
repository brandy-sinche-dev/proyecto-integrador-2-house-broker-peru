# Guía de Flujo de Trabajo Git y Gestión de Repositorio

**Proyecto:** HouseBroker Perú
**Documento:** Estándares de Trabajo en GitHub, Ramas y Pull Requests
**Versión:** 1.0

---

## 1. Reglas de Oro

1. **Nunca hagas `git push origin main`** directamente. Está prohibido.
2. **Todo cambio** (código o documentación) va en una **rama secundaria**.
3. **El único camino a `main`** es mediante un **Pull Request (PR)**.

> Piensa en `main` como la versión estable: nada llega ahí sin ser revisado.

---

## 2. Nombres de Ramas

Nombra la rama según el **tipo de tarea** que aparece en GitHub Projects:

| Prefijo    | Uso                          | Ejemplo                  |
|------------|------------------------------|--------------------------|
| `docs/`    | Documentación                | `docs/sprint2-api-contracts` |
| `feature/` | Nueva funcionalidad          | `feature/login-jwt`      |
| `fix/`     | Corrección de errores        | `fix/cors-error`         |

---

## 3. Flujo Completo (Paso a Paso)

### Paso 1 — Crea la rama desde `main`
Siempre parte de una `main` actualizada para evitar conflictos.

```bash
git checkout main
git pull origin main
git checkout -b docs/nombre-de-tu-tarea
```

- `git pull` baja los últimos cambios del equipo.
- `git checkout -b <rama>` crea y te mueve a tu rama nueva en un solo paso.

### Paso 2 — Commits con formato estándar
Escribe mensajes claros. Usamos **Conventional Commits**:

```bash
git add .
git commit -m "docs(api): agregar contratos openapi para propiedades y crm"
```

**¿Qué significa?**
- `docs` → el **tipo** de cambio (también: `feat`, `fix`, `refactor`, `test`).
- `(api)` → el **ámbito/módulo** afectado (opcional, pero útil).
- `agregar contratos...` → **qué** haces, en imperativo y en presente.

Otros ejemplos:
```bash
git commit -m "feat(auth): implementar login con JWT"
git commit -m "fix(chat): corregir error de conexión websocket"
```

### Paso 3 — Sube la rama y crea el Pull Request
```bash
git push origin docs/nombre-de-tu-tarea
```

Luego en GitHub:
1. Abre el **Pull Request** de tu rama hacia `main`.
2. En la **descripción** escribe `Closes #numero_de_tarea` para vincularlo al Kanban de GitHub Projects.
3. Espera la revisión del equipo.
4. Al aprobarse, haz **Merge** y pulsa **Delete branch** para limpiar.

### Paso 4 — Sincroniza tu repo local
Después del merge, vuelve a `main`, baja el trabajo y borra tu rama local:

```bash
git checkout main
git pull origin main
git branch -d docs/nombre-de-tu-tarea
```

---

## 4. Resumen Rápido (Cheat Sheet)

| Acción                               | Comando                                          |
|--------------------------------------|--------------------------------------------------|
| Crear rama desde main                | `git checkout -b docs/mi-tarea`                  |
| Subir la rama                        | `git push origin docs/mi-tarea`                  |
| Ver en qué rama estás                | `git branch --show-current`                      |
| Volver a main                        | `git checkout main`                              |
| Bajar lo que se fusionó              | `git pull origin main`                           |
| Borrar rama local ya fusionada       | `git branch -d docs/mi-tarea`                    |

---

## 5. Errores Comunes y Cómo Evitarlos

| Error                                             | Solución                                            |
|---------------------------------------------------|-----------------------------------------------------|
| Hacer `git push origin main`                      | Nunca. Crea una rama y usa PR.                      |
| Commit con mensaje vago ("cambios", "listo")      | Usa Conventional Commits (`feat(scope): descripción`). |
| Trabajar directo sobre `main`                     | Siempre crea y trabaja en una rama secundaria.      |
| Olvidar vincular el PR a la tarea                 | Escribe `Closes #id` en la descripción del PR.      |
| No sincronizar tras el merge                      | Ejecuta el Paso 4 para mantener tu `main` al día.   |
| Reutilizar una rama para otra tarea               | Crea una rama nueva por cada tarea.                 |
