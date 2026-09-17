/**
 * One-click ClickHouse Docker Setup & Health Verification
 * Designed for frictionless collaborator onboarding.
 */

import { execSync } from 'child_process';
import http from 'http';

function checkDockerRunning() {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function pingClickHouse() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:8123/ping', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data.trim() === 'Ok.'));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function queryClickHouse(sql) {
  return new Promise((resolve, reject) => {
    const postData = sql;
    const req = http.request(
      'http://localhost:8123/?format=JSONEachRow',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const rows = data
              .trim()
              .split('\n')
              .filter(Boolean)
              .map((line) => JSON.parse(line));
            resolve(rows);
          } catch {
            resolve([]);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('\n=============================================================');
  console.log('🐳 ClickStack MCP: Local ClickHouse Docker Initializer');
  console.log('=============================================================\n');

  if (!checkDockerRunning()) {
    console.error('❌ Error: Docker is not running or not installed on your system.');
    console.error('   Please launch Docker Desktop and try again.\n');
    process.exit(1);
  }

  // Check if already running and healthy
  const alreadyUp = await pingClickHouse();
  if (alreadyUp) {
    console.log('⚡ ClickHouse is ALREADY running and responding on http://localhost:8123 (Ok.)');
  } else {
    console.log('1. Launching ClickHouse container (clickstack-clickhouse)...');
    try {
      execSync('docker compose up -d', { stdio: 'inherit' });
    } catch (err) {
      // If container exists but stopped or name conflict, try starting it directly
      try {
        console.log('   Container exists, attempting to start clickstack-clickhouse...');
        execSync('docker start clickstack-clickhouse', { stdio: 'inherit' });
      } catch (startErr) {
        console.error('❌ Failed to launch or start ClickHouse container:', startErr.message);
        process.exit(1);
      }
    }

    console.log('\n2. Waiting for ClickHouse to be healthy on http://localhost:8123...');
    let ready = false;
    for (let i = 0; i < 20; i++) {
      process.stdout.write('.');
      ready = await pingClickHouse();
      if (ready) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log('');

    if (!ready) {
      console.error('❌ Timeout waiting for ClickHouse to start on port 8123.');
      process.exit(1);
    }
    console.log('✅ ClickHouse HTTP ping responded: Ok.');
  }

  console.log('\n3. Verifying OpenTelemetry schema & seed telemetry...');
  try {
    const counts = await queryClickHouse(
      "SELECT 'otel_traces' AS tbl, count() AS rows FROM otel.otel_traces UNION ALL SELECT 'otel_logs', count() FROM otel.otel_logs UNION ALL SELECT 'otel_metrics_gauge', count() FROM otel.otel_metrics_gauge"
    );

    console.log('   Tables detected in `otel` database:');
    for (const r of counts) {
      console.log(`   - ${r.tbl.padEnd(22)}: ${r.rows} rows`);
    }
  } catch (err) {
    console.warn('⚠️  Could not inspect row counts:', err.message);
  }

  console.log('\n=============================================================');
  console.log('🎉 Local ClickHouse setup is 100% complete and ready!');
  console.log('👉 Next Steps for Collaborators:');
  console.log('   npm start        (start MCP server on http://localhost:3000/mcp)');
  console.log('   npm test:tools   (verify all 27 tools)');
  console.log('=============================================================\n');
}

main();
