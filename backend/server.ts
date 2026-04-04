import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import appHandler from './index';

const port = Number(process.env.PORT ?? 3000);

const server = createServer(async (request, response) => {
  try {
    const origin = `http://${request.headers.host || 'localhost'}`;
    const url = new URL(request.url || '/', origin);
    const method = request.method || 'GET';
    const body =
      method === 'GET' || method === 'HEAD'
        ? undefined
        : (Readable.toWeb(request) as unknown as BodyInit);

    const webResponse = await appHandler(
      new Request(
        url,
        {
          method,
          headers: new Headers(request.headers as Record<string, string>),
          body,
          ...(body ? ({ duplex: 'half' } as const) : {})
        } as RequestInit
      )
    );

    response.statusCode = webResponse.status;

    webResponse.headers.forEach((value, key) => {
      response.setHeader(key, value);
    });

    if (!webResponse.body) {
      response.end();
      return;
    }

    Readable.fromWeb(webResponse.body as unknown as NodeReadableStream).pipe(response);
  } catch (error) {
    response.statusCode = 500;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Request failed'
      })
    );
  }
});

server.listen(port, () => {
  console.log(`[backend] running at http://localhost:${port}`);
});
