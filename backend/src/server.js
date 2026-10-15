const app = require("./app");

const PORT = process.env.PORT || 3000;

require('./operations/configuration').validateStartup();

const server = app.listen(PORT, "0.0.0.0", () => {
  require("./operations/logger").log("server_started");
});
server.headersTimeout = 10000;
server.requestTimeout = 15000;
const stop = require('./operations/shutdown').installShutdown(server, app, require('./database/db'));
for (const event of ['uncaughtException', 'unhandledRejection']) {
  process.once(event, error => {
    require('./operations/logger').logFailure(event === 'uncaughtException' ? 'uncaught_exception' : 'unhandled_rejection', error);
    stop(1);
  });
}
