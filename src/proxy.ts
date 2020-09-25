import { URL } from 'url';
import * as zlib from 'zlib';
import * as stream from 'stream';
import * as settings from './settings';
import * as httpProxy from 'http-proxy';
import * as replaceStream from 'replacestream';
import { ServerResponse, IncomingMessage, IncomingHttpHeaders } from 'http';


let proxyServer: httpProxy | undefined = undefined;


class CookieValue {
    value: string;
    origin: string;

    constructor(value: string, origin: string) {
        this.value = value;
        this.origin = origin;
    }
}

class Cookie {
    storage: { [index:string] : CookieValue } = {};

    constructor(headers: IncomingHttpHeaders) {
        let cookieHeader = headers.cookie;
        if (cookieHeader === undefined) {
            return;
        }

        let parts: string[] = cookieHeader.split(";").filter((str: string) => { return typeof str === "string" && !!str.trim(); });
        parts.forEach((part) => {
            let sides = part.split("=");
            if (sides.length === 2) {
                this.storage[sides[0].trim()] = new CookieValue(sides[1].trim(), part.trim());
            } else {
                this.storage[part] = new CookieValue(part, part);
            }
        });
    }

    getValue(name: string): string | undefined {
        if (name in this.storage) {
            return this.storage[name].value;
        }

        return undefined;
    }

    toString(): string {
        return Object.values(this.storage)
            .map((property) => `${property.origin}`)
            .join("; ");
    }
}

function decompessWrap(proxyRes: IncomingMessage): stream.Readable {
    switch (proxyRes.headers['content-encoding']) {
        case 'br':
            return proxyRes.pipe(zlib.createBrotliDecompress());
        case 'gzip':
            return proxyRes.pipe(zlib.createGunzip());
        case 'deflate':
            return proxyRes.pipe(zlib.createInflate());
        default:
            return proxyRes;
      }
}

class Response {
    private proxyRes: IncomingMessage;
    private req: IncomingMessage;
    private res: ServerResponse;

    constructor(proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) {
        this.proxyRes = proxyRes;
        this.req = req;
        this.res = res;
    }

    private copyHeaders() {
        if (this.req.httpVersion === '1.0') {
            delete this.proxyRes.headers['transfer-encoding'];
            this.proxyRes.headers.connection = this.req.headers.connection || 'close';
        } else if (this.req.httpVersion !== '2.0' && !this.proxyRes.headers.connection) {
            this.proxyRes.headers.connection = this.req.headers.connection || 'keep-alive';
        }

        Object.keys(this.proxyRes.headers).forEach((key) => {
            var header = this.proxyRes.headers[key];
            if (header !== undefined) {
                this.res.setHeader(key.trim(), header);
            }
        });


        if (this.proxyRes.statusCode) {
            this.res.statusCode = this.proxyRes.statusCode;
        }

        if(this.proxyRes.statusMessage) {
            this.res.statusMessage = this.proxyRes.statusMessage;
        }
    }

    private decompessStream(input: stream.Readable, contentEncoding: string | undefined): stream.Readable {
        switch (contentEncoding) {
            case 'br':
                return input.pipe(zlib.createBrotliDecompress());
            case 'gzip':
                return input.pipe(zlib.createGunzip());
            case 'deflate':
                return input.pipe(zlib.createInflate());
            default:
                return input;
          }
    }

    private processCommon(input: stream.Readable): stream.Readable {
        return input;
    }

    private processJs(input: stream.Readable): stream.Readable {
        return input;
    }

    private processHtml(input: stream.Readable): stream.Readable {
        let cookie = new Cookie(this.req.headers);
        let mobileModeExpectedValue = settings.isMobileMode() ? "1" : "0";
        let mobileModeActualValue = cookie.getValue("override-mobile-detect");
        if (mobileModeActualValue !== mobileModeExpectedValue) {
            this.res.setHeader('Set-Cookie', `override-mobile-detect=${mobileModeExpectedValue}`);
        }
        return input;
    }

    process(): void {
        this.copyHeaders();
        let contentType = this.proxyRes.headers["content-type"];
        let contentEncoding = this.proxyRes.headers['content-encoding'];
        let outStream;
        if (contentType === undefined) {
            outStream = this.processCommon(this.proxyRes);
        } else if (contentType.startsWith("application/javascript")) {
            this.res.setHeader('content-encoding', 'identity');
            outStream = this.processJs(this.decompessStream(this.proxyRes, contentEncoding));
        } else if (contentType.startsWith("text/html")) {
            outStream = this.processHtml(this.proxyRes);
        } else {
            outStream = this.processCommon(this.proxyRes);
        }

        outStream.pipe(this.res);
    }
}

function start(address: URL, proxyPort: number): void {
    if (proxyServer !== undefined) {
        proxyServer.close();
        proxyServer = undefined;
    }

    let isSecure = (address.protocol === "https:");
    let options: httpProxy.ServerOptions = {
        secure: isSecure ? false : undefined,
        target: address.toString(),
        changeOrigin: isSecure ? true : undefined,
        selfHandleResponse: true,
    };

    proxyServer = httpProxy.createProxyServer(options).listen(proxyPort);
    proxyServer.on("proxyRes", function (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) {
        let r = new Response(proxyRes, req, res);
        r.process();
    });
}

export function activate(): void {
    if (proxyServer !== undefined) {
        console.error("Double activation of the http proxy");
        return;
    }

    start(settings.getDevDocsURL(), settings.getProxyPort());
}

export function deactivate(): void {
    if (proxyServer === undefined) {
        console.error("Double deactivation of the http proxy");
        return;
    }

    proxyServer.close();
    proxyServer = undefined;
}
