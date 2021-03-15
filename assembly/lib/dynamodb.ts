import { Console } from "as-wasi";
import RequestSigner from "./awsRequestSigner"
import { Request, Response, Fastly, RequestInit, Headers } from "@fastly/as-compute";
import { Bitray } from "as-bitray";

export class DynamoClient {
    backend: string
    region: string
    signer: RequestSigner
    url: string

    constructor(backend: string, region: string, accessKey: string, secretKey: string) {
        this.backend = backend
        this.region = region
        this.url = "https://dynamodb." + this.region + ".amazonaws.com/"

        this.signer = new RequestSigner("dynamodb", region, accessKey, secretKey)
    }

    get(table: string, pk: string, sk: string): string {

        const body = `{
    "TableName": "` + table + `",
    "Key": {
        "pk": {"S": "` + pk + `"},
        "sk": {"S": "` + (<string>sk) + `"}
    }
}`

        const authHeaders = this.signer.signRequest("/", "DynamoDB_20120810.GetItem", body)

        return this.makeRequest(authHeaders, body)
    }

    query(table: string, query: string, expressions: string): string {

        const body = `{
    "TableName": "` + table + `",
    "KeyConditionExpression": "` + query + `",
    "ExpressionAttributeValues": ` + expressions + `
}`

        const authHeaders = this.signer.signRequest("/", "DynamoDB_20120810.Query", body)

        return this.makeRequest(authHeaders, body)
    }

    updateItem(table: string, key: string, expressionVals: string, expression: string): string {

        const body = `{
    "TableName": "` + table + `",
    "Key": ` + key + `,
    "ExpressionAttributeValues": ` + expressionVals + `,
    "UpdateExpression": "` + expression + `" 
}`

        // Console.log(body + "\n")

        const authHeaders = this.signer.signRequest("/", "DynamoDB_20120810.UpdateItem", body)

        return this.makeRequest(authHeaders, body)
    }
    
    putItem(table: string, item: string): string {

        const body = `{
    "TableName": "` + table + `",
    "Item": ` + item + `
}`

        Console.log(body + "\n")

        const authHeaders = this.signer.signRequest("/", "DynamoDB_20120810.PutItem", body)

        return this.makeRequest(authHeaders, body)
    }
    
    scan(table: string): string {

        const body = `{
    "TableName": "` + table + `"
}`

        const authHeaders = this.signer.signRequest("/", "DynamoDB_20120810.Scan", body)

        return this.makeRequest(authHeaders, body)
    }

    private makeRequest(headers: Headers, body: string): string {
        let cacheOverride = new Fastly.CacheOverride();
        cacheOverride.setTTL(0);
        let reqInit = new RequestInit();
        reqInit.method = "POST";

        reqInit.body = new Bitray(body, "utf8").buffer;

        reqInit.headers = headers;

        let bReq = new Request(this.url, reqInit);

        return Fastly.fetch(bReq, {
            backend: this.backend,
            cacheOverride,
        }).wait().text()
    }
}