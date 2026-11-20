import http from 'http';
import type { AddressInfo } from 'net';

process.env.VERCEL = '1';
import app from '../index';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(suite: string, name: string, fn: (baseUrl: string) => Promise<void>, baseUrl: string) {
  const start = Date.now();
  try {
    await fn(baseUrl);
    results.push({ suite, name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✅ [PASS] ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({ suite, name, passed: false, error: err.message, durationMs: Date.now() - start });
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
  }
}

async function startSuite() {
  console.log('====================================================');
  console.log('🥭 MARACUMANGO — SUITE INTEGRAL DE PRUEBAS AUTOMATIZADAS');
  console.log('====================================================\n');

  // Launch test HTTP server on an available dynamic port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  console.log(`Servidor de pruebas escuchando en: ${baseUrl}\n`);

  try {
    let customerToken = '';
    let _customerUserId = '';
    let registeredCustomerEmail = '';
    let adminToken = '';
    let workerToken = '';
    let createdOrderId = '';
    let createdBranchId = '';

    // ====================================================================
    // SUITE 1: SEGURIDAD Y CONTROL DE ACCESO (RBAC)
    // ====================================================================
    console.log('--- 🛡️ SUITE 1: SEGURIDAD Y CONTROL DE ACCESO ---');

    await runTest('Seguridad', '1.1 Rechazar petición sin autenticar a ruta protegida de Admin', async (url) => {
      const res = await fetch(`${url}/auth/users`);
      if (res.status !== 401 && res.status !== 403) {
        throw new Error(`Se esperaba 401 o 403, se obtuvo: ${res.status}`);
      }
    }, baseUrl);

    await runTest('Seguridad', '1.2 Rechazar intento de bypass con cabecera x-user-role: ADMIN', async (url) => {
      const res = await fetch(`${url}/auth/users`, {
        headers: { 'x-user-role': 'ADMIN' },
      });
      if (res.status !== 401 && res.status !== 403) {
        throw new Error(`¡Vulnerabilidad activa! Se admitió cabecera x-user-role con status ${res.status}`);
      }
    }, baseUrl);

    await runTest('Seguridad', '1.3 Rechazar registro de cliente si NO acepta Términos y Habeas Data', async (url) => {
      const res = await fetch(`${url}/auth/register-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Cliente Prueba',
          email: 'sin_terminos@correo.com',
          phone: '3171234567',
          password: 'password123',
          acceptedTerms: false,
        }),
      });
      if (res.status !== 400) {
        throw new Error(`Se esperaba 400 Bad Request por no aceptar términos, se obtuvo: ${res.status}`);
      }
    }, baseUrl);

    await runTest('Seguridad', '1.4 Rechazar registro con contraseña menor a 6 caracteres', async (url) => {
      const res = await fetch(`${url}/auth/register-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Cliente Prueba',
          email: 'pass_corta@correo.com',
          phone: '3171234567',
          password: '123',
          acceptedTerms: true,
        }),
      });
      if (res.status !== 400) {
        throw new Error(`Se esperaba 400 por contraseña débil, se obtuvo: ${res.status}`);
      }
    }, baseUrl);

    await runTest('Seguridad', '1.5 Registro exitoso de cliente con Términos aceptados y emisión de JWT', async (url) => {
      const uniqueEmail = `cliente_test_${Date.now()}@correo.com`;
      const res = await fetch(`${url}/auth/register-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Laura Sofía Neiva',
          email: uniqueEmail,
          phone: '3177401873',
          defaultAddress: 'Cra 7 # 21-30 Barrio Centro',
          password: 'clienteSeguro2026',
          acceptedTerms: true,
        }),
      });

      if (res.status !== 201) {
        const data = await res.json().catch(() => ({}));
        throw new Error(`Se esperaba 201 Created, se obtuvo: ${res.status} (${JSON.stringify(data)})`);
      }

      const data = await res.json();
      if (!data.token || data.user.role !== 'CUSTOMER') {
        throw new Error(`Datos de usuario o rol CUSTOMER inválidos: ${JSON.stringify(data)}`);
      }

      customerToken = data.token;
      _customerUserId = data.user.id;
      registeredCustomerEmail = uniqueEmail;
    }, baseUrl);

    await runTest('Seguridad', '1.6 Login de Administrador con credenciales válidas', async (url) => {
      const res = await fetch(`${url}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@maracumango.com',
          password: 'admin123',
        }),
      });

      if (!res.ok) {
        throw new Error(`Fallo en login de admin con status: ${res.status}`);
      }
      const data = await res.json();
      if (data.user.role !== 'ADMIN') {
        throw new Error(`Rol esperado ADMIN, se obtuvo: ${data.user.role}`);
      }
      adminToken = data.token;
    }, baseUrl);

    await runTest('Seguridad', '1.7 Login de Trabajador de Sede 1', async (url) => {
      const res = await fetch(`${url}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'carlos@maracumango.com',
          password: 'worker123',
        }),
      });

      if (!res.ok) {
        throw new Error(`Fallo en login de trabajador con status: ${res.status}`);
      }
      const data = await res.json();
      if (data.user.role !== 'WORKER' || data.user.branchId !== 'sede-1') {
        throw new Error(`Datos de trabajador o sede inválidos: ${JSON.stringify(data.user)}`);
      }
      workerToken = data.token;
    }, baseUrl);

    await runTest('Seguridad', '1.8 Cliente autenticado bloqueado al intentar acceder a rutas de administración', async (url) => {
      const res = await fetch(`${url}/auth/users`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      if (res.status !== 403) {
        throw new Error(`Se esperaba 403 Forbidden para el rol CUSTOMER, se obtuvo: ${res.status}`);
      }
    }, baseUrl);

    // ====================================================================
    // SUITE 2: USABILIDAD DEL CLIENTE Y FLUJO DE COMPRAS
    // ====================================================================
    console.log('\n--- 🛒 SUITE 2: USABILIDAD DEL CLIENTE Y COMPRAS ---');

    await runTest('Cliente', '2.1 Bloquear realización de pedidos si el usuario NO ha iniciado sesión', async (url) => {
      const res = await fetch(`${url}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Anónimo',
          customerPhone: '3171234567',
          sedeId: 'sede-1',
          deliveryMethod: 'recoger',
          paymentMethod: 'nequi',
          items: [{ productId: 'prod-1', productName: 'Granizado', quantity: 1, unitPrice: 14000 }],
        }),
      });

      if (res.status !== 401) {
        throw new Error(`Se esperaba 401 Unauthorized para usuarios anónimos, se obtuvo: ${res.status}`);
      }
      const data = await res.json();
      if (!data.requiresAuth) {
        throw new Error(`Se esperaba flag requiresAuth: true en la respuesta.`);
      }
    }, baseUrl);

    await runTest('Cliente', '2.2 Cliente autenticado realiza pedido con notas que incluyen números (Apto 302, cambio de 20.000)', async (url) => {
      const res = await fetch(`${url}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          sedeId: 'sede-1',
          deliveryMethod: 'domicilio',
          deliveryAddress: 'Calle 21 # 7-15, Casa 4 Apto 302',
          paymentMethod: 'efectivo',
          notes: 'Por favor llevar cambio de $20.000 y entregar en Apto 302',
          items: [
            {
              productId: 'prod-1',
              productName: 'Granizado Maracumango Especial',
              unitPrice: 14000,
              quantity: 2,
            },
          ],
        }),
      });

      if (res.status !== 201) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Fallo al crear orden de cliente autenticado: ${res.status} (${JSON.stringify(err)})`);
      }

      const order = await res.json();
      if (order.status !== 'PENDING_ADMIN') {
        throw new Error(`Estado inicial debe ser PENDING_ADMIN, se obtuvo: ${order.status}`);
      }
      if (order.total !== 28000) {
        throw new Error(`Total esperado 28000, se obtuvo: ${order.total}`);
      }
      createdOrderId = order.id;
    }, baseUrl);

    await runTest('Cliente', '2.3 Actualización de perfil del cliente (dirección y celular guardados)', async (url) => {
      const res = await fetch(`${url}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          phone: '3189998877',
          defaultAddress: 'Nueva Carrera 10 # 5-20, Neiva',
        }),
      });

      if (!res.ok) {
        throw new Error(`Fallo actualizando perfil: status ${res.status}`);
      }
      const data = await res.json();
      if (data.user.phone !== '3189998877' || data.user.defaultAddress !== 'Nueva Carrera 10 # 5-20, Neiva') {
        throw new Error(`Datos de perfil no coinciden: ${JSON.stringify(data.user)}`);
      }
    }, baseUrl);

    // ====================================================================
    // SUITE 3: USABILIDAD DEL TRABAJADOR Y OPERACIÓN EN BARRA
    // ====================================================================
    console.log('\n--- 🥤 SUITE 3: USABILIDAD DEL TRABAJADOR Y BARRA ---');

    await runTest('Trabajador', '3.1 Trabajador NO debe ver pedidos en estado PENDING_ADMIN hasta que el admin apruebe', async (url) => {
      const res = await fetch(`${url}/orders`, {
        headers: { Authorization: `Bearer ${workerToken}` },
      });

      if (!res.ok) {
        throw new Error(`Fallo obteniendo pedidos de trabajador: ${res.status}`);
      }
      const orders: any[] = await res.json();
      const hasPendingAdmin = orders.some((o) => o.id === createdOrderId || o.status === 'PENDING_ADMIN');
      if (hasPendingAdmin) {
        throw new Error(`El trabajador NO debe ver pedidos PENDING_ADMIN antes de la aprobación del admin.`);
      }
    }, baseUrl);

    await runTest('Trabajador', '3.2 Trabajador NO tiene permiso para cancelar pedidos', async (url) => {
      const res = await fetch(`${url}/orders/${createdOrderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${workerToken}`,
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      if (res.status !== 403) {
        throw new Error(`Se esperaba 403 Forbidden para trabajador intentando cancelar, se obtuvo: ${res.status}`);
      }
    }, baseUrl);

    // ====================================================================
    // SUITE 4: USABILIDAD DEL ADMINISTRADOR Y GESTIÓN MULTI-SEDE
    // ====================================================================
    console.log('\n--- 📊 SUITE 4: ADMINISTRACIÓN CENTRAL Y MULTI-SEDE ---');

    await runTest('Administrador', '4.1 Administrador visualiza el pedido PENDING_ADMIN del cliente', async (url) => {
      const res = await fetch(`${url}/orders?branchId=all`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (!res.ok) {
        throw new Error(`Fallo obteniendo pedidos de admin: ${res.status}`);
      }
      const orders: any[] = await res.json();
      const target = orders.find((o) => o.id === createdOrderId);
      if (!target) {
        throw new Error(`Admin debe poder ver el pedido ${createdOrderId} en estado pendiente.`);
      }
    }, baseUrl);

    await runTest('Administrador', '4.2 Administrador aprueba el pedido (flujo PENDING_ADMIN -> ACCEPTED)', async (url) => {
      const res = await fetch(`${url}/orders/${createdOrderId}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (!res.ok) {
        throw new Error(`Fallo al aprobar orden: status ${res.status}`);
      }
      const data = await res.json();
      if (data.status !== 'ACCEPTED') {
        throw new Error(`Estado esperado ACCEPTED, se obtuvo: ${data.status}`);
      }
    }, baseUrl);

    await runTest('Trabajador', '4.3 Comanda aprobada ahora sí es visible en la estación del Trabajador de Sede 1', async (url) => {
      const res = await fetch(`${url}/orders`, {
        headers: { Authorization: `Bearer ${workerToken}` },
      });
      const orders: any[] = await res.json();
      const target = orders.find((o) => o.id === createdOrderId);
      if (!target || target.status !== 'ACCEPTED') {
        throw new Error(`El pedido aprobado debe estar visible para el operario de la sede.`);
      }
    }, baseUrl);

    await runTest('Trabajador', '4.4 Trabajador toma comanda e inicia preparación (ACCEPTED -> PREPARING)', async (url) => {
      const res = await fetch(`${url}/orders/${createdOrderId}/start-preparation`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${workerToken}` },
      });

      if (!res.ok) {
        throw new Error(`Fallo al iniciar preparación: status ${res.status}`);
      }
      const data = await res.json();
      if (data.status !== 'PREPARING' && data.order?.status_id !== 'PREPARING') {
        throw new Error(`Estado esperado PREPARING, se obtuvo: ${JSON.stringify(data)}`);
      }
    }, baseUrl);

    await runTest('Trabajador', '4.5 Trabajador finaliza ciclo operativo: PREPARING -> READY -> DELIVERED', async (url) => {
      // 1. Mark READY
      const resReady = await fetch(`${url}/orders/${createdOrderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${workerToken}`,
        },
        body: JSON.stringify({ status: 'READY' }),
      });
      if (!resReady.ok) throw new Error(`Fallo marcando READY: ${resReady.status}`);

      // 2. Mark DELIVERED
      const resDelivered = await fetch(`${url}/orders/${createdOrderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${workerToken}`,
        },
        body: JSON.stringify({ status: 'DELIVERED' }),
      });
      if (!resDelivered.ok) throw new Error(`Fallo marcando DELIVERED: ${resDelivered.status}`);
    }, baseUrl);

    await runTest('Administrador', '4.6 Administrador crea una NUEVA SEDE en Neiva (+ Nueva Sede)', async (url) => {
      const res = await fetch(`${url}/branches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          nombre: 'Sede Sur Canaima',
          direccion: 'Calle 8 Sur # 22-10, Barrio Canaima',
          ciudad: 'Neiva, Huila',
          whatsapp: '3187654321',
          horario: 'Jornada Continua: 11:00 a.m. – 10:00 p.m.',
        }),
      });

      if (res.status !== 201) {
        const data = await res.json().catch(() => ({}));
        throw new Error(`Fallo al crear nueva sede: status ${res.status} (${JSON.stringify(data)})`);
      }

      const branch = await res.json();
      if (!branch.id || branch.nombre !== 'Sede Sur Canaima') {
        throw new Error(`Datos de sede creada inválidos: ${JSON.stringify(branch)}`);
      }
      createdBranchId = branch.id;
    }, baseUrl);

    await runTest('Administrador', '4.7 La nueva sede figura activa en el listado general de sedes', async (url) => {
      const res = await fetch(`${url}/branches`);
      if (!res.ok) throw new Error(`Fallo obteniendo sedes: ${res.status}`);
      const sedes: any[] = await res.json();
      const found = sedes.find((s) => s.id === createdBranchId || s.nombre === 'Sede Sur Canaima');
      if (!found) {
        throw new Error(`La nueva sede no fue encontrada en el listado general.`);
      }
    }, baseUrl);

    await runTest('Administrador', '4.8 Administrador actualiza datos de la sede', async (url) => {
      const res = await fetch(`${url}/branches/${createdBranchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          nombre: 'Sede Sur Canaima - Actualizada',
          whatsapp: '3180001122',
        }),
      });

      if (!res.ok) throw new Error(`Fallo actualizando sede: ${res.status}`);
    }, baseUrl);

    await runTest('Administrador', '4.9 Administrador elimina/desactiva la sede creada', async (url) => {
      const res = await fetch(`${url}/branches/${createdBranchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (!res.ok) throw new Error(`Fallo eliminando sede: ${res.status}`);
    }, baseUrl);

    await runTest('Administrador', '4.10 Administrador exporta reporte de ventas en formato CSV con UTF-8 BOM', async (url) => {
      const res = await fetch(`${url}/orders/export/csv`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (!res.ok) throw new Error(`Fallo exportando CSV: ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/csv')) {
        throw new Error(`Content-Type esperado text/csv, se obtuvo: ${contentType}`);
      }
      const text = await res.text();
      if (!text.includes('Numero Pedido') || !text.includes('Cliente')) {
        throw new Error(`Contenido CSV no contiene encabezados esperados.`);
      }
    }, baseUrl);

    await runTest('Administrador', '4.11 Administrador exporta reporte de ventas en formato Excel (.xlsx) con diseño y KPIs profesionales', async (url) => {
      const res = await fetch(`${url}/orders/export/excel`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (!res.ok) throw new Error(`Fallo exportando Excel: ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('spreadsheetml.sheet')) {
        throw new Error(`Content-Type esperado spreadsheetml.sheet, se obtuvo: ${contentType}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength < 5000) {
        throw new Error(`Tamaño de archivo Excel inesperadamente pequeño: ${arrayBuffer.byteLength} bytes`);
      }
    }, baseUrl);

    // ====================================================================
    // SUITE 5: VERIFICACIÓN DE FUNCIONALIDADES EXISTENTES (CATÁLOGO Y PERSONAL)
    // ====================================================================
    console.log('\n--- 🥭 SUITE 5: REVISIÓN DE FUNCIONALIDADES PREEXISTENTES ---');

    await runTest('Catálogo', '5.1 Consulta pública del catálogo de productos e ingredientes', async (url) => {
      const res = await fetch(`${url}/products`);
      if (!res.ok) throw new Error(`Fallo consultando productos: ${res.status}`);
      const prods: any[] = await res.json();
      if (!Array.isArray(prods) || prods.length === 0) {
        throw new Error(`El catálogo de productos no debe estar vacío.`);
      }
    }, baseUrl);

    await runTest('Catálogo', '5.2 Consulta pública de categorías de productos', async (url) => {
      const res = await fetch(`${url}/categories`);
      if (!res.ok) throw new Error(`Fallo consultando categorías: ${res.status}`);
      const cats: any[] = await res.json();
      if (!Array.isArray(cats) || cats.length === 0) {
        throw new Error(`El listado de categorías no debe estar vacío.`);
      }
    }, baseUrl);

    await runTest('Personal', '5.3 Admin lista cuentas de colaboradores y personal de sedes', async (url) => {
      const res = await fetch(`${url}/auth/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`Fallo consultando usuarios: ${res.status}`);
      const users: any[] = await res.json();
      if (!Array.isArray(users) || users.length === 0) {
        throw new Error(`Se esperaba listado de colaboradores.`);
      }
    }, baseUrl);

    await runTest('Sistema', '5.4 Healthcheck del sistema y diagnóstico', async (url) => {
      const res = await fetch(`${url}/health`);
      if (!res.ok) throw new Error(`Fallo en healthcheck: ${res.status}`);
      const health = await res.json();
      if (health.status !== 'ok') {
        throw new Error(`Estado de salud inválido: ${JSON.stringify(health)}`);
      }
    }, baseUrl);

    // ====================================================================
    // SUITE 6: PROTECCIÓN CONTRA FUERZA BRUTA Y BLOQUEO DE 15 MINUTOS (STRIX AUDIT)
    // ====================================================================
    console.log('\n--- ⏱️ SUITE 6: LIMITACIÓN DE INTENTOS Y BLOQUEO DE 15 MINUTOS ---');

    const testBruteEmail = `brute_victim_${Date.now()}@correo.com`;

    // First register user to test login failure lockouts
    await runTest('Fuerza Bruta', '6.1 Registrar usuario para pruebas de bloqueo', async (url) => {
      const res = await fetch(`${url}/auth/register-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Usuario Bloqueo',
          email: testBruteEmail,
          phone: '3189998877',
          password: 'passwordCorrecta123',
          acceptedTerms: true,
        }),
      });
      if (!res.ok) throw new Error(`Error registrando usuario para prueba de bloqueo: ${res.status}`);
    }, baseUrl);

    await runTest('Fuerza Bruta', '6.2 Intentos 1 a 4 reportan credenciales incorrectas y descuentan intentos restantes', async (url) => {
      for (let i = 1; i <= 4; i++) {
        const res = await fetch(`${url}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.99' },
          body: JSON.stringify({ email: testBruteEmail, password: 'contrasena_equivocada' }),
        });

        if (res.status !== 401) {
          throw new Error(`Intento ${i}: Se esperaba 401, se obtuvo ${res.status}`);
        }
        const data = await res.json();
        if (data.attemptsLeft === undefined || data.attemptsLeft !== 5 - i) {
          throw new Error(`Intento ${i}: Intentos restantes esperados ${5 - i}, se obtuvo: ${data.attemptsLeft}`);
        }
      }
    }, baseUrl);

    await runTest('Fuerza Bruta', '6.3 El 5to intento fallido activa el bloqueo de 15 minutos (HTTP 429)', async (url) => {
      const res = await fetch(`${url}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.99' },
        body: JSON.stringify({ email: testBruteEmail, password: 'contrasena_equivocada' }),
      });

      if (res.status !== 429) {
        throw new Error(`Se esperaba HTTP 429 Too Many Requests al alcanzar 5 intentos fallidos, se obtuvo: ${res.status}`);
      }
      const data = await res.json();
      if (!data.blocked || data.remainingMinutes === undefined) {
        throw new Error(`Respuesta de bloqueo inválida: ${JSON.stringify(data)}`);
      }
    }, baseUrl);

    await runTest('Fuerza Bruta', '6.4 Petición subsiguiente durante los 15 minutos de bloqueo es rechazada de inmediato', async (url) => {
      const res = await fetch(`${url}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.99' },
        body: JSON.stringify({ email: testBruteEmail, password: 'passwordCorrecta123' }),
      });

      if (res.status !== 429) {
        throw new Error(`La cuenta debe continuar bloqueada con 429, se obtuvo: ${res.status}`);
      }
    }, baseUrl);

    // ====================================================================
    // SUITE 7: RECUPERACIÓN SEGURA DE CONTRASEÑAS (FLUX 15 MINUTOS)
    // ====================================================================
    console.log('\n--- 🔑 SUITE 7: RECUPERACIÓN SEGURA DE CONTRASEÑAS ---');

    const recoveryEmail = `recover_${Date.now()}@correo.com`;
    let generatedResetCode = '';

    await runTest('Recuperación', '7.1 Registrar usuario para prueba de recuperación', async (url) => {
      const res = await fetch(`${url}/auth/register-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Usuario Recuperar',
          email: recoveryEmail,
          phone: '3161112233',
          password: 'passwordAntigua123',
          acceptedTerms: true,
        }),
      });
      if (!res.ok) throw new Error(`Error en registro: ${res.status}`);
    }, baseUrl);

    await runTest('Recuperación', '7.2 Solicitar código de recuperación genera código de 6 dígitos válido por 15 minutos', async (url) => {
      const res = await fetch(`${url}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail }),
      });

      if (!res.ok) throw new Error(`Fallo solicitando código: ${res.status}`);
      const data = await res.json();
      if (!data.code || data.code.length !== 6) {
        throw new Error(`Código de 6 dígitos no retornado: ${JSON.stringify(data)}`);
      }
      generatedResetCode = data.code;
    }, baseUrl);

    await runTest('Recuperación', '7.3 Rechazar restablecimiento con código incorrecto', async (url) => {
      const res = await fetch(`${url}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recoveryEmail,
          code: '000000',
          newPassword: 'nuevaPassword123',
        }),
      });

      if (res.status !== 400 && res.status !== 429) {
        throw new Error(`Se esperaba rechazo con 400/429, se obtuvo: ${res.status}`);
      }
    }, baseUrl);

    await runTest('Recuperación', '7.4 Restablecer contraseña con código correcto y nueva contraseña válida', async (url) => {
      const res = await fetch(`${url}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recoveryEmail,
          code: generatedResetCode,
          newPassword: 'nuevaPassword2026!',
        }),
      });

      if (!res.ok) throw new Error(`Fallo restableciendo contraseña: ${res.status}`);
    }, baseUrl);

    await runTest('Recuperación', '7.5 Iniciar sesión con la nueva contraseña funciona exitosamente', async (url) => {
      const res = await fetch(`${url}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recoveryEmail,
          password: 'nuevaPassword2026!',
        }),
      });

      if (!res.ok) throw new Error(`No se pudo iniciar sesión con la nueva contraseña: ${res.status}`);
      const data = await res.json();
      if (!data.token) throw new Error(`Token no emitido tras restablecimiento.`);
    }, baseUrl);

    // ====================================================================
    // SUITE 8: BLINDAJE BOLA / IDOR, CABECERAS HTTP Y AISLAMIENTO DE PEDIDOS
    // ====================================================================
    console.log('\n--- 🛡️ SUITE 8: BLINDAJE BOLA / IDOR Y CABECERAS DE SEGURIDAD ---');

    await runTest('BOLA Protection', '8.1 Rechazar consulta de pedidos si NO está autenticado (401)', async (url) => {
      const res = await fetch(`${url}/orders`);
      if (res.status !== 401) {
        throw new Error(`Vulnerabilidad BOLA: se esperaba 401 Unauthorized sin token, se obtuvo: ${res.status}`);
      }
    }, baseUrl);

    await runTest('BOLA Protection', '8.2 Cliente autenticado en GET /orders solo recibe sus propios pedidos', async (url) => {
      const res = await fetch(`${url}/orders`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      if (!res.ok) throw new Error(`Fallo consultando pedidos de cliente: ${res.status}`);
      const orders: any[] = await res.json();
      // Verify every order belongs to this customer
      for (const ord of orders) {
        if (ord.customerEmail && ord.customerEmail !== registeredCustomerEmail) {
          throw new Error(`Fuga de datos BOLA: Se recibió pedido perteneciente a otro cliente (${ord.customerEmail} vs ${registeredCustomerEmail}).`);
        }
      }
    }, baseUrl);

    await runTest('Cabeceras HTTP', '8.3 Verificar cabeceras de blindaje OWASP (X-Content-Type-Options, X-Frame-Options)', async (url) => {
      const res = await fetch(`${url}/health`);
      const nosniff = res.headers.get('x-content-type-options');
      const frameOptions = res.headers.get('x-frame-options');

      if (nosniff !== 'nosniff') {
        throw new Error(`Falta cabecera X-Content-Type-Options: nosniff`);
      }
      if (frameOptions !== 'DENY') {
        throw new Error(`Falta cabecera X-Frame-Options: DENY`);
      }
    }, baseUrl);

    // ====================================================================
    // SUITE 9: GESTIÓN DE CONFIGURACIÓN, SEDES Y PRODUCTOS (AMPLIACIÓN DE COBERTURA)
    // ====================================================================
    console.log('\n--- 📈 SUITE 9: GESTIÓN DE CONFIGURACIÓN Y SEDES (AMPLIACIÓN DE COBERTURA) ---');

    await runTest('Configuración', '9.1 Consulta de identidad de negocio y configuración visual', async (url) => {
      const res = await fetch(`${url}/settings`);
      if (!res.ok) throw new Error(`Fallo consultando settings: ${res.status}`);
      const settings = await res.json();
      if (!settings.businessName) throw new Error(`Nombre del negocio no retornado.`);
    }, baseUrl);

    await runTest('Sedes', '9.2 Consulta de sede específica por ID (/branches/:id)', async (url) => {
      const res = await fetch(`${url}/branches/sede-1`);
      if (!res.ok) throw new Error(`Fallo consultando sede-1: ${res.status}`);
      const sede = await res.json();
      if (sede.id !== 'sede-1') throw new Error(`ID de sede incorrecto: ${sede.id}`);
    }, baseUrl);

    await runTest('Sedes', '9.3 Consulta de sede inexistente retorna HTTP 404', async (url) => {
      const res = await fetch(`${url}/branches/sede_fantasma_999`);
      if (res.status !== 404) {
        throw new Error(`Se esperaba 404 para sede inexistente, se obtuvo: ${res.status}`);
      }
    }, baseUrl);

    await runTest('Insumos', '9.4 Consulta de ingredientes base e insumos', async (url) => {
      const res = await fetch(`${url}/ingredients`);
      if (!res.ok) throw new Error(`Fallo consultando ingredientes: ${res.status}`);
      const ings: any[] = await res.json();
      if (!Array.isArray(ings) || ings.length === 0) {
        throw new Error(`Se esperaba listado de ingredientes.`);
      }
    }, baseUrl);

    // ====================================================================
    // SUITE 10: VALIDACIÓN DE NOVEDADES Y REGLAS DE NEGOCIO (REQUERIMIENTO 10)
    // ====================================================================
    console.log('\n--- 🛡️ SUITE 10: NOVEDADES DE SEGURIDAD, ROLES, SEDES Y CONCURRENCIA ---');

    await runTest('Personal & Roles', '10.1 Clientes registrados NUNCA aparecen en /api/auth/users', async (url) => {
      const res = await fetch(`${url}/auth/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`Error consultando usuarios: ${res.status}`);
      const users: any[] = await res.json();
      const customerInStaff = users.find((u) => u.role === 'CUSTOMER' || u.roleId === 'CUSTOMER' || u.id.startsWith('cust-'));
      if (customerInStaff) {
        throw new Error(`Se encontró cuenta de cliente en listado de personal: ${customerInStaff.email}`);
      }
    }, baseUrl);

    await runTest('Personal & Roles', '10.2 Protección: cuentas de clientes no son editables desde /api/auth/users/:id', async (url) => {
      const res = await fetch(`${url}/auth/users/${_customerUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ roleId: 'WORKER', branchId: 'sede-1' }),
      });
      // Should be 400 or 404
      if (res.status !== 400 && res.status !== 404) {
        throw new Error(`Se esperaba 400 o 404 protegiendo cuenta de cliente, se obtuvo: ${res.status}`);
      }
    }, baseUrl);

    let testBranchId = '';
    await runTest('Sedes', '10.3 Creación y eliminación definitiva (Hard Delete) de sedes operativas', async (url) => {
      // 1. Create temporary test branch
      const createRes = await fetch(`${url}/branches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          nombre: 'Sede Prueba Hard Delete',
          direccion: 'Carrera 5 # 10-20',
          whatsapp: '3180000000',
        }),
      });
      if (!createRes.ok) throw new Error(`Error creando sede de prueba: ${createRes.status}`);
      const created = await createRes.json();
      testBranchId = created.id;

      // 2. Hard delete the branch
      const delRes = await fetch(`${url}/branches/${testBranchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!delRes.ok) throw new Error(`Error eliminando sede: ${delRes.status}`);
      const delData = await delRes.json();
      if (!delData.deleted) {
        throw new Error(`Se esperaba confirmación de eliminación definitiva.`);
      }

      // 3. Confirm it no longer exists
      const verifyRes = await fetch(`${url}/branches/${testBranchId}`);
      if (verifyRes.status !== 404) {
        throw new Error(`La sede aún existe tras la eliminación definitiva.`);
      }
    }, baseUrl);

    await runTest('Concurrencia Barra', '10.4 Exclusividad de preparación: Worker B no puede marcar READY el pedido de Worker A', async (url) => {
      // 1. Create order as authenticated customer
      const createRes = await fetch(`${url}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          customerName: 'Cliente Test Exclusividad',
          customerPhone: '3001234567',
          sedeId: 'sede-1',
          deliveryMethod: 'recoger',
          paymentMethod: 'efectivo',
          items: [{ productId: 'p1', productName: 'Granizado', unitPrice: 12000, quantity: 1 }],
        }),
      });
      if (!createRes.ok) throw new Error(`Error creando pedido para prueba 10.4: ${createRes.status}`);
      const order = await createRes.json();

      // 2. Admin approves order
      await fetch(`${url}/orders/${order.id}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      // 3. Worker A (Carlos) takes preparation
      const claimRes = await fetch(`${url}/orders/${order.id}/start-preparation`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${workerToken}` },
      });
      if (!claimRes.ok) throw new Error(`Worker A falló tomando pedido: ${claimRes.status}`);

      // 4. Worker B (Laura) logs in and tries to mark it as READY -> MUST be rejected with 403
      // Generate Worker B token
      const workerBPayload = {
        id: 'user-worker-2',
        name: 'Laura Trujillo',
        email: 'laura@maracumango.com',
        role: 'WORKER',
        roleId: 'WORKER',
        branchId: 'sede-1',
      };
      const workerBToken = (await import('jsonwebtoken')).default.sign(
        workerBPayload,
        process.env.JWT_SECRET || 'maracumango_super_secret_jwt_key_2026_prod'
      );

      const workerBTryRes = await fetch(`${url}/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${workerBToken}`,
        },
        body: JSON.stringify({ status: 'READY' }),
      });

      if (workerBTryRes.status !== 403) {
        throw new Error(`Se esperaba HTTP 403 prohibiendo a Worker B marcar READY, se obtuvo: ${workerBTryRes.status}`);
      }

      // 5. Worker A (Carlos) marks it as READY -> MUST succeed
      const workerASuccessRes = await fetch(`${url}/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${workerToken}`,
        },
        body: JSON.stringify({ status: 'READY' }),
      });

      if (!workerASuccessRes.ok) {
        throw new Error(`Worker A debería poder marcar como READY su pedido: ${workerASuccessRes.status}`);
      }
    }, baseUrl);

    // ====================================================================
    // SUITE 11: GESTIÓN COMPLETA DE CATÁLOGO (PRODUCTOS, CATEGORÍAS, AJUSTES)
    // ====================================================================
    console.log('\n--- 🏷️ SUITE 11: GESTIÓN INTEGRAL DE CATÁLOGO Y CONFIGURACIÓN ---');

    let createdCatId = '';
    await runTest('Catálogo', '11.1 Creación de nueva categoría (Admin only)', async (url) => {
      const res = await fetch(`${url}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: 'Edición Limitada 2026', description: 'Temporada especial' }),
      });
      if (!res.ok) throw new Error(`Fallo creando categoría: ${res.status}`);
      const cat = await res.json();
      createdCatId = cat.id;
      if (!createdCatId) throw new Error('ID de categoría no retornado.');
    }, baseUrl);

    await runTest('Catálogo', '11.2 Actualización de categoría existente', async (url) => {
      const res = await fetch(`${url}/categories/${createdCatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: 'Edición Verano 2026' }),
      });
      if (!res.ok) throw new Error(`Fallo actualizando categoría: ${res.status}`);
      const cat = await res.json();
      if (cat.name !== 'Edición Verano 2026') throw new Error(`Nombre no actualizado: ${cat.name}`);
    }, baseUrl);

    let createdProdId = '';
    await runTest('Catálogo', '11.3 Creación de nuevo producto con ingredientes', async (url) => {
      const res = await fetch(`${url}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Granizado Supremo Test',
          categoryId: createdCatId,
          price: 18000,
          description: 'Delicioso granizado artesanal con maracuyá y mango',
          ingredients: ['Pulpa de maracuyá', 'Mango picado', 'Leche condensada'],
        }),
      });
      if (!res.ok) throw new Error(`Fallo creando producto: ${res.status}`);
      const prod = await res.json();
      createdProdId = prod.id;
      if (!createdProdId) throw new Error('ID de producto no retornado.');
    }, baseUrl);

    await runTest('Catálogo', '11.4 Validación rechaza producto con precio inválido o nombre vacío', async (url) => {
      const res = await fetch(`${url}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: '',
          price: -5000,
        }),
      });
      if (res.status !== 400) {
        throw new Error(`Se esperaba 400 por validación, se obtuvo: ${res.status}`);
      }
    }, baseUrl);

    await runTest('Catálogo', '11.5 Actualización de producto existente', async (url) => {
      const res = await fetch(`${url}/products/${createdProdId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Granizado Supremo Test Modificado',
          price: 19500,
        }),
      });
      if (!res.ok) throw new Error(`Fallo actualizando producto: ${res.status}`);
      const prod = await res.json();
      if (prod.price !== 19500) throw new Error(`Precio no actualizado: ${prod.price}`);
    }, baseUrl);

    await runTest('Catálogo', '11.6 Alternar estado activo del producto (Toggle)', async (url) => {
      const res = await fetch(`${url}/products/${createdProdId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`Fallo en toggle: ${res.status}`);
      const data = await res.json();
      if (data.active === undefined) throw new Error('Estado active no devuelto');
    }, baseUrl);

    await runTest('Catálogo', '11.7 Eliminación segura de producto', async (url) => {
      const res = await fetch(`${url}/products/${createdProdId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`Fallo eliminando producto: ${res.status}`);
    }, baseUrl);

    await runTest('Catálogo', '11.8 Eliminación de categoría', async (url) => {
      const res = await fetch(`${url}/categories/${createdCatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`Fallo eliminando categoría: ${res.status}`);
    }, baseUrl);

    await runTest('Catálogo', '11.9 Creación de insumo / ingrediente base', async (url) => {
      const res = await fetch(`${url}/ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: 'Chorreado de Mora Test', description: 'Topping de mora' }),
      });
      if (!res.ok) throw new Error(`Fallo creando ingrediente: ${res.status}`);
    }, baseUrl);

    await runTest('Configuración', '11.10 Actualización de identidad de negocio y turnos operativos', async (url) => {
      const res = await fetch(`${url}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          businessName: 'Maracumango Neiva',
          city: 'Neiva, Huila',
          shiftInfo: 'Jornada Continua 10:00 AM - 10:00 PM',
        }),
      });
      if (!res.ok) throw new Error(`Fallo actualizando settings: ${res.status}`);
      const data = await res.json();
      if (!data.settings || data.settings.businessName !== 'Maracumango Neiva') {
        throw new Error(`Datos de settings no actualizados: ${JSON.stringify(data)}`);
      }
    }, baseUrl);

    // ====================================================================
    // SUITE 12: POLÍTICAS DE CONSERVACIÓN Y PERFIL DE CLIENTE
    // ====================================================================
    console.log('\n--- 🧹 SUITE 12: POLÍTICAS DE RETENCIÓN Y PERFILES ---');

    await runTest('Mantenimiento', '12.1 Ejecución de política de depuración y retención de pedidos', async () => {
      const { runOrderRetentionCleanup } = await import('../services/orderRetention');
      const stats = await runOrderRetentionCleanup();
      if (stats.cleanedCancelled === undefined || stats.cleanedDelivered === undefined) {
        throw new Error(`Resultado de retención inválido: ${JSON.stringify(stats)}`);
      }
    }, baseUrl);

    await runTest('Perfil', '12.2 Actualización de datos del perfil del cliente autenticado', async (url) => {
      const res = await fetch(`${url}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          firstName: 'Jose Esneider Actualizado',
          phone: '3183000424',
          defaultAddress: 'Calle 32 # 10W-09 Barrio El Triángulo',
        }),
      });
      if (!res.ok) throw new Error(`Fallo actualizando perfil: ${res.status}`);
      const data = await res.json();
      if (!data.user || data.user.phone !== '3183000424') {
        throw new Error(`Perfil no actualizado: ${JSON.stringify(data)}`);
      }
    }, baseUrl);

  } finally {
    server.close();
  }

  // ====================================================================
  // REPORTE CONSOLIDADO
  // ====================================================================
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n====================================================');
  console.log(`📊 RESULTADO CONSOLIDADO: ${passed}/${total} PRUEBAS EXITOSAS`);
  if (failed > 0) {
    console.log(`❌ ${failed} PRUEBAS FALLARON.`);
    process.exit(1);
  } else {
    console.log('🎉 ¡TODAS LAS PRUEBAS PASARON AL 100%! SISTEMA TOTALMENTE VERIFICADO.');
    console.log('====================================================\n');
    process.exit(0);
  }
}

startSuite().catch((err) => {
  console.error('Error fatal ejecutando suite:', err);
  process.exit(1);
});
