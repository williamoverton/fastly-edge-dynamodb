import { URL } from '@fastly/as-url';
import { Request, Response, Fastly, Headers } from "@fastly/as-compute";

import HomePage from "./pages/home"
import HandleVote from "./actions/vote"
import HandleNewPoll from "./actions/newPoll"

export default class Router {
    constructor() {

    }

    getRoute(url: URL): Response {
        const headers = new Headers();
        headers.set("content-type", "text/html")

        if (url.pathname == "/favicon.ico") {
            return new Response(String.UTF8.encode("NOT FOUND"), {
                status: 404,
                headers: headers,
                url: null
            })
        }

        if (url.pathname.indexOf("/vote/") == 0) {

            HandleVote(url)

            headers.set("Location", "/")
            headers.set("cache-control", "no-cache")
            return new Response(String.UTF8.encode("301 Moved Permanently"), {
                status: 301,
                headers: headers,
                url: null
            })
        }

        if (url.pathname == "/new-poll") {

            HandleNewPoll(url)

            headers.set("Location", "/")
            headers.set("cache-control", "no-cache")
            return new Response(String.UTF8.encode("301 Moved Permanently"), {
                status: 301,
                headers: headers,
                url: null
            })
        }

        return new Response(String.UTF8.encode(HomePage()), {
            status: 200,
            headers: headers,
            url: null
        })
    }
}