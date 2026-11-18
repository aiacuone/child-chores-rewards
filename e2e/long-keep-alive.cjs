// Loaded only by the test servers (playwright.config.ts). Node closes a connection
// after 5 idle seconds, and a test's next request can land on it at that moment
// and fail with ECONNRESET. Browsers retry this by themselves; test requests do not.
const http = require('node:http');

const listen = http.Server.prototype.listen;
http.Server.prototype.listen = function (...args) {
	this.keepAliveTimeout = 120_000;
	this.headersTimeout = 125_000;
	return listen.apply(this, args);
};
