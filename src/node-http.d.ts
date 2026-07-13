declare module "node:http" {
  export interface IncomingHttpHeaders {
    readonly [name: string]: string | readonly string[] | undefined;
  }

  export interface IncomingMessage extends AsyncIterable<Uint8Array> {
    readonly headers: IncomingHttpHeaders;
    readonly method?: string;
    readonly url?: string;
    readonly destroyed: boolean;
    destroy(error?: Error): void;
  }

  export interface ServerResponse {
    statusCode: number;
    readonly headersSent: boolean;
    readonly writableEnded: boolean;
    setHeader(name: string, value: string | number | readonly string[]): this;
    end(data?: string): this;
    once(event: "close" | "finish", listener: () => void): this;
  }

  export interface Server {
    listen(port: number, host?: string, callback?: () => void): this;
    close(callback?: (error?: Error) => void): this;
  }

  export function createServer(
    requestListener: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>,
  ): Server;
}
