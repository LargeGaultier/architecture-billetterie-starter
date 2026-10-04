const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const eventId = process.env.EVENT_ID || 'festival-lumieres';
const seconds = Number(process.env.LOAD_SECONDS || 10);
const concurrency = Number(process.env.LOAD_CONCURRENCY || 10);
if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isInteger(concurrency) || concurrency <= 0) {
  throw new Error('LOAD_SECONDS et LOAD_CONCURRENCY doivent être positifs.');
}

const deadline = Date.now() + seconds * 1000;
const latencies = [];
let successes = 0;
let errors = 0;

async function worker() {
  while (Date.now() < deadline) {
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}/api/events/${encodeURIComponent(eventId)}`);
      if (response.ok) successes++;
      else errors++;
    } catch {
      errors++;
    } finally {
      latencies.push(performance.now() - started);
    }
  }
}

const wallStart = performance.now();
await Promise.all(Array.from({ length: concurrency }, worker));
const elapsedSeconds = (performance.now() - wallStart) / 1000;
latencies.sort((a, b) => a - b);
const percentile = p => latencies.length ? Number(latencies[Math.ceil((p / 100) * latencies.length) - 1].toFixed(1)) : null;
console.log(JSON.stringify({
  eventId, concurrency, elapsedSeconds: Number(elapsedSeconds.toFixed(2)),
  requests: successes + errors, successes, errors,
  throughputPerSecond: Number((successes / elapsedSeconds).toFixed(1)),
  p50Ms: percentile(50), p95Ms: percentile(95),
}, null, 2));
if (!successes) process.exitCode = 1;
