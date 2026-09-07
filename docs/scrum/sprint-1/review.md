# Sprint Review — Sprint 1 (APF1)

**Proyecto:** HouseBroker Perú  
**Fecha de Revisión:** Final de la Semana 4  
**Asistentes:** Equipo Scrum, Profesor / Evaluador APF1  

---

## 1. Demostración del Incremento Funcional

### Funcionalidades Demostradas:
* **UI/UX en Figma:** Prototipo completo con los 5 estados de la interfaz (Cargando, Vacío, Éxito, Error e Interactivo) para la gestión de propiedades.
* **Componente React:** Registro de inmuebles con validaciones activas en el cliente.
* **Integración Mock:** Guardado simulado mediante `axios-mock-adapter` respondiendo a tiempo real sin errores de red.
* **Testing Automatizado:** Cobertura de código en lógica de formularios pasando los tests en Jest.
* **Pruebas WCAG:** Navegación por teclado fluida y etiquetas `aria-labels` configuradas en inputs y botones.

---

## 2. Estado de las Historias de Usuario

| ID Historia | Título | Estado | Puntos de Historia |
| :--- | :--- | :---: | :---: |
| `HU-PROP-01` | Registrar y editar propiedades | **DONE** | 13 |

---

## 3. Métricas del Sprint
* **Velocidad Planeada:** 13 Pts
* **Velocidad Entregada:** 13 Pts
* **Cumplimiento:** 100%

---

## 4. Retroalimentación del Evaluador / Product Owner
* **Fortalezas:** Excelente separación de responsabilidades en React y cumplimiento estricto del enfoque Vertical Slice. La simulación con Mocks permitió evaluar la experiencia sin depender del servidor Django.
* **Sugerencias de Mejora:** Ajustar la respuesta visual de los errores de validación para que los mensajes flotantes sean más visibles en pantallas pequeñas.