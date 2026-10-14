const app = require("./app");

const PORT = process.env.PORT || 3000;

require('./operations/configuration').validateStartup();

const server = app.listen(PORT, "0.0.0.0", () => {
  require("./operations/logger").log("server_started");
});
server.headersTimeout = 10000;
server.requestTimeout = 15000;
require('./operations/shutdown').installShutdown(server, app, require('./database/db'));
