# Tareas propuestas tras revisión de código

## 1) Corregir error tipográfico
**Problema detectado**
- El campo `achivementId` está mal escrito (debería ser `achievementId`) y se propaga en `hooks/useAchievements.js` y en el adaptador.

**Tarea propuesta**
- Estandarizar el nombre a `achievementId` en todo el flujo (payload interno, lecturas/escrituras y mapeos).
- Mantener compatibilidad temporal solo si hace falta, con una migración corta para eliminar el alias mal escrito.

**Criterios de aceptación**
- No quedan referencias a `achivementId` en el código de aplicación.
- `useAchievements` sigue mostrando desbloqueos correctamente.

## 2) Corregir una falla funcional
**Problema detectado**
- `listAllRows` pagina con `.range(...)` pero sin `.order(...)` en `hooks/useSuggestedRoutes.js`. Sin orden estable, la paginación puede devolver duplicados u omitir registros cuando cambia el conjunto de datos.

**Tarea propuesta**
- Añadir orden determinístico (por ejemplo `id` ascendente) en todas las consultas paginadas de `listAllRows`.
- Documentar explícitamente el supuesto de orden estable para futuras tablas.

**Criterios de aceptación**
- Dos ejecuciones consecutivas sobre el mismo dataset devuelven el mismo conjunto en el mismo orden.
- No hay duplicados al concatenar páginas.

## 3) Corregir discrepancia en comentarios/documentación
**Problema detectado**
- `docs/supabase-content-fields.md` define un orden de fallback que no refleja del todo el orden real de `getLocalizedField` (prioriza campos legacy con sufijo antes de ciertos valores JSON localizados).

**Tarea propuesta**
- Alinear la documentación con el orden exacto implementado en `i18n/getLocalizedField.js`, o ajustar implementación si el orden documentado es el deseado por producto.
- Añadir un ejemplo mínimo de resolución para evitar ambigüedad.

**Criterios de aceptación**
- El orden de fallback documentado coincide 1:1 con el comportamiento real.
- QA puede verificar el ejemplo y obtener el mismo resultado que el runtime.

## 4) Mejorar una prueba
**Oportunidad detectada**
- Falta una prueba unitaria dedicada al algoritmo de fallback de `getLocalizedField`.

**Tarea propuesta**
- Crear pruebas parametrizadas para cubrir: locale activa, fallback locale, campos con sufijo (`name_es`), objeto JSON (`name.es`/`name.en`), y `defaultValue`.
- Incluir un caso de regresión sobre precedencia para proteger la corrección de la documentación.

**Criterios de aceptación**
- Existe una suite que falla si cambia el orden de precedencia sin intención.
- Cobertura de casos borde: strings vacíos, arrays vacíos y `null`.
