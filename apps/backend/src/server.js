"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const static_1 = __importDefault(require("@fastify/static"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const routes_1 = require("./modules/auth/routes");
const routes_2 = require("./modules/sync/routes");
const routes_3 = require("./modules/fotos/routes");
dotenv_1.default.config();
const app = (0, fastify_1.default)({ logger: true });
app.register(cors_1.default, { origin: '*' });
app.register(jwt_1.default, {
    secret: process.env.JWT_SECRET || 'supersecret123',
});
app.register(multipart_1.default, {
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    }
});
app.register(static_1.default, {
    root: path_1.default.join(__dirname, '../../uploads'),
    prefix: '/uploads/',
});
app.get('/health', async () => {
    return { status: 'ok' };
});
app.register(routes_1.authRoutes);
app.register(routes_2.syncRoutes);
app.register(routes_3.fotoRoutes);
const start = async () => {
    try {
        await app.listen({ port: 3333, host: '0.0.0.0' });
        console.log(`Backend rodando na porta 3333`);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map