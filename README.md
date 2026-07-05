# ⏱️ Time Planner

**Una aplicación web pensada para ayudar a organizar el tiempo, especialmente si tienes TDAH.**

---

## ¿Qué es Time Planner?

Muchas personas con Trastorno por Déficit de Atención e Hiperactividad (TDAH) tienen dificultades para calcular cuánto tiempo les toma realmente una tarea, para recordar que deben hacerla, y para mantenerse enfocadas hasta terminarla. **Time Planner** nace para acompañar ese proceso de una forma simple y visual, sin depender de la fuerza de voluntad o la memoria.

La idea es sencilla: creas una tarea, le pones un tiempo estimado, activas un cronómetro que va descontando ese tiempo, y cuando se acaba, la aplicación te pregunta directamente: *¿ya terminaste, o necesitas un poco más de tiempo?* Nada de adivinar ni de perder el hilo — la aplicación lleva la cuenta por ti.

Además, si tienes tareas con una fecha límite, el sistema te avisa con recordatorios tipo alarma para que no se te pase nada por alto.

---

## ¿Para quién es?

Pensado principalmente para:

- Personas con TDAH que buscan una herramienta de organización que se adapte a su forma de trabajar, no al revés.
- Estudiantes o profesionales que quieren medir cuánto tiempo *realmente* les toma cada tarea, y no solo cuánto creían que les iba a tomar.
- Cualquiera que quiera un sistema simple de tareas + cronómetro + recordatorios, sin la complejidad de herramientas de gestión de proyectos pensadas para equipos.

---

## ¿Qué puedes hacer con la aplicación?

- **Crear y organizar tareas** por categorías (Hogar, Estudio, Trabajo, Personal, o las que tú definas), con prioridad y fecha límite.
- **Usar un cronómetro descendente** para cada tarea, que te acompaña mientras trabajas.
- **Terminar una tarea antes de tiempo** o pedir tiempo extra si el cronómetro llega a cero y aún no has terminado.
- **Recibir recordatorios tipo alarma** para no olvidar tareas importantes, con opción de posponerlos.
- **Ver reportes semanales** que comparan el tiempo que estimabas gastar en cada tarea contra el tiempo que realmente te tomó — muy útil para aprender a calcular mejor tus tiempos con el paso de las semanas.
- **Exportar esos reportes** en PDF o Excel, para llevar un registro fuera de la aplicación.
- **Recuperar tu contraseña** por correo electrónico si la olvidas, de forma segura.
- **Panel de administración** (para quien administre la plataforma) donde se pueden ver, activar o desactivar usuarios.

---

## ¿Cómo funciona por dentro? (explicado sin tecnicismos)

La aplicación está dividida en dos partes que se comunican entre sí:

- **Lo que ves y usas** (la interfaz): botones, formularios, el cronómetro, las notificaciones. Está construida con **Angular**, un framework que permite crear interfaces web modernas y ordenadas.
- **Lo que trabaja detrás de cámaras** (el servidor): recibe lo que haces en pantalla, lo guarda, hace los cálculos de tiempo, genera los reportes y envía los correos de recuperación de contraseña. Está construido en **Python**, usando un framework llamado **Flask**.
- Toda la información (tus tareas, categorías, recordatorios, historial de tiempos) se guarda en una **base de datos**, para que nada se pierda aunque cierres la aplicación o cambies de dispositivo.

En resumen: tú interactúas con una interfaz sencilla, y detrás hay un servidor que hace todo el trabajo pesado de guardar, calcular y avisar.

---

## Estado actual del proyecto

El sistema ya funciona de principio a fin: se puede crear una cuenta, iniciar sesión, crear tareas, usar el cronómetro, recibir recordatorios, generar reportes y recuperar la contraseña. Está en su recta final antes de una entrega/presentación formal, por lo que algunos detalles visuales (como adaptación a pantallas pequeñas o algunos íconos) todavía están en proceso de pulido.

---

## Autor

Proyecto desarrollado por **Henry Alejandro Forero López**, como proyecto de formación en el programa Técnico en ADSI del SENA (Centro de Manufactura Textil y Cuero), bajo metodología Scrum.
