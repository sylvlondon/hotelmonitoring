import 'dotenv/config';
import { runMonitoring } from './orchestrator.js';

runMonitoring().catch((error) => {
  console.error('Monitoring run failed:', error);
  process.exit(1);
});
