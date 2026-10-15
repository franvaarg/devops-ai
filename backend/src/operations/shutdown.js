const { log, logFailure } = require('./logger');
function installShutdown(server, app, pool, { signals = process, exit = code => process.exit(code), graceMs = 60000 } = {}) {
  let stopping = false;
  const stop = (code = 0) => {
    const exitCode = Number.isInteger(code) ? code : 0;
    if (stopping) return;
    stopping = true;
    app.locals.draining = true;
    log('server_draining');
    const deadline = setTimeout(() => {
      log('server_shutdown_timeout', { code: 'SHUTDOWN_TIMEOUT', expected: false });
      server.closeAllConnections?.();
      exit(1);
    }, graceMs);
    server.close(async () => {
      try { await pool.end(); clearTimeout(deadline); log('server_stopped'); exit(exitCode); }
      catch (error) { clearTimeout(deadline); logFailure('shutdown_failed', error); exit(1); }
    });
    server.closeIdleConnections?.();
  };
  signals.once('SIGTERM', stop);
  signals.once('SIGINT', stop);
  return stop;
}
module.exports = { installShutdown };
