# Arquitectura de Datos — HouseBroker Perú

## Modelo Entidad-Relación (ERD v1.0)

Este esquema representa la entidad inicial `Property` para el módulo de gestión de propiedades correspondiente al Sprint 1 (APF1).

```mermaid
erDiagram
    PROPERTY {
        uuid id PK "Identificador único"
        string title "Título de la propiedad"
        text description "Descripción detallada"
        decimal price "Precio en USD/PEN"
        string address "Dirección física"
        string property_type "Tipo (Departamento, Casa, etc.)"
        boolean is_active "Estado para eliminación lógica"
        datetime created_at "Fecha de registro"
        datetime updated_at "Fecha de modificación"
    }
```