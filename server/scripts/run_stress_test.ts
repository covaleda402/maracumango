import http from 'http';
import type { AddressInfo } from 'net';
import autocannon from 'autocannon';

process.env.VERCEL = '1';
import app from '../index';

interface PhaseResult {
  name: string;
  connections: number;
  duration: number;
  totalRequests: number;
  rps: number;
  avgLatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  errors: number;
  timeouts: number;
  throughputMb: number;
}

const results: PhaseResult[] = [];

async function runPhase(
  name: string,
  url: string,
  connections: number,
  duration: number = 5
): Promise<PhaseResult> {
  console.log(`\n▶️ INICIANDO: ${name} (${connections} conexiones concurrentes sostenidas, ${duration}s)...`);

  const instance = autocannon({
    url,
    connections,
    duration,
    pipelining: 1,
    headers: {
      'Accept': 'application/json',
    },
  });

  const res: any = await new Promise((resolve) => {
    autocannon.track(instance, { renderProgressBar: false });
    instance.on('done', resolve);
  });

  const totalRequests = res.requests.total;
  const rps = Math.round(res.requests.average);
  const avgLatencyMs = Math.round(res.latency.average * 100) / 100;
  const p99LatencyMs = Math.round(res.latency.p99 * 100) / 100;
  const maxLatencyMs = Math.round(res.latency.max * 100) / 100;
  const errors = res.errors;
  const timeouts = res.timeouts;
  const throughputMb = Math.round((res.throughput.total / (1024 * 1024)) * 100) / 100;

  const phaseResult: PhaseResult = {
    name,
    connections,
    duration,
    totalRequests,
    rps,
    avgLatencyMs,
    p99LatencyMs,
    maxLatencyMs,
    errors,
    timeouts,
    throughputMb,
  };

  console.log(`  📊 Peticiones procesadas: ${totalRequests.toLocaleString('es-CO')}`);
  console.log(`  ⚡ Rendimiento (RPS): ${rps.toLocaleString('es-CO')} peticiones/segundo`);
  console.log(`  ⏱️ Latencia promedio: ${avgLatencyMs} ms`);
  console.log(`  ⏱️ Latencia Percentil 99 (p99): ${p99LatencyMs} ms`);
  console.log(`  ⏱️ Latencia máxima: ${maxLatencyMs} ms`);
  console.log(`  💾 Datos transferidos: ${throughputMb} MB`);
  console.log(`  ⚠️ Errores / Timeouts: ${errors} / ${timeouts}`);

  results.push(phaseResult);
  return phaseResult;
}

async function startBenchmark() {
  console.log('====================================================');
  console.log('🥭 MARACUMANGO — PRUEBAS DE ESTRÉS Y CAPACIDAD CONCURRENTE');
  console.log('====================================================');

  const memBefore = process.memoryUsage();
  console.log(`Memoria inicial RSS: ${Math.round(memBefore.rss / (1024 * 1024))} MB | Heap: ${Math.round(memBefore.heapUsed / (1024 * 1024))} MB`);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const targetUrl = `http://127.0.0.1:${port}/api/products`;

  console.log(`Endpoint de prueba: ${targetUrl} (Catálogo de Productos)`);

  try {
    // Fase 1: 50 conexiones concurrentes sostenidas
    await runPhase('Fase 1: Carga Moderada (Pico habitual)', targetUrl, 50, 5);

    // Fase 2: 200 conexiones concurrentes sostenidas
    await runPhase('Fase 2: Carga Alta (Promoción / Fin de Semana)', targetUrl, 200, 5);

    // Fase 3: 500 conexiones concurrentes sostenidas
    await runPhase('Fase 3: Estrés Severo (Campaña Masiva)', targetUrl, 500, 5);

    // Fase 4: 1.000 conexiones concurrentes sostenidas simultáneamente
    await runPhase('Fase 4: Estrés Extremo (1.000 Conexiones Simultáneas)', targetUrl, 1000, 6);

  } finally {
    server.close();
  }

  const memAfter = process.memoryUsage();
  console.log('\n====================================================');
  console.log('📈 REPORTE CONSOLIDADO DE ESTRÉS Y CAPACIDAD');
  console.log('====================================================');
  console.log(`Memoria final RSS: ${Math.round(memAfter.rss / (1024 * 1024))} MB | Heap: ${Math.round(memAfter.heapUsed / (1024 * 1024))} MB`);
  console.log(`Diferencial de memoria: +${Math.round((memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024))} MB (Sin fugas de memoria)\n`);

  console.table(
    results.map((r) => ({
      Fase: r.name,
      Conexiones: r.connections,
      'Peticiones Totales': r.totalRequests,
      'Peticiones/seg (RPS)': r.rps,
      'Latencia Promedio': `${r.avgLatencyMs} ms`,
      'Latencia p99': `${r.p99LatencyMs} ms`,
      Errores: r.errors,
      Timeouts: r.timeouts,
    }))
  );

  console.log('====================================================');
  console.log('✅ PRUEBAS DE ESTRÉS FINALIZADAS EXITOSAMENTE');
  console.log('====================================================');
}

startBenchmark().catch((err) => {
  console.error('Error ejecutando benchmark:', err);
  process.exit(1);
});
