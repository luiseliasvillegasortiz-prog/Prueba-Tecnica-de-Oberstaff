import Fastify from "fastify";
import { loadDataStore } from "./services/dataLoader.js";
import { intervencionesRoutes } from "./routes/intervencionesRoutes.js";
import { kpisRoutes } from "./routes/kpisRoutes.js";
import { dashboardRoute } from "./routes/dashboardRoute.js";

const PORT = Number(process.env.PORT ?? 3000);

async function buildServer() {
  const app = Fastify({
    logger: true
  });

  // Cargamos datos una vez al arranque porque esta API es de memoria (sin persistencia).
  const store = await loadDataStore();

  await intervencionesRoutes(app, store);
  await kpisRoutes(app, store);
  await dashboardRoute(app);

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: "Ruta no encontrada" });
  });

  return app;
}

async function start() {
  try {
    const app = await buildServer();
    await app.listen({ port: PORT, host: "0.0.0.0" });
  } catch (error) {
    // Mostramos error de arranque completo para diagnosticar rapido rutas/CSV/dependencias.
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  }
}

void start();
