import { Request, Response, Fastly, Headers } from "@fastly/as-compute";
import { Console } from "as-wasi";

import { URL } from '@fastly/as-url';
import Router from "./views/router"

function main(req: Request): Response {

    const url = new URL(req.url);

    Console.log("[" + req.method + "] " + url.pathname + "\n")

    return new Router().getRoute(url)
}

Fastly.respondWith(main(Fastly.getClientRequest()));
