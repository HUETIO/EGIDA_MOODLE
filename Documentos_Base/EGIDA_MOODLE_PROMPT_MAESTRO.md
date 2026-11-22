# EGIDA_MOODLE — Prompt maestro de producto y desarrollo

> **Propósito:** especificación funcional y prompt de ejecución para diseñar, construir y escalar una plataforma digital de aprendizaje para el Diplomado en Ciberseguridad. Este documento define qué debe hacer el producto, qué ve y puede hacer cada rol, qué ocurre en cada pestaña y acción, cómo se estructura el diplomado y cómo se incorporan futuras funciones y agentes.
>
> **Fuente curricular:** [EGIDA_DIPLOMADO_CIBERSEGURIDAD30H_DocumentoMaestro_v1.docx](./EGIDA_DIPLOMADO_CIBERSEGURIDAD30H_DocumentoMaestro_v1.docx). El archivo de referencia disponible en el espacio de trabajo es un DOCX, aunque la solicitud lo denomina PDF.
>
> **Regla de fidelidad:** la fuente curricular es la autoridad para objetivos, contenidos, tiempos, evidencias y evaluación. Si hay una contradicción o falta una definición institucional, no inventar una política definitiva: usar una configuración editable, indicar el supuesto y solicitar validación antes de publicar o calificar.

---

## 1. Prompt listo para entregar a un equipo o agente de desarrollo

Actúa como un equipo multidisciplinario de producto, diseño instruccional, UX/UI, desarrollo full-stack, accesibilidad, seguridad, QA y arquitectura de software. Diseña e implementa **EGIDA_MOODLE**, una experiencia digital interactiva para impartir el **Diplomado en Ciberseguridad** a personas adultas con perfiles civiles, militares y policiales, sin exigir conocimientos técnicos previos.

### Objetivo del producto

Crear una plataforma clara, accesible y práctica donde estudiantes y docentes puedan recorrer el diplomado completo, participar en actividades individuales y colaborativas, entregar evidencias, recibir retroalimentación, consultar su progreso y evaluar el aprendizaje. El producto debe facilitar el aprendizaje humano: explicar con claridad, promover práctica segura, reducir fricción y permitir que cada módulo se complete en línea o en modalidad híbrida.

### Instrucciones obligatorias

1. Usa la estructura curricular de este documento y la fuente maestra. No elimines, reordenes ni cambies objetivos, duración, resultados de aprendizaje o ponderaciones sin una decisión explícita de la institución.
2. Organiza el diplomado en **6 módulos formativos, evaluación final y espacio de invitados**, con **15 bloques de 2 horas** y **30 horas totales**. Mantén visibles los 26 h de formación B01–B13 y las 4 h de invitados B14–B15.
3. Conserva el balance curricular global de **70 % práctica y 30 % teoría** (21 h prácticas y 9 h teóricas). Cada bloque debe presentar objetivo, resultado de aprendizaje, actividades, duración, recursos, evidencia y criterio de evaluación.
4. Implementa tres experiencias académicas diferenciadas: **profesor**, **estudiante** y **solo lectura**. Aplica autorización en servidor, no únicamente ocultando controles visuales.
5. El modo **solo lectura** muestra únicamente la información pública o expresamente habilitada por el docente; nunca muestra matrículas, datos personales, entregas, calificaciones, retroalimentación privada ni materiales restringidos.
6. La tarjeta inicial del diplomado debe admitir una imagen configurable, con la referencia lógica `1_Ciberseguridad`. Si no existe el archivo real, presenta un placeholder accesible y no una imagen rota.
7. Especifica cada pestaña, botón, enlace y acción relevante: estado inicial, comportamiento al hacer clic, datos mostrados, permisos requeridos, estado vacío, confirmación y errores.
8. Usa Andina Logística S.A.S. como empresa ficticia transversal para riesgo, arquitectura, playbook, TTX y ejercicios de mesa. No introduzcas datos de empresas o personas reales en materiales simulados.
9. Los ejercicios de amenazas son **educativos y defensivos**. La simulación Red vs. Blue se resuelve con cartas, decisiones y bitácoras en un entorno de mesa; no debe ejecutar ataques, escanear redes, recolectar credenciales ni interactuar con sistemas de terceros.
10. Diseña para crecimiento por cursos, cohortes, bloques, recursos y futuras integraciones/agentes. Mantén límites claros entre contenido, progreso, evaluación, identidad y analítica.
11. Haz accesibles las interacciones con teclado y lector de pantalla; incluye etiquetas, foco visible, contraste suficiente, texto alternativo y mensajes de estado comprensibles.
12. No publiques ni certifiques automáticamente el programa. La institución debe validar los supuestos operativos, materiales, referencias y políticas de aprobación.
13. Antes de decisiones irreversibles o institucionales (plataforma destino, identidad institucional, política de solo lectura, nota aprobatoria, integración con Moodle, alojamiento y retención de datos), presenta opciones y pide aprobación. Si no se puede preguntar, deja el valor explícitamente configurable.
14. Entrega una solución coherente de extremo a extremo: navegación funcional, estados de carga/vacío/error, permisos, datos semilla de demostración no personales, pruebas y documentación de operación.

### Resultado esperado del equipo de desarrollo

- Una aplicación adaptable a escritorio, tableta y móvil.
- Un catálogo que presenta el diplomado mediante una tarjeta seleccionable.
- Un aula digital con navegación por módulos y bloques, actividades, recursos, evidencias y evaluación.
- Un panel de estudiante, un espacio de trabajo docente y una vista de solo lectura con permisos limitados.
- Una estructura curricular editable y trazable a resultados de aprendizaje.
- Una arquitectura con interfaces desacopladas que permita incorporar cursos e integraciones en el futuro sin reescribir el núcleo.
- Pruebas que verifiquen rutas, permisos, progreso, evaluación, accesibilidad básica y seguridad de los ejercicios.

---

## 2. Alcance y principios del producto

### 2.1 En alcance

- Un diplomado inicial: **Diplomado en Ciberseguridad**.
- Catálogo, vista del curso, módulos, bloques, materiales y actividades.
- Roles profesor, estudiante y solo lectura.
- Gestión de avance, entregas, cuestionarios, rúbricas, notas y asistencia según autorización.
- Experiencias asincrónicas que adapten las actividades originalmente presenciales sin perder su objetivo pedagógico.
- Materiales interactivos reutilizables: Tabla Periódica de Acrónimos, sopa de letras, Cyberópolis y Sala de Crisis.
- Actividades colaborativas, escenarios ficticios y simulación Red vs. Blue basada en turnos.
- Preparación y publicación del contenido por parte del profesor.
- Base para agregar diplomados adicionales y futuras integraciones.

### 2.2 Fuera de alcance salvo aprobación posterior

- Ataques técnicos reales, laboratorios sobre infraestructura ajena o despliegue de malware.
- Emisión automática de certificados con validez institucional sin integración y aprobación formal.
- Decisiones legales automatizadas sobre tipificación de delitos.
- Publicar datos clasificados, expedientes reales, datos personales de víctimas o información de casos en curso.
- Afirmar una integración existente con Moodle, Kahoot, Slido, TED, sistemas institucionales o proveedores de identidad si no se ha implementado y probado.
- Sustituir la revisión disciplinar, jurídica o institucional del currículo.

### 2.3 Principios de experiencia

1. **Orientación:** el estudiante siempre puede responder “dónde estoy, qué debo hacer y qué sigue”.
2. **Práctica guiada:** explicar brevemente, mostrar un ejemplo seguro, permitir practicar y cerrar con reflexión.
3. **Progreso visible:** mostrar avance por bloque y módulo, sin confundir actividad vista con aprendizaje demostrado.
4. **Retroalimentación formativa:** indicar qué estuvo bien, qué se puede mejorar y cuál es el siguiente paso.
5. **Aprendizaje adulto:** conectar conceptos con decisiones organizacionales, casos y experiencia profesional.
6. **Seguridad por defecto:** minimizar datos, restringir permisos, proteger evidencias y usar escenarios ficticios.
7. **Accesibilidad e inclusión:** lenguaje comprensible, navegación por teclado, subtítulos/transcripciones y alternativas a interacciones visuales.
8. **Trazabilidad:** vincular resultados de aprendizaje (RA), bloques, evidencias, instrumentos y calificaciones.

---

## 3. Roles y autorización

### 3.1 Profesor

Puede, dentro de los cursos que tenga asignados:

- Crear, editar, ordenar, programar, publicar y archivar contenidos y actividades.
- Administrar cohortes, grupos, parejas, roles rotativos y fechas.
- Configurar recursos, cuestionarios, intentos, ventanas de entrega y rúbricas.
- Consultar progreso, asistencia, respuestas, entregas y calificaciones de sus estudiantes.
- Calificar, devolver trabajos y publicar retroalimentación.
- Gestionar los contenidos de invitados y registrar la participación correspondiente.
- Exportar reportes académicos cuando esté autorizado por la institución.

No debe poder ver o modificar información de cursos ajenos salvo que tenga una autorización administrativa explícita.

### 3.2 Estudiante

Puede:

- Consultar el contenido publicado de los cursos en los que está matriculado.
- Ver su propio avance, calendario, resultados, retroalimentación y estado de asistencia.
- Realizar cuestionarios, participar en actividades, entregar trabajos y consultar recursos.
- Ver productos compartidos de su grupo únicamente cuando el profesor los haya habilitado.
- Editar su perfil en los campos permitidos y elegir preferencias de accesibilidad.

No puede ver las calificaciones, entregas privadas, datos personales ni progreso individual de otros estudiantes. Las entregas colaborativas muestran solo los datos que la institución y el docente hayan habilitado.

### 3.3 Solo lectura

Puede consultar una vista de demostración o contenido marcado como público por el profesor. Por defecto:

- Puede ver descripción del diplomado, objetivos publicados, estructura general, títulos de módulos y una muestra de contenido.
- No puede matricularse, cambiar datos, participar, descargar archivos protegidos ni enviar formularios académicos.
- No puede ver directorios de curso, participantes, asistencia, notas, respuestas, entregas, informes docentes o comentarios privados.
- No puede descubrir recursos no publicados mediante URL directa, API, búsqueda o exportación.

La institución debe decidir qué contenido exacto constituye la “muestra de solo lectura”. Esta decisión se representa mediante una política configurable por curso.

### 3.4 Administración de plataforma

Si la plataforma requiere una cuenta técnica de administración, limitarla a configuración, identidad, permisos y operación. No confundir este rol con el profesor ni conceder automáticamente acceso académico a todos los datos. Registrar las acciones administrativas sensibles.

### 3.5 Reglas de autorización

- Denegar por defecto y validar el permiso en cada operación de lectura y escritura.
- Aplicar alcance por curso y, cuando corresponda, por cohorte/grupo.
- No usar solamente controles de interfaz para proteger datos.
- Aplicar el mismo modelo a páginas, archivos, API, búsquedas, notificaciones y exportaciones.
- Registrar cambios importantes (publicación, cambio de rúbrica, calificación, exportación y asignación de rol).
- Evitar que mensajes de error revelen si existe una cuenta o una matrícula no autorizada.

---

## 4. Mapa de navegación y comportamiento de cada pestaña

### 4.1 Barra global

Elementos: marca EGIDA_MOODLE, navegación principal según rol, indicador de notificaciones, selector de accesibilidad/idioma si está disponible y menú de cuenta.

- **Clic en marca:** volver al panel correspondiente al rol.
- **Notificaciones:** abrir una lista de avisos del curso (calificación publicada, fecha límite, contenido actualizado). No incluir datos sensibles en el asunto ni en una notificación visible a terceros.
- **Menú de cuenta:** perfil, preferencias, ayuda y cierre de sesión.
- **Navegación por teclado:** `Tab` recorre controles, `Enter` activa, `Esc` cierra menús/dialogs; el foco vuelve al control que abrió un diálogo.
- **Sesión expirada:** conservar borradores locales cuando sea seguro, solicitar autenticación de nuevo y explicar si una operación no se guardó.

### 4.2 Inicio / catálogo

**Propósito:** presentar los cursos disponibles sin sobrecargar la pantalla.

- Mostrar encabezado con propósito de la plataforma, acción principal y cursos disponibles para el rol.
- Tarjeta inicial del diplomado con imagen configurable `1_Ciberseguridad`, título, resumen, duración (30 h), modalidad definida y estado de matrícula.
- La tarjeta completa puede seleccionarse; los botones internos deben tener una acción distinta y accesible.
- **Clic en tarjeta:** abrir la ficha del diplomado.
- **Clic en “Continuar”:** abrir el próximo bloque no completado para un estudiante matriculado; si no está matriculado, mostrar la acción de solicitud o matrícula permitida.
- **Clic en “Ver programa”:** abrir la vista pública de objetivos, módulos y duración.
- **Estado vacío:** explicar que aún no hay cursos disponibles y ofrecer contacto institucional, no mostrar una pantalla en blanco.
- **Solo lectura:** mostrar únicamente tarjetas marcadas como públicas; no revelar cupos o datos de matrícula restringidos.

### 4.3 Ficha del diplomado

Pestañas:

1. **Resumen:** descripción, para quién es, duración, modalidad, requisitos, objetivos y estado de matrícula.
2. **Programa:** módulos, bloques, horas, resultados de aprendizaje y secuencia.
3. **Metodología:** ciclo activar → modelar → practicar → transferir → verificar; métodos activos y trabajo colaborativo.
4. **Evaluación:** componentes, pesos, escala y criterios de aprobación vigentes. Mostrar como “pendiente de validación institucional” si los supuestos aún no se han confirmado.
5. **Recursos:** materiales de muestra o publicados, con tipo, tamaño, descripción, accesibilidad y permiso de descarga.
6. **Equipo docente/invitados:** mostrar solo perfiles que hayan autorizado su publicación; nunca exponer datos personales de contacto sin permiso.

Acciones:

- **“Inscribirme/Solicitar acceso”:** habilitar solo si la política de matrícula está configurada; validar autenticación, cupo y fechas.
- **“Entrar al aula”:** visible para estudiantes matriculados y profesores asignados.
- **“Vista previa”:** abre únicamente contenido público.
- **Cambiar pestaña:** conservar la pestaña en la URL o el estado de navegación; soportar atrás/adelante del navegador.

### 4.4 Panel del estudiante

Secciones:

- **Continuar aprendiendo:** próximo bloque disponible, progreso y acción para retomarlo.
- **Mis cursos:** tarjetas de cursos matriculados.
- **Progreso:** avance por bloque y módulo, entregas pendientes, actividades evaluadas y fechas importantes.
- **Calendario:** sesiones, cierres y eventos publicados, con zona horaria visible.
- **Actividad reciente:** cambios y retroalimentación propia.

El porcentaje de progreso debe derivarse de reglas transparentes y configurables (por ejemplo, bloques requeridos completados), no de tiempo de pantalla únicamente. No marcar automáticamente como aprendido un bloque por abrirlo.

### 4.5 Aula del curso

Diseño recomendado:

- Panel lateral: módulos y bloques con indicadores de disponible, en curso, entregado, evaluado y completado.
- Área central: título, objetivo, RA asociado, tiempo estimado, agenda, actividad y recursos del bloque.
- Panel contextual: instrucciones, fechas, rúbrica, ayuda y evidencia esperada.
- Botones **Anterior**, **Guardar borrador**, **Marcar como revisado** (solo si la actividad lo permite) y **Siguiente**.

Reglas:

- Bloques futuros pueden mostrarse bloqueados por prerrequisito si el profesor lo configura; explicar cómo desbloquearlos.
- Un profesor puede previsualizar como estudiante sin modificar datos reales.
- Los indicadores de estado deben tener texto además del color.
- Al avanzar, guardar el trabajo antes de cambiar de bloque y reportar claramente cualquier fallo.

### 4.6 Pestaña “Contenido”

- Mostrar las lecciones, microclases, lecturas, videos y glosario publicados para el bloque.
- Al hacer clic en un recurso, abrir un visor accesible o descargarlo si el permiso lo permite.
- Los videos deben mostrar título, duración, autoría, subtítulos/transcripción disponibles y enlace alternativo si el proveedor no está disponible.
- Si un enlace externo falla, indicar el fallo y ofrecer el material alternativo aprobado, sin reemplazarlo silenciosamente.
- Marcar visualmente recursos requeridos y opcionales.

### 4.7 Pestaña “Actividades”

- Listar actividades requeridas y opcionales, individuales y grupales, con instrucciones, tiempo, fecha límite, forma de entrega y rúbrica.
- **Abrir actividad:** presentar objetivo, pasos, recursos necesarios, criterios, límites de seguridad y botón de inicio.
- **Iniciar:** crear un intento cuando corresponda y advertir si el intento es cronometrado.
- **Guardar borrador:** guardar progreso parcial y fecha/hora de última actualización.
- **Entregar:** mostrar resumen de archivos/respuestas; pedir confirmación final; generar recibo con fecha y estado.
- **Después de entregar:** mostrar estado “entregada”, “en revisión”, “requiere cambios” o “calificada”.
- Si se vence la fecha límite, aplicar la política configurada y explicar si se acepta una entrega tardía.
- Para trabajo grupal, mostrar miembros autorizados, responsable de entrega y reglas de coevaluación.

### 4.8 Pestaña “Cuestionarios”

- Mostrar propósito, temas, número de preguntas, duración si aplica, intentos permitidos, fecha de cierre y política de retroalimentación.
- Antes de iniciar, explicar si el cuestionario es diagnóstico o calificable.
- Durante el intento, ofrecer navegación coherente, guardado de respuestas y confirmación de envío.
- No revelar respuestas correctas antes de la fecha o condición definida por el profesor.
- Tras el envío, presentar puntuación y retroalimentación conforme a la política del curso.
- Si se pierde la conexión, conservar respuestas de forma segura cuando sea técnicamente posible e informar qué se pudo guardar.

### 4.9 Pestaña “Entregas y calificaciones”

- El estudiante ve únicamente sus entregas, notas, rúbricas y retroalimentación.
- El profesor ve herramientas de revisión dentro de sus cursos, con filtros por actividad, grupo y estado.
- Mostrar ponderación, nota obtenida, escala, estado de publicación y rúbrica aplicada.
- No calcular aprobación final si faltan componentes o la política está sin validar; mostrar “resultado provisional”.
- Para notas grupales, exponer cómo se aplicó la coevaluación y el factor individual entre 0,8 y 1,0, cuando corresponda.
- Cada cambio de nota debe quedar auditado y notificarse al estudiante de forma privada.

### 4.10 Pestaña “Recursos”

Organizar por bloque y tipo: diapositivas, guías, plantillas, videos, juegos, casos, cuestionarios y referencias.

- Filtros por módulo, tipo y condición (requerido/opcional).
- Buscar solo recursos autorizados para el usuario.
- Mostrar disponibilidad, tamaño, fecha de actualización y derechos/atribución cuando aplique.
- No copiar ni redistribuir material de terceros sin revisar licencias y permisos.
- Solucionarios y claves docentes solo son visibles para el profesor autorizado.

### 4.11 Pestaña “Foro / colaboración”

- Habilitar preguntas, discusión de conceptos y coordinación de equipos según configuración docente.
- Separar el espacio de anuncios (solo profesor publica) de los foros de discusión.
- Permitir reportar contenido inapropiado y moderación docente.
- No requerir que se publiquen datos personales, incidentes laborales reales, secretos ni información clasificada.
- La visibilidad de publicaciones y archivos debe seguir los límites de curso/grupo.

### 4.12 Pestaña “Calendario”

- Vista mensual y agenda accesible.
- Filtros por sesiones, entregas y eventos.
- Al seleccionar un evento, mostrar fecha, hora local, bloque relacionado, instrucciones y enlace autorizado.
- Los cambios de fechas deben generar notificación y conservar el historial del cambio.

### 4.13 Área del profesor

Pestañas del curso:

1. **Resumen docente:** actividad pendiente de calificar, alertas de curso y próximos eventos.
2. **Contenido:** estructura de módulos/bloques, edición, borrador, vista previa y publicación.
3. **Participantes:** lista limitada a cursos propios; grupos, parejas y roles rotativos.
4. **Actividades y cuestionarios:** creación/configuración, intentos y estado.
5. **Calificaciones:** libro de notas, rúbricas, revisión y publicación.
6. **Asistencia:** registro por bloque; correcciones justificadas y auditadas.
7. **Analítica:** avance agregado, preguntas con bajo desempeño y KPIs académicos permitidos.
8. **Configuración:** fechas, modalidad, umbrales, política de lectura, enlaces y visibilidad.

Acciones críticas (publicar, cambiar ponderación, borrar una actividad con entregas, cambiar nota o exportar datos) deben mostrar impacto y confirmación. Preferir archivar/desactivar frente a borrar contenido con evidencia histórica.

### 4.14 Interactivos didácticos

- **Tabla Periódica de Acrónimos:** filtrar por categoría, seleccionar un término, ver definición, ejemplo defensivo y conexión con riesgo/CIA. Permitir reto de 10 acrónimos y verificación cruzada.
- **Sopa de letras de vocabulario:** instrucciones accesibles; selección alternativa por lista/teclado; 28 términos; al cierre, pedir explicar dos conceptos en lenguaje de riesgo. El solucionario solo está disponible al profesor.
- **Sopa de Ciberataques:** juego de reconocimiento de 14 tipos de ataque; usar exclusivamente nombres/descripciones educativas, sin instrucciones de ejecución.
- **Cyberópolis:** tablero ficticio de gestión de activos, incidentes y decisiones organizacionales; explicar consecuencias pedagógicas de cada elección.
- **Sala de Crisis:** consola TTX con escenario, inyecciones, roles, tablero de impacto y registro de decisiones. Debe ser una simulación, no una consola de administración real.

### 4.15 Modo solo lectura

- Mostrar una banda “Vista de solo lectura”.
- Deshabilitar acciones de participación con explicación accesible; no mostrar botones engañosos.
- Proteger también las rutas directas de contenido, descargas, API y resultados.
- Ofrecer una acción de contacto o solicitud de acceso solo si la institución la configura.

---

## 5. Estructura curricular que debe cargar el producto

### 5.1 Datos generales

- **Nombre:** Diplomado en Ciberseguridad.
- **Tipo:** Educación continua, no conducente a título.
- **Duración:** 30 horas; 15 bloques de 2 horas.
- **Componente formativo:** B01–B13, 26 h.
- **Invitados:** B14–B15, 4 h.
- **Distribución global:** 540 minutos de teoría y 1260 minutos de práctica.
- **Trabajo colaborativo:** equipos base de cuatro, divididos en parejas fijas; simulación en células de ocho (4 vs. 4).
- **Hilo conductor:** Andina Logística S.A.S., organización ficticia.
- **Público:** mixto, sin formación técnica previa requerida.

### 5.2 Competencia general

Gestionar de manera estratégica, ética y legal la ciberseguridad en contextos organizacionales y del sector Seguridad y Defensa, integrando gobierno, prevención, detección, respuesta y recuperación ante amenazas digitales.

### 5.3 Resultados de aprendizaje

- **RA1:** Explicar fundamentos de ciberseguridad (triada CIA, activo, amenaza, vulnerabilidad, riesgo y control) aplicados a una organización, con al menos 80 % de conceptos correctos.
- **RA2:** Analizar familias de malware e ingeniería social e identificar indicadores en muestras simuladas, con al menos 80 % de acierto en T2.
- **RA3:** Analizar un incidente de impacto mundial con Cyber Kill Chain y MITRE ATT&CK, identificando vector, impacto, controles ausentes y lecciones, con nivel satisfactorio o superior en R1.
- **RA4:** Evaluar riesgos y proponer controles alineados con NIST CSF 2.0 e ISO/IEC 27001:2022, priorizados por probabilidad e impacto y coherentes en T4.
- **RA5:** Diseñar un playbook de respuesta a ransomware y tomar decisiones en un TTX bajo presión, coherentes con NIST SP 800-61r3.
- **RA6:** Participar en una simulación de mesa Red vs. Blue, evaluar decisiones y justificar límites éticos y legales (Ley 1273 de 2009), según R2.
- **RA7:** Argumentar una postura crítica en un ensayo académico con APA 7, con nivel satisfactorio o superior en R3.

### 5.4 Módulos y bloques

| Unidad | Nombre | Bloques | Horas |
|---|---|---:|---:|
| M1 | Fundamentos y panorama de amenazas | B01–B02 | 4 |
| M2 | Ataques, ingeniería social y factor humano | B03–B04 | 4 |
| M3 | Incidentes de impacto mundial: estudios de caso | B05–B06 | 4 |
| M4 | Gestión de riesgos y arquitectura defensiva | B07–B08 | 4 |
| M5 | Respuesta a incidentes y gestión de crisis | B09–B10 | 4 |
| M6 | Simulación Red Team vs. Blue Team | B11–B12 | 4 |
| EV | Evaluación final: ensayo | B13 | 2 |
| IN | Perspectiva país: invitados | B14–B15 | 4 |

### 5.5 Especificación de los 15 bloques

Cada bloque digital debe incluir: objetivo, RA, duración, agenda, materiales, actividad principal, evidencia, instrumento/rúbrica, modo individual/grupal, instrucciones, criterio de finalización, reflexión final y siguiente paso. Adaptar los minutos de actividad a asincronía sin alterar las 2 h equivalentes del bloque ni su balance teórico-práctico global sin aprobación.

| Bloque | Tema y resultado principal | Actividades y evidencia esperada |
|---|---|---|
| **B01 (0–2 h)** | Apertura y fundamentos; RA1. | Encuadre, reglas y ética; equipos de cuatro y parejas; Q0 diagnóstico no calificable (10 ítems); conceptos de ciberespacio, CIA, activo, amenaza, vulnerabilidad, riesgo y control; T1: cinco activos y escenario de riesgo; exploración de acrónimos y ticket de salida. |
| **B02 (2–4 h)** | Amenazas, actores y vocabulario; RA1–RA2. | Reto de acrónimos; actores, motivaciones, superficie de ataque y megatendencias; reflexión V1; sopa de letras de 28 términos y explicación de dos en lenguaje de riesgo; Q1 (8 ítems). |
| **B03 (4–6 h)** | Malware, ransomware e ingeniería social; RA2. | Familias de malware y conceptos de ingeniería social; Sopa de Ciberataques (14 conceptos); T2: seis muestras totalmente ficticias y decisión reportar/eliminar/verificar; reflexión V2. |
| **B04 (6–8 h)** | Factor humano e higiene digital; RA2. | Sesgos, cultura de seguridad, MFA, passkeys y contraseñas; juego Cyberópolis; T3 checklist de higiene digital; Q2 (8 ítems). Consultas de exposición personal son voluntarias y no deben recopilar credenciales ni datos de cuentas. |
| **B05 (8–10 h)** | Análisis forense-estratégico de casos; RA3. | Método del caso, Cyber Kill Chain y MITRE ATT&CK; sorteo de casos y roles; cronología, vector, TTP, CIA, impactos, controles, respuesta y lecciones; avance revisado por el docente. |
| **B06 (10–12 h)** | Pitch y patrones transversales; RA3. | Presentación de casos; reflexión V3; matriz comparativa de vector, permanencia, control fallido e impacto; síntesis sobre identidad, parches, terceros, segmentación, respaldo y gobernanza. |
| **B07 (12–14 h)** | Riesgos y marcos; RA4. | Q3 (8 ítems); ISO 31000/27005, NIST CSF 2.0, ISO/IEC 27001:2022, CIS Controls y Ley 1581; T4: matriz 5×5 con ocho riesgos de Andina Logística y controles; galería y coevaluación. |
| **B08 (14–16 h)** | Arquitectura defensiva, Zero Trust y SOC; RA4. | Defensa en profundidad, IAM/PAM, segmentación, EDR/XDR, SIEM/SOAR/SOC, vulnerabilidades, respaldos e IA defensiva; “Arma tu SOC”; T5 arquitectura objetivo de Andina Logística; Q4 (8 ítems). |
| **B09 (16–18 h)** | Respuesta a incidentes y continuidad; RA5. | NIST SP 800-61r3, CSIRT/SOC, evidencia y cadena de custodia, comunicaciones, BCP/DRP, RTO/RPO; T6 playbook de seis fases; ejercicio DDoS simulado con bitácora, sin generar tráfico real. |
| **B10 (18–20 h)** | TTX: Sala de Crisis; RA5. | Briefing, roles de comité, escenario ficticio e inyecciones cada 10 minutos; decisiones documentadas, tablero de impacto, hot wash y formato de resolución. |
| **B11 (20–22 h)** | Simulación Red vs. Blue I; RA6. | Reflexión V4; briefing y reglas de enfrentamiento; planeamiento; asignación de controles y rondas 1–3 mediante cartas y decisiones en papel/interfaz de mesa; bitácora. |
| **B12 (22–24 h)** | Simulación Red vs. Blue II y AAR; RA6. | Rondas 4–6, revisión White Cell, resultados, informe ejecutivo Blue, intercambio de perspectiva Red/Blue, AAR y mejoras priorizadas. |
| **B13 (24–26 h)** | Ensayo final; RA7. | Ensayo individual de 90 minutos, 800–1100 palabras, APA 7, al menos dos fuentes del diplomado y hoja de apuntes de una página; cierre, encuesta y preparación de preguntas a invitados. El uso de IA generativa durante la prueba queda sujeto a la política del docente y debe mostrarse claramente. |
| **B14 (26–28 h)** | Invitado: ciberdelitos y ciberdelincuencia; insumo RA7. | Conferencia, conversatorio, tres situaciones ficticias sobre marco legal/ruta de denuncia/preservación de evidencia y ticket de salida. No usar casos en curso ni víctimas identificables. |
| **B15 (28–30 h)** | Invitado: ciberseguridad y ciberdefensa en Seguridad y Defensa; insumo RA7. | Conferencia, diálogo, miniescenario no clasificado de infraestructura crítica, coordinación/prioridades, cierre y certificación institucional. |

### 5.6 Secuencia didáctica

Cada bloque aplica el ciclo:

1. **Activar:** pregunta, reto o recuperación breve de conocimientos.
2. **Modelar:** microclase de 25–40 minutos como máximo, con preguntas detonantes.
3. **Practicar:** tarea guiada individual, en parejas o en equipos.
4. **Transferir:** conectar con una organización, decisión o escenario.
5. **Verificar:** cuestionario, evidencia, coevaluación o ticket de salida.

Métodos: aprendizaje basado en juegos, reflexión con videos, método del caso, aprendizaje basado en problemas, TTX, simulación de mesa y diálogo con expertos.

### 5.7 Equipos y calendario

- Equipos base de cuatro estables; parejas fijas.
- Roles rotativos: líder, analista técnico, analista legal/negocio y relator; nadie repite rol en dos talleres consecutivos.
- Si el tamaño de cohorte no es múltiplo de cuatro, admitir como máximo dos equipos de tres o cinco; nunca dejar personas trabajando solas.
- Toda nota grupal puede ajustarse con coevaluación entre 0,8 y 1,0 según política configurada.
- Ofrecer calendario de ocho jornadas (pares de bloques de 4 h, con B13 de 2 h) o 15 sesiones de 2 h.
- B05–B06 se recomienda consecutivo; B11–B12 debe ser el mismo día o en días consecutivos.

---

## 6. Componentes, actividades y evaluación

### 6.1 Talleres

| Código | Bloque | Producto |
|---|---|---|
| T1 | B01 | Inventario de cinco activos, valoración CIA y escenario de riesgo. |
| T2 | B03 | Matriz de indicadores de seis muestras ficticias y decisión justificada. |
| T3 | B04 | Checklist de higiene digital: MFA, gestor de contraseñas y privacidad. |
| T4 | B07 | Matriz 5×5, ocho riesgos y controles mapeados a CSF 2.0. |
| T5 | B08 | Diagrama de arquitectura objetivo y justificación. |
| T6 | B09 | Playbook de seis fases con responsables y tiempos. |

Las seis muestras de phishing de T2 deben llevar la etiqueta **“material de entrenamiento”**, usar identidades y dominios inventados y no enviarse como mensajes reales sin aviso y autorización institucional.

### 6.2 Cuestionarios

| Código | Bloque | Ítems | Tratamiento |
|---|---|---:|---|
| Q0 | B01 | 10 | Diagnóstico de línea base, no calificable. Puede repetirse al cierre de B12 para medir avance. |
| Q1 | B02 | 8 | Fundamentos, actores y vocabulario. |
| Q2 | B04 | 8 | Malware, ingeniería social y factor humano. |
| Q3 | B07 | 8 | Casos y marcos de análisis. |
| Q4 | B08 | 8 | Riesgo, marcos y arquitectura defensiva. |

La fuente propone Kahoot o Slido y retroalimentación inmediata. La aplicación debe poder ejecutarlos de forma nativa o integrar un proveedor mediante un adaptador; no afirmar integración hasta probarla. La nota de cuestionarios Q1–Q4 equivale al 10 % total (2,5 % cada uno).

### 6.3 Casos

Casos de referencia:

- **Set A:** ILOVEYOU (2000), Stuxnet (2010), Target (2013), Sony Pictures (2014), WannaCry (2017).
- **Set B:** NotPetya (2017), Equifax (2017), SolarWinds/SUNBURST (2020), Colonial Pipeline (2021), MOVEit Transfer (2023).
- Casos regionales de reserva: Guacamaya (2022), IFX Networks (2023).

La selección debe ajustarse a matrícula (5 o 10 casos); los datos se deben contrastar con fuentes primarias antes de publicar cada formato. El informe de caso contiene ficha del incidente y nivel de confianza de atribución, cronología, vector, mapeo Kill Chain/ATT&CK, impacto CIA y organizacional, controles/CSF, respuesta, tres lecciones aplicables a Colombia y mínimo tres fuentes en APA 7.

**R1 — rúbrica del caso:** reconstrucción 20 %, mapeo técnico 20 %, impacto 20 %, controles y lecciones 25 %, comunicación 15 %.

### 6.4 Reflexiones de video

Cuatro videos propuestos en el documento fuente:

- V1 Mikko Hyppönen, “Fighting viruses, defending the net”, B02.
- V2 James Lyne, “Everyday cybercrime — and what you can do about it”, B03.
- V3 Ralph Langner, “Cracking Stuxnet, a 21st-century cyber weapon”, B06.
- V4 Keren Elazari, “Hackers: the Internet’s immune system”, B11.

Antes de cada uso, comprobar disponibilidad de subtítulos en español y ofrecer alternativa accesible autorizada. Formato de reflexión: hechos, inferencias, hipótesis, conexión con el diplomado, recomendaciones priorizadas y pregunta abierta.

**R4 — rúbrica provisional:** hechos 20 %, inferencias e hipótesis 30 %, conexión 25 %, recomendaciones 25 %. El formato/rúbrica se reemplazará cuando la institución defina la versión oficial.

### 6.5 Evaluación total

| Componente | Evidencia | Peso |
|---|---|---:|
| Talleres y participación | T1–T6, Cyberópolis y resolución TTX | 20 % |
| Cuestionarios | Q1–Q4 | 10 % |
| Reflexiones de video | V1–V4 | 15 % |
| Estudio de caso | Informe y pitch, R1 | 20 % |
| Simulación Red vs. Blue | Productos y AAR, R2 | 15 % |
| Ensayo final | Individual, R3 | 20 % |
| **Total** |  | **100 %** |

- Escala propuesta: 0,0 a 5,0.
- Umbral propuesto: nota final ≥ 3,5/5,0 y asistencia ≥ 80 % (24/30 h).
- Niveles: Excelente 4,6–5,0; Satisfactorio 4,0–4,5; Básico 3,0–3,9; Insuficiente < 3,0.
- Los umbrales anteriores son **supuestos SO-6 sujetos a validación**. Deben residir en la configuración del curso y mostrarse como provisionales hasta aprobación.

**R2 — simulación:** planeamiento 20 %, coherencia técnica 25 %, adaptación 20 %, trabajo en equipo 15 %, ética/ROE/AAR 20 %.

**R3 — ensayo:** tesis 20 %, argumentación/evidencia 25 %, integración conceptual 20 %, pensamiento crítico/estratégico 20 %, estructura/redacción 15 %. Preguntas detonantes propuestas: ciberseguridad como problema técnico o de gobierno; prioridades ante ransomware/cadena de suministro; límites éticos y legales del hacking ético; IA como ventaja defensiva u ofensiva.

### 6.6 TTX y simulación Red vs. Blue: reglas no negociables

- Escenario de Andina Logística S.A.S.: empresa ficticia de logística con WMS, portal de clientes y red OT; activos prioritarios: datos de clientes y continuidad del WMS.
- Simulación por cartas/turnos; Red y Blue toman decisiones abstractas y registran resultados.
- Blue planifica controles; Red utiliza cartas autorizadas del mazo; White Cell resuelve discrepancias e inyecciones.
- Las cartas representan conceptos de MITRE ATT&CK y controles defensivos de NIST CSF 2.0; la aplicación no enseña a ejecutar técnicas en sistemas reales.
- ROE: no atacar personas ni sistemas reales; usar únicamente los materiales de la actividad; White Cell tiene la decisión final; registrar decisiones; discutir ética y marco legal colombiano.
- Incluir las seis fases de ronda del programa y al menos dos inyecciones que exijan decisiones de comunicación y continuidad.
- Productos: plan Red de una página, bitácora/informe ejecutivo Blue de una página y AAR conjunto con tres mejoras priorizadas.
- La variante de cyber range queda desactivada por defecto. Solo puede habilitarse con aprobación institucional, entorno aislado, autorización escrita, reglas de enfrentamiento y tareas defensivas equivalentes. Nunca probar terceros.
- La calificación depende de R2, no de quién “gana” la simulación.

---

## 7. Modelo de contenido y datos recomendado

Usar entidades normalizadas o equivalentes, con identificadores estables y relaciones trazables:

- **Usuario:** identidad, preferencias y estado.
- **Rol/permiso:** asignación por curso y alcance.
- **Curso:** título, descripción, imagen, versión, modalidad, configuración y estado de publicación.
- **Cohorte/matrícula:** estudiante, curso, estado y fechas.
- **Módulo:** orden, título, horas y descripción.
- **Bloque:** orden, duración, objetivo, agenda y estado.
- **Resultado de aprendizaje:** código, texto, nivel y competencia asociada.
- **Relación de trazabilidad:** RA ↔ módulo/bloque ↔ actividad/evidencia ↔ rúbrica.
- **Recurso:** tipo, URI, versión, licencia/atribución, accesibilidad y visibilidad.
- **Actividad:** instrucciones, modo individual/grupal, fechas, criterios, intentos y política.
- **Cuestionario/intento/respuesta:** preguntas, versiones, respuestas y puntuación, con acceso restringido.
- **Grupo/pareja/rol rotativo:** membresía y asignaciones por bloque.
- **Entrega/evidencia:** propietario individual o grupo, versión, fecha, archivos y estado.
- **Rúbrica/criterio/resultado:** escala, pesos, descriptores, calificador y publicación.
- **Registro de asistencia:** bloque, estado, corrección y autor del cambio.
- **Evento/notificación:** destinatarios autorizados, contenido y estado de lectura.
- **Auditoría:** acción sensible, actor, recurso, fecha y resultado.

### 7.1 Reglas de datos

- Registrar el mínimo de información personal necesario.
- Definir retención, borrado, exportación y acceso conforme a la política institucional y la normativa aplicable.
- No almacenar contraseñas de servicios externos, secretos ni material clasificado.
- Evitar incluir secretos en logs y analítica.
- Versionar cambios curriculares y rúbricas para que una calificación histórica conserve el instrumento usado.
- Tratar materiales docentes (respuestas, solucionarios, notas privadas) como recursos con permisos separados.
- Mantener una fuente de verdad para progreso y notas; evitar estados calculados distintos entre interfaz y reportes.

---

## 8. Arquitectura y escalabilidad

La arquitectura concreta depende del repositorio y de la infraestructura institucional; no asumir un stack tecnológico sin inspeccionar el proyecto y acordarlo. Separar, como mínimo:

1. **Experiencia web:** componentes accesibles, navegación y estado de usuario.
2. **Servicios de curso:** catálogo, módulos, bloques, recursos y publicación.
3. **Servicios de aprendizaje:** actividades, entregas, cuestionarios, progreso y calificaciones.
4. **Identidad y autorización:** sesión, roles, alcance de curso y permisos.
5. **Persistencia y archivos:** datos académicos y almacenamiento protegido de evidencias.
6. **Integraciones:** adaptadores independientes para Moodle/LMS, identidad institucional, correo/notificaciones y herramientas de cuestionario.
7. **Auditoría y analítica:** eventos mínimos, agregados y protegidos.

### 8.1 Compatibilidad con Moodle

El nombre EGIDA_MOODLE no demuestra por sí solo si se requiere un plugin de Moodle, una aplicación externa o una plataforma independiente. Diseñar una frontera de integración para poder elegir posteriormente entre:

- curso/recursos publicados en Moodle;
- herramienta externa integrada con enlaces o LTI, si la institución lo aprueba;
- aplicación propia con sincronización autorizada de identidad, matrícula, finalización o notas.

No duplicar calificaciones ni identidades entre sistemas sin acordar cuál sistema es la fuente de verdad. Antes de implementar una integración, verificar versión de Moodle, capacidades disponibles, permisos, mecanismo de autenticación y requisitos de privacidad.

### 8.2 Extensibilidad por agentes

Diseñar el producto para futuras funciones asistidas por agentes sin otorgarles acceso irrestricto:

- Cada agente futuro debe tener propósito, entradas, salidas, herramientas permitidas, permisos, responsable humano y registro de acciones claramente definidos.
- Proponer interfaces acotadas (por ejemplo, generar borrador de actividad, resumir progreso agregado, sugerir retroalimentación) que no permitan alterar notas, publicar cursos ni enviar mensajes sin revisión humana.
- Aplicar permisos mínimos, validación de salida, protección de datos personales y trazabilidad.
- No usar contenido de estudiantes para entrenar modelos sin autorización y base institucional explícita.
- Mostrar cuándo una respuesta fue generada o asistida por IA, permitir revisión/corrección y ofrecer canal de reporte.
- Mantener la operación académica disponible si un agente o proveedor externo no está disponible.
- No introducir agentes durante evaluaciones donde el uso de IA esté prohibido.

---

## 9. Seguridad, privacidad y uso responsable

- Autenticación segura y protección de sesión de acuerdo con la plataforma seleccionada.
- Autorización en servidor, validación de entradas y protección de cargas/descargas.
- Limitar tipos y tamaños de archivo; analizar cargas con controles aprobados; no exponer archivos mediante enlaces públicos predecibles.
- Cifrar comunicaciones y proteger secretos de configuración fuera del código fuente.
- Controlar abuso de formularios, intentos de cuestionario y endpoints de carga.
- Publicar únicamente material autorizado; gestionar derechos y atribuciones.
- No recolectar credenciales durante ejercicios. La actividad T3 debe ser voluntaria cuando examine cuentas personales y debe ofrecer una alternativa ficticia.
- No usar correos/mensajes reales para simular phishing sin autorización y aviso.
- No publicar información clasificada, datos de víctimas, incidentes en investigación o información laboral sensible.
- Para legislación y referencias, presentar contenido educativo con fecha de revisión y aviso de que la institución debe validar vigencia y alcance.
- Mantener respaldos y procedimientos de recuperación acordes al nivel de criticidad institucional.

---

## 10. Accesibilidad, contenido y calidad

- Objetivo de conformidad: WCAG 2.2 AA como criterio de diseño, sujeto a verificación.
- Todas las acciones disponibles por teclado; foco visible y orden lógico.
- Contraste suficiente, tipografía legible y no depender solo del color.
- Texto alternativo informativo para la imagen de curso y diagramas; descripción textual de gráficos.
- Subtítulos y transcripciones para videos; documentos accesibles.
- Mensajes de validación junto al campo y resumen de errores al enviar formularios.
- Idioma inicial: español; evitar siglas sin expansión inicial o glosario asociado.
- Proveer instrucciones simples, ejemplos ficticios y ayuda contextual.
- En vista móvil, mantener operables tablas, rúbricas, diagramas y actividades.
- Probar rendimiento y estados de red lenta; avisar antes de abandonar una entrega sin guardar.

---

## 11. Paneles de seguimiento

### 11.1 Estudiante

- Bloques completados y pendientes.
- Próximas fechas y entregas.
- Estado de entregas y calificaciones publicadas.
- Resultado propio por rúbrica.
- Recomendaciones de repaso ligadas al RA; evitar diagnósticos automatizados no validados.

### 11.2 Profesor

- Asistencia y avance por cohorte, con acceso limitado a su curso.
- Entregas pendientes de revisar y cuestionarios con bajo desempeño agregado.
- Progreso de RA basado en evidencias mapeadas.
- Vista de casos y grupos con semáforo de avance.
- Exportaciones protegidas y auditadas.

### 11.3 Indicadores propuestos por la fuente

- Asistencia promedio ≥ 90 %.
- Ganancia Q0 → promedio Q1–Q4 ≥ 30 puntos porcentuales.
- Al menos 80 % de equipos en nivel satisfactorio o superior en R1 y R2.
- Satisfacción ≥ 4,5/5,0.

Mostrar definiciones, población y periodo de cada KPI. No inferir causalidad a partir de una métrica de correlación ni exponer datos individuales en paneles agregados.

---

## 12. Criterios de aceptación

### Navegación y presentación

- [ ] La tarjeta del Diplomado en Ciberseguridad abre la ficha correcta y muestra título, resumen, duración e imagen o placeholder.
- [ ] Las pestañas descritas cambian de contenido sin perder el contexto y funcionan con teclado.
- [ ] El aula muestra módulos y bloques en orden B01–B15, sus RA, actividades y evidencias.
- [ ] El estudiante puede identificar qué hacer ahora y cuál es el paso siguiente.

### Permisos

- [ ] El estudiante solo ve sus propias notas, entregas y retroalimentación.
- [ ] El profesor solo administra cursos asignados.
- [ ] El usuario de solo lectura no puede ver información privada ni mediante URL directa, búsqueda, API o descarga.
- [ ] Un intento no autorizado se rechaza en servidor y produce un mensaje claro sin revelar datos.

### Aprendizaje y evaluación

- [ ] Los 15 bloques suman 30 horas; el curso muestra claramente 26 h de formación y 4 h de invitados.
- [ ] Los RA se pueden rastrear a bloques, actividades y evidencias.
- [ ] Q0 se identifica como diagnóstico y Q1–Q4 aplican la ponderación establecida.
- [ ] La suma de los componentes evaluativos configurados es 100 % y no se publica una nota final con componentes faltantes sin marcarla provisional.
- [ ] Rúbricas muestran criterios, pesos y descriptores; cambios de rúbrica quedan versionados.
- [ ] Se puede guardar borrador y obtener confirmación de entrega.

### Seguridad y calidad

- [ ] La simulación Red vs. Blue y el ejercicio DDoS funcionan sin generar tráfico ni actuar sobre redes reales.
- [ ] Las muestras de entrenamiento usan identidades ficticias y no recolectan credenciales.
- [ ] Los materiales del profesor no son accesibles desde cuentas de estudiante o solo lectura.
- [ ] Los formularios tienen validación, estados de error y confirmación.
- [ ] Recursos audiovisuales incluyen subtítulos/transcripción o alternativa identificada.
- [ ] La interfaz funciona en móvil y ofrece navegación por teclado en rutas críticas.

### Operación y escalabilidad

- [ ] Un profesor autorizado puede editar y previsualizar un bloque antes de publicarlo.
- [ ] Los cursos pueden añadirse sin alterar la lógica fija de un único diplomado.
- [ ] Integraciones externas están desacopladas y fallos externos no bloquean el acceso al contenido principal.
- [ ] Acciones críticas quedan auditadas.

---

## 13. Plan mínimo de pruebas

1. **Pruebas de contenido:** verificar 15 bloques, duración, RA, actividades, pesos y enlaces.
2. **Pruebas de autorización:** estudiante A no accede a información de B; solo lectura no accede a datos privados; profesor no asignado no administra el curso.
3. **Pruebas de navegación:** rutas principales, atrás/adelante, teclado, enlaces y estados vacíos.
4. **Pruebas de actividad:** guardar borrador, enviar, reintentar conforme a política, calificar y publicar retroalimentación.
5. **Pruebas de cálculo:** pesos al 100 %, notas parciales/provisionales y coevaluación configurada.
6. **Pruebas de accesibilidad:** foco, etiquetas, contraste, errores, transcripciones y alternativas a juegos visuales.
7. **Pruebas de seguridad educativa:** verificar que simulaciones no realizan acciones de red ni solicitan secretos.
8. **Pruebas de integración:** solo para proveedores y versiones efectivamente configurados, incluyendo fallo y recuperación.
9. **Prueba de aceptación docente:** recorrer un bloque como profesor, estudiante y solo lectura con datos ficticios.

---

## 14. Preparación y publicación del curso

### Antes de abrir matrícula

- Validar con la institución los supuestos SO-1 a SO-7 de la fuente curricular.
- Confirmar modalidad, fechas, tamaño de cohorte, número de casos y formato de reflexión.
- Confirmar invitados y enviarles ficha con tres semanas de anticipación.
- Verificar licencias, enlaces, subtítulos y disponibilidad de los recursos.
- Elaborar los formatos de caso del Set B si la matrícula requiere diez casos.
- Preparar seis muestras de phishing ficticias y materiales no operativos.
- Montar y revisar Q0–Q4.
- Revisar mazo de simulación, bitácora, puntaje y ROE.
- Probar Tabla Periódica, Cyberópolis, Sopa de Ciberataques y Sala de Crisis.

### Durante el diplomado

- Registrar asistencia y notas por bloque.
- Mantener un tablero de avance de casos.
- Registrar incidencias y cambios de fechas/materiales.
- Hacer respaldos y revisar accesos a evidencias.

### Cierre

- Calificar ensayos y consolidar notas con revisión humana.
- Calcular indicadores Q0 → Q1–Q4 con metodología explícita.
- Aplicar la regla institucional de aprobación antes de emitir certificados.
- Recoger satisfacción, cerrar accesos temporales y conservar/eliminar datos según política.
- Elaborar informe de cierre para mejora del siguiente curso.

---

## 15. Supuestos pendientes de validación institucional

Mantenerlos visibles como configuración o lista de decisiones; no convertirlos en hechos inmutables:

1. La proporción pretendida es 70 % práctica y 30 % teoría.
2. Modalidad presencial o híbrida sincrónica; recursos alternos para modalidad virtual.
3. Público mixto sin requisito técnico de entrada.
4. Matrícula de 10–40 participantes y regla de 5/10 casos.
5. Invitados al final (B14–B15) y ensayo en B13.
6. Aprobación con nota ≥ 3,5/5,0 y asistencia ≥ 80 %.
7. Formato oficial de reflexión de video y rúbrica R4.
8. Alcance exacto del modo solo lectura.
9. Política de IA generativa en actividades y evaluaciones.
10. Plataforma objetivo: Moodle plugin, aplicación externa integrada o solución independiente.
11. Proveedor de identidad, almacenamiento, correo, alojamiento y retención de datos.
12. Requisitos institucionales de certificado, tratamiento de asistencia y validez de notas.

---

## 16. Instrucción final a futuros equipos/agentes

Antes de escribir código, inspecciona el repositorio y reporta su stack, estructura, rutas existentes, dependencias, modelo de datos, convenciones y estado de pruebas. Implementa primero el flujo mínimo completo de un usuario (acceso → tarjeta del curso → módulo/bloque → actividad → entrega → retroalimentación), con permisos verificados en servidor. Después incorpora el resto del currículo siguiendo esta especificación.

Trabaja en cambios pequeños y verificables; reutiliza componentes y patrones existentes; no sustituyas contenido del documento maestro por texto generado sin revisión; no alteres notas o políticas sin autorización; no agregues integraciones o servicios externos sin aprobación. Ejecuta las pruebas más pequeñas que cubran cada cambio y documenta cualquier supuesto, limitación o recurso aún pendiente. La aplicación debe quedar utilizable, segura, accesible y coherente con el diplomado, no solo visualmente convincente.
