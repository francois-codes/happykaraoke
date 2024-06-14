import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

export async function startServer(configure: (app: express.Express) => void) {
  const app = express();

  const server = createServer(app);
  const io = new Server(server);

  app.get("/api", (_, res) => {
    res.status(200).json({ message: "Hello from server" });
  });

  io.on("connection", (socket) => {
    socket.on("message", (data, callback) => {
      console.log("message: ", data);
      callback({ message: "received: " + data.inbound });
    });
  });

  configure(app);

  server.listen(8081, () => {
    console.log("Server started at http://localhost:8081");
  });

  return server;
}
