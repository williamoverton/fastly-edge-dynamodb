import { DynamoClient } from "../../lib/dynamodb";
import { Console, Date } from "as-wasi";
import { URL } from '@fastly/as-url';
import { Fastly } from "@fastly/as-compute";

export default function action(url: URL): void {

    const dict = new Fastly.Dictionary("aws_creds")

    const accessKey = <string>dict.get("accessKey")
    const secretKey = <string>dict.get("secretKey")
    const tableName = <string>dict.get("tableName")
    const db = new DynamoClient("dynamo_backend", "eu-west-2", accessKey, secretKey);

    const pollName = url.search.split("=")[1].replaceAll("+", " ")

    const pollId = Date.now().toString()

    const output = db.putItem(tableName, `{
        "id": { "S": "` + pollId + `" },
        "title": { "S": "` + pollName + `" },
        "votes": { "N": "0" }
    }`)

    Console.log(output + "\n")
    Console.log("Handled create poll action!\n")
}
