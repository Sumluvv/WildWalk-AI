import { createAppServer } from "./app.js";

const port = Number(process.env.PORT || 3000);
const server = createAppServer();

server.listen(port, () => {
  // Keep log concise for local dev.
  console.log(`[wildwalk-ai] server listening on :${port}`);
});
