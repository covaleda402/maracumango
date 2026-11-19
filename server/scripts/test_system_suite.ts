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
