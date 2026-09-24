#!/usr/bin/env node
/**
 * CLI for automation - تشغيل المهام من سطر الأوامر
 */

import db from '../db/index.js';
import AutomationEngine from './index.js';

const command = process.argv[2] || 'help';

async function main() {
  await db.init();
  const engine = new AutomationEngine(db);
  await engine.init();

  switch (command) {
    case 'sync':
    case 'full-sync':
      console.log('🚀 Running full sync...');
      const result = await engine.runFullSync({ limit: 20 });
      console.log('✅ Full sync result:', JSON.stringify(result, null, 2));
      break;

    case 'new-movies':
      console.log('🎬 Fetching new movies...');
      const agg = await engine.runAggregator({ limit: 20 });
      console.log('✅ Aggregator result:', agg);
      break;

    case 'validate':
      console.log('🔍 Validating embeds...');
      const val = await engine.runEmbedValidation();
      console.log('✅ Validation result:', val);
      break;

    case 'trending':
      console.log('📈 Updating trending...');
      const trend = await engine.runTrendingUpdate();
      console.log('✅ Trending result:', trend);
      break;

    case 'arabic-dub':
      console.log('🎙️ Checking Arabic dubbing...');
      const dub = await engine.runArabicDubCheck();
      console.log('✅ Dub check result:', dub);
      break;

    case 'cleanup':
      console.log('🧹 Running cleanup...');
      const clean = await engine.runCleanup();
      console.log('✅ Cleanup result:', clean);
      break;

    default:
      console.log(`
🎬 Cinema Al Arab - Automation CLI

Usage: node server/automation/cli.js <command>

Commands:
  full-sync     Run full sync (new movies + embeds + validation)
  new-movies    Fetch new movies from TMDB
  validate      Validate all embed links
  trending      Update trending movies
  arabic-dub    Check Arabic dubbing availability
  cleanup       Cleanup old/inactive servers

Examples:
  node server/automation/cli.js full-sync
  node server/automation/cli.js new-movies
  node server/automation/cli.js validate
      `);
  }

  process.exit(0);
}

main().catch(e => {
  console.error('❌ CLI failed:', e);
  process.exit(1);
});
