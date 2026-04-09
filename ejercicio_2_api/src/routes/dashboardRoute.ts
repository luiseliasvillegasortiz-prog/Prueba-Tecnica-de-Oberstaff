import fs from "node:fs/promises";
import path from "node:path";
import { FastifyInstance } from "fastify";

export async function dashboardRoute(app: FastifyInstance) {
  app.get("/dashboard", async (_request, reply) => {
    // Servimos un HTML simple para visualizar resultados de la prueba en navegador
    // sin introducir dependencias front adicionales.
    const htmlPath = path.resolve(process.cwd(), "src/public/dashboard.html");
    const html = await fs.readFile(htmlPath, "utf8");
    reply.type("text/html; charset=utf-8").send(html);
  });
}
