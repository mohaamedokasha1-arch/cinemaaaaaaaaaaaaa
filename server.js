// Production entry point - uses full automation server
import createServer from './server/index.js';

const PORT = process.env.PORT || 3000;

createServer().then(({ app }) => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎬 Cinema Al Arab Full Automation listening on 0.0.0.0:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to start:', err);
  process.exit(1);
});
