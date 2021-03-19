import * as SHA256 from "./vendor/sha256"
import { Bitray } from 'as-bitray'
import { Date as ADate } from "as-date"
import { Console, Date } from "as-wasi";
import { setU8 } from "../../node_modules/wasm-crypto/assembly/crypto"
import { Headers } from "@fastly/as-compute";

export default class RequestSigner {
    region: string
    accessKey: string
    secretKey: string
    service: string

    constructor(service: string, region: string, accessKey: string, secretKey: string) {
        this.service = service
        this.region = region
        this.accessKey = accessKey
        this.secretKey = secretKey
    }

    signRequest(uri: string, xtarget: string, body: string): Headers {

        const headers = new Headers();
        
        const date = this.getFormatedDate()

        // Console.log(date + "\n")

        // Console.log("Body:\n" + body + "\n")
        // Console.log("Bhash: " + this.getHash(body) + "\n")

        const authHeader = this.getAuthorizationHeader(uri, body, date, xtarget)


        // Console.log(authHeader + "\n")

        // const thash = this.hmac(new Bitray("hello", "utf8").binary, new Bitray("hello", "utf8").binary)
        // Console.log(this.uint8ArrayToString(thash) + "\n")

        headers.set("Authorization", authHeader)
        headers.set("x-amz-date", date)
        headers.set("content-type", "application/x-amz-json-1.0")
        headers.set("x-amz-target", xtarget)
        headers.set("host", this.service + "." + this.region + ".amazonaws.com")

        return headers;
    }

    private getAuthorizationHeader(uri: string, body: string, date: string, xtarget: string): string {
        let signedHeaders = "content-type;host;x-amz-date;x-amz-target"

        let canonicalRequest = this.getCanonicalRequest(uri, date, signedHeaders, xtarget, body)
        let canonicalRequestHash = this.getHash(canonicalRequest)

        let credentialScope = this.getCredentialScope()

        let stringToSign = "AWS4-HMAC-SHA256\n" + date + "\n" + credentialScope + "\n" + canonicalRequestHash
        // Console.log("STS:\n" + stringToSign + "\n")

        let signature = this.hmac(new Bitray(stringToSign, "utf8").binary, this.getSignatureKey(date))
        let signatureHash = this.uint8ArrayToString(signature)

        const authorizationHeader = "AWS4-HMAC-SHA256 Credential=" + this.accessKey + "/" + credentialScope + ", SignedHeaders=" + signedHeaders + ", Signature=" + signatureHash

        return authorizationHeader;
    }

    private getSignatureKey(date: string): Uint8Array {
        let aws4Secret = "AWS4" + this.secretKey

        // Console.log("aws4Secret: " + aws4Secret + "\n")
        // Console.log("date: " + date + "\n")

        let signedDate = this.hmac(new Bitray(this.getCredentialDate(), "utf8").binary, new Bitray(aws4Secret, "utf8").binary)
        // Console.log("signedDate: " + this.uint8ArrayToString(signedDate) + "\n")

        let signedRegion = this.hmac(new Bitray(this.region, "utf8").binary, signedDate)
        // Console.log("signedRegion: " + this.uint8ArrayToString(signedRegion) + "\n")

        let signedService = this.hmac(new Bitray(this.service, "utf8").binary, signedRegion)
        // Console.log("signedService: " + this.uint8ArrayToString(signedService) + "\n")

        let signingKey = this.hmac(new Bitray("aws4_request", "utf8").binary, signedService)
        // Console.log("signingKey: " + this.uint8ArrayToString(signingKey) + "\n")

        return signingKey
    }

    private uint8ArrayToString(data: Uint8Array): string {
        let res = ""

        for (let i = 0; i < data.length; i++) {
            res += ('0' + (data[i] & 0xFF).toString(16)).slice(-2)
        }

        return res
    }

    private getCanonicalRequest(uri: string, date: string, signedHeaders: string, xtarget: string, body: string): string {
        let canonicalRequest = ""

        canonicalRequest += "POST\n" // HTTPRequestMethod  
        canonicalRequest += uri + "\n" // CanonicalURI  
        canonicalRequest += "\n" // CanonicalQueryString 
        canonicalRequest += this.getCanonicalHeaders(date, xtarget) + "\n" // CanonicalHeaders 
        canonicalRequest += signedHeaders + "\n" // SignedHeaders 
        canonicalRequest += this.getHash(body)

        // Console.log(canonicalRequest + "\n")

        return canonicalRequest;
    }

    private getCanonicalHeaders(date: string, xtarget: string): string {
        let ch = ""

        ch += "content-type:application/x-amz-json-1.0" + "\n"
        ch += "host:" + this.service + "." + this.region + ".amazonaws.com\n"
        ch += "x-amz-date:" + date + "\n"
        ch += "x-amz-target:" + xtarget + "\n"

        return ch;
    }

    private getCredentialScope(): string {
        return this.getCredentialDate() + "/" + this.region + "/" + this.service + "/aws4_request"
    }

    private getHash(body: string): string {
        const binary = new Bitray(body, "utf8");
        const output = new Uint8Array(32);
        
        SHA256.init()
        SHA256.update(changetype<usize>(binary.buffer), binary.length);
        SHA256.final(changetype<usize>(output.buffer));

        return this.uint8ArrayToString(output)
    }

    private getFormatedDate(): string {
        const d = new ADate(<i64>Date.now())

        let month = (d.getUTCMonth() + 1).toString()
        if (month.length < 2) month = "0" + month

        let day = d.getUTCDate().toString()
        if (day.length < 2) day = "0" + day

        let hour = d.getUTCHours().toString()
        if (hour.length < 2) hour = "0" + hour

        let mins = d.getUTCMinutes().toString()
        if (mins.length < 2) mins = "0" + mins

        let seconds = d.getUTCSeconds().toString()
        if (seconds.length < 2) seconds = "0" + seconds

        return d.getUTCFullYear().toString() + month + day + "T" + hour + mins + seconds + "Z"
    }

    private getCredentialDate(): string {
        const d = new ADate(<i64>Date.now())

        let month = (d.getUTCMonth() + 1).toString()
        if (month.length < 2) month = "0" + month

        let day = d.getUTCDate().toString()
        if (day.length < 2) day = "0" + day

        return d.getUTCFullYear().toString() + month + day
    }

    private hmac(m: Uint8Array, k: Uint8Array): Uint8Array {
        let ok = new Uint8Array(64)
        let ik = new Uint8Array(64)
        if (k.length > 64) {
            SHA256.init()
            SHA256.update(changetype<usize>(k.buffer), k.length);
            SHA256.final(changetype<usize>(k.buffer));
        }
        setU8(ok, k);
        for (let i = 0; i < ok.length; ++i) {
            ok[i] ^= 0x5c;
        }
        setU8(ik, k);
        for (let i = 0; i < ik.length; ++i) {
            ik[i] ^= 0x36;
        }
        
        // Console.log("Inner Pad: " + this.uint8ArrayToString(ik) + "\n")
        // Console.log("Outer Pad: " + this.uint8ArrayToString(ok) + "\n")

        let innerHash = new Uint8Array(32)
        
        SHA256.init()
        SHA256.update(changetype<usize>(ik.buffer), ik.length);
        SHA256.update(changetype<usize>(m.buffer), m.length);
        SHA256.final(changetype<usize>(innerHash.buffer));

        // Console.log("Inner Hash: " + this.uint8ArrayToString(innerHash) + "\n")

        const hashed = new Uint8Array(32);
        
        SHA256.init()
        SHA256.update(changetype<usize>(ok.buffer), ok.length);
        SHA256.update(changetype<usize>(innerHash.buffer), innerHash.length);
        SHA256.final(changetype<usize>(hashed.buffer));

        return hashed
    }
    
}