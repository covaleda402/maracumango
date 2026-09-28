# 01 — Levantamiento de Información
## Sistema Web Maracumango

**Proyecto:** Maracumango  
**Documento:** Levantamiento de información  
**Versión:** 1.0  
**Estado:** Base para definición de requisitos y diseño del mockup

---

# 1. Información general del negocio

## 1.1 Nombre

**Maracumango**

## 1.2 Tipo de negocio

Maracumango es un negocio dedicado principalmente a la venta de:

- Granizados.
- Micheladas.
- Helados.

El negocio realiza tanto **ventas presenciales** como **pedidos para domicilio**.

## 1.3 Ubicación

Se tiene registrada inicialmente la ubicación:

**Cra. 7 con Calle 21, Parque del Amor y la Amistad, Neiva, Huila.**

Además, durante el levantamiento se identificó que Maracumango cuenta con **dos puntos en Neiva**:

- Punto Maracumango / sector Edsbur.
- Punto ubicado cerca del Único.

Los nombres y direcciones exactas de ambas sedes deberán validarse posteriormente.

## 1.4 Canal de domicilios

El negocio utiliza WhatsApp para recibir pedidos de domicilio.

**Número asociado a domicilios:** 317 619 9622.

La información de las transcripciones también establece que los pedidos son recibidos normalmente por la persona encargada de administrar el teléfono del negocio.

---

# 2. Horarios de operación

Actualmente se manejan dos turnos:

| Turno | Horario |
|---|---|
| Turno 1 | 7:30 a. m. — 2:30 p. m. |
| Turno 2 | 2:30 p. m. — 11:00 p. m. |

Los trabajadores que se encuentren en turno son quienes se encargan de preparar los pedidos.

---

# 3. Productos

Los productos principales identificados son:

### Granizados
Producto perteneciente al catálogo principal del negocio.

### Micheladas
Producto perteneciente al catálogo principal del negocio.

### Helados
Producto perteneciente al catálogo principal del negocio.

Los sabores y productos específicos podrán obtenerse posteriormente del contenido publicado por el negocio en sus redes sociales y deberán validarse antes de cargarlos como catálogo definitivo.

## 3.1 Gestión de productos

El sistema deberá permitir que el administrador pueda gestionar los productos.

Como mínimo se contempla:

- Crear productos.
- Editar productos.
- Modificar precios.
- Asociar productos a categorías.
- Activar/desactivar productos.

No es necesario conocer todos los precios durante esta etapa, ya que los precios serán información administrable.

---

# 4. Canales de atención y pedidos

## 4.1 Situación actual

El canal principal identificado para recibir pedidos es **WhatsApp**.

El cliente se comunica con el negocio mediante WhatsApp y el pedido llega al teléfono que administra la persona encargada.

## 4.2 Proceso actual/propuesto de pedido

El flujo identificado es:

**Cliente → WhatsApp → Administrador → Trabajadores de turno → Preparación → Entrega**

El administrador recibe y revisa el pedido y posteriormente lo registra/sube al sistema para que los trabajadores que estén de turno puedan prepararlo.

---

# 5. Flujo de pedidos dentro del sistema

El flujo de operación definido para el proyecto es:

1. El cliente realiza un pedido mediante WhatsApp.
2. El pedido llega al teléfono administrado por el administrador.
3. El administrador revisa la información del pedido.
4. El administrador registra el pedido en el sistema.
5. Los trabajadores que se encuentran en turno visualizan/reciben la información necesaria.
6. Los trabajadores preparan el pedido.
7. Se gestiona la entrega del pedido.
8. El pedido puede ser enviado mediante domicilio o quedar preparado para recogida en el establecimiento.
9. El pedido se actualiza hasta finalizar su atención.

## 5.1 Recogida en establecimiento

Se incluirá inicialmente la posibilidad de que un cliente:

1. Realice el pedido con anticipación.
2. Espere a que el negocio lo prepare.
3. Se dirija posteriormente al establecimiento.
4. Recoja el pedido.

El objetivo es permitir que el cliente ahorre tiempo al evitar esperar la preparación en el establecimiento.

**Estado:** Incluido provisionalmente en el MVP.

Si el propietario posteriormente indica que esta modalidad no existe, deberá eliminarse del requisito y del mockup.

---

# 6. Domicilios

Maracumango realiza domicilios.

Los domicilios son realizados por personal del propio negocio.

## 6.1 Costo del domicilio

El costo del domicilio será inicialmente **manual**.

El administrador podrá indicar el valor correspondiente al domicilio en el pedido.

No se implementará inicialmente:

- Cálculo automático por kilómetros.
- Seguimiento GPS.
- Cálculo automático de rutas.
- API de mapas para calcular tarifas.

Esto podrá evaluarse como una futura ampliación.

---

# 7. Métodos de pago

Para la primera versión se manejarán:

- **Efectivo.**
- **Nequi.**

Estos métodos podrán ampliarse posteriormente si el negocio incorpora nuevas formas de pago.

Por ahora no se implementará una pasarela de pago en línea.

---

# 8. Roles del sistema

Inicialmente se trabajará únicamente con dos roles:

## 8.1 Administrador

El administrador será responsable de la gestión principal del sistema.

Funciones previstas:

- Gestionar productos.
- Gestionar categorías.
- Modificar precios.
- Activar/desactivar productos.
- Registrar y consultar pedidos.
- Gestionar información relacionada con domicilios.
- Consultar ventas.
- Consultar información mediante dashboard.
- Gestionar trabajadores.
- Gestionar sedes.
- Coordinar los pedidos con los trabajadores que estén de turno.

Las transcripciones identifican al administrador como responsable de la gestión de pedidos y trabajadores.

## 8.2 Trabajador

El trabajador participa principalmente en la operación del negocio.

Funciones preliminares:

- Atender clientes.
- Manejar caja.
- Preparar productos.
- Preparar pedidos.
- Consultar la información necesaria de los pedidos asignados.

Los trabajadores que estén en turno son quienes preparan los productos/pedidos.

Los permisos definitivos del trabajador se podrán ajustar durante la definición de requisitos.

---

# 9. Dashboard administrativo

El administrador contará con un dashboard para consultar información relevante del negocio.

Se contempla:

- Consulta de ventas.
- Indicadores generales.
- Gráficas.
- Consulta de pedidos.
- Información relacionada con productos.

Las transcripciones plantean específicamente un dashboard analítico con posibilidad de representar ventas mediante gráficas de líneas o barras.

La selección definitiva de gráficos se realizará durante el diseño UI/UX.

---

# 10. Gestión de pedidos

El administrador deberá poder consultar y gestionar los pedidos registrados.

Se contempla inicialmente información como:

- Identificador del pedido.
- Cliente.
- Productos.
- Cantidades.
- Valor de productos.
- Valor del domicilio.
- Valor total.
- Método de pago.
- Modalidad de entrega.
- Estado del pedido.
- Sede asociada.
- Información necesaria para la preparación y entrega.

Los pedidos deberán poder filtrarse para facilitar su consulta.

---

# 11. Estados preliminares del pedido

Se propone manejar estados que permitan representar el flujo operativo:

**Pendiente → En preparación → Preparado → En entrega / Listo para recoger → Entregado**

Estos estados son una propuesta de modelado y podrán modificarse durante la definición formal de requisitos.

---

# 12. Gestión de trabajadores

El administrador deberá poder gestionar la información básica de los trabajadores.

Inicialmente se contempla:

- Registrar trabajadores.
- Consultar trabajadores.
- Asociarlos a un rol.
- Asociarlos a una sede.
- Relacionarlos con los turnos correspondientes.

Las transcripciones identifican la necesidad de que la administración gestione a los trabajadores.

No se implementará inicialmente una gestión compleja de recursos humanos.

---

# 13. Sedes

El sistema deberá contemplar la existencia de más de una sede.

Inicialmente se identifican dos puntos en Neiva:

1. Maracumango / sector Edsbur.
2. Punto cercano al Único.

El sistema deberá permitir que el administrador gestione las sedes.

Los datos definitivos de dirección y configuración de cada sede quedan pendientes de validación.

---

# 14. Inventario

El inventario queda **fuera del alcance inicial del sistema**.

No se desarrollará inicialmente un módulo para:

- Materias primas.
- Existencias.
- Kardex.
- Compras.
- Proveedores.
- Alertas de stock.

La funcionalidad podrá evaluarse posteriormente si el negocio determina que es necesaria.

---

# 15. Promociones

La gestión avanzada de promociones queda fuera del MVP inicial.

La información recopilada indica que no se considera prioritaria en esta primera versión.

Podrá incorporarse posteriormente.

---

# 16. Experiencia de usuario y diseño

El sistema deberá tener una experiencia visual moderna, atractiva y sencilla.

## 16.1 Plataforma

Se plantea una aplicación web adaptable a:

- Computadores.
- Tablets.
- Teléfonos móviles.

No se define todavía si será PWA, aplicación híbrida empaquetada u otra alternativa. La decisión técnica se tomará posteriormente.

## 16.2 Identidad visual

El diseño deberá utilizar la identidad visual propia de Maracumango.

Se deberá investigar y utilizar:

- Logo.
- Colores.
- Tipografía, si está definida.
- Fotografías.
- Estilo visual.
- Recursos gráficos del negocio.

## 16.3 Navegación

El usuario deberá poder:

- Informarse rápidamente.
- Encontrar productos rápidamente.
- Consultar precios.
- Iniciar un pedido con la menor cantidad posible de pasos.

La meta preliminar es que la información o inicio de compra sea accesible en aproximadamente dos interacciones/clics cuando sea funcionalmente posible.

## 16.4 Tarjetas de productos

Los productos deberán mostrarse mediante tarjetas limpias y visualmente atractivas.

Cada tarjeta podrá mostrar:

- Imagen.
- Nombre.
- Descripción breve.
- Precio.
- Categoría.
- Disponibilidad.
- Acción para consultar/comprar.

## 16.5 Interacciones visuales

Se propone incorporar:

- Zoom al pasar el cursor sobre productos.
- Microinteracciones.
- Animaciones.
- Transiciones.
- Movimiento visual.
- Posibles elementos 3D.

El uso de 3D se considera una propuesta de diseño y deberá evaluarse según rendimiento y utilidad.

---

# 17. Necesidades identificadas

A partir del levantamiento se identifican las siguientes necesidades:

1. Centralizar la gestión interna de pedidos.
2. Evitar depender exclusivamente de anotaciones manuales para organizar pedidos.
3. Facilitar al administrador la gestión de pedidos recibidos por WhatsApp.
4. Facilitar la comunicación del pedido a los trabajadores de turno.
5. Permitir consultar el estado de los pedidos.
6. Facilitar la gestión de productos.
7. Permitir modificar precios sin modificar el código del sistema.
8. Facilitar la consulta de ventas.
9. Centralizar información de las sedes.
10. Facilitar la atención presencial.
11. Permitir pedidos anticipados para domicilio.
12. Permitir pedidos anticipados para recogida.
13. Proporcionar una presencia digital atractiva para el negocio.
14. Facilitar que los clientes conozcan productos, precios y formas de pedido.

---

# 18. Alcance preliminar del MVP

## Incluido

### Cliente

- Visualización de productos.
- Categorías.
- Información del negocio.
- Información de sedes.
- Visualización de precios.
- Inicio de pedido.
- Redirección/integración con WhatsApp.
- Selección de domicilio o recogida.
- Visualización de información relevante del pedido.

### Administrador

- Inicio de sesión.
- Dashboard.
- Gestión de productos.
- Gestión de categorías.
- Gestión de precios.
- Gestión de pedidos.
- Gestión de domicilios.
- Gestión de trabajadores.
- Gestión de sedes.
- Consulta de ventas.

### Trabajador

- Inicio de sesión/acceso.
- Consulta de pedidos.
- Consulta de información necesaria para preparar pedidos.
- Gestión de estados operativos según permisos definidos.

---

# 19. Fuera del MVP

Por ahora quedan fuera:

- Inventario.
- Gestión de materias primas.
- Proveedores.
- Compras.
- Pasarela de pago.
- Seguimiento GPS.
- Cálculo automático de domicilio.
- Gestión avanzada de promociones.
- Sistemas complejos de recursos humanos.
- Funciones innecesarias que no respondan a una necesidad identificada.

---

# 20. Información pendiente

Estos puntos no deben tratarse como requisitos definitivos hasta validarlos:

1. Nombre oficial de cada sede.
2. Dirección exacta de cada sede.
3. Horario específico por sede.
4. Si ambas sedes manejan exactamente el mismo catálogo.
5. Permisos definitivos del trabajador.
6. Estados definitivos de los pedidos.
7. Tiempo estimado de preparación.
8. Regla futura para calcular el domicilio.
9. Datos definitivos de productos, sabores y precios.
10. Información corporativa adicional.
11. Logo y elementos visuales definitivos.
12. Posibles modificaciones solicitadas por el propietario.

---

# 21. Suposiciones controladas

Las siguientes decisiones se utilizarán provisionalmente para poder avanzar:

- La recogida en establecimiento estará disponible.
- El costo del domicilio será introducido manualmente.
- Existirán únicamente dos roles inicialmente.
- El administrador será el principal encargado de gestionar pedidos.
- Los trabajadores de turno prepararán los pedidos.
- WhatsApp continuará siendo el canal principal de comunicación con el cliente.
- El sistema servirá como herramienta de gestión interna y apoyo a la presencia digital, no como reemplazo inmediato de WhatsApp.

Estas decisiones podrán modificarse si el propietario indica lo contrario.

---

# 22. Principales procesos identificados

## Proceso 1 — Consulta de productos

Cliente → Catálogo → Categoría → Producto → Información.

## Proceso 2 — Solicitud de pedido

Cliente → WhatsApp → Administrador → Registro del pedido.

## Proceso 3 — Preparación

Administrador → Pedido registrado → Trabajadores de turno → Preparación.

## Proceso 4 — Domicilio

Pedido preparado → Gestión de domicilio → Entrega al cliente.

## Proceso 5 — Recogida

Pedido preparado → Cliente llega al establecimiento → Entrega del pedido.

## Proceso 6 — Venta presencial

Cliente → Trabajador → Selección de productos → Cobro → Entrega.

## Proceso 7 — Gestión de productos

Administrador → Productos → Crear/editar/activar/desactivar → Guardar.

## Proceso 8 — Consulta de ventas

Administrador → Dashboard → Indicadores → Gráficas → Consulta.

## Proceso 9 — Gestión de trabajadores

Administrador → Trabajadores → Registrar/consultar/gestionar.

---

# 23. Próximo paso

Una vez aprobado este levantamiento se deberá construir el documento:

**02_Requisitos_Maracumango.md**

Este documento transformará la información anterior en:

- Requisitos funcionales.
- Requisitos no funcionales.
- Reglas de negocio.
- Actores.
- Casos de uso.
- Historias de usuario.
- Criterios de aceptación.
- MVP definitivo.

Posteriormente se realizará:

**03_Arquitectura_de_Informacion_Maracumango.md**

y se definirá el mapa de pantallas para construir el mockup en Stitch.

---

# 24. Principio rector

> **Primero entender el negocio, después definir el sistema, después diseñarlo y finalmente programarlo.**

El sistema deberá responder a las necesidades reales de Maracumango y no se deberán agregar funcionalidades únicamente porque sean técnicamente posibles.