import { DynamoClient } from "../../lib/dynamodb";
import { Console } from "as-wasi";
import { URL } from '@fastly/as-url';
import { Fastly } from "@fastly/as-compute";

export default function action(url: URL): void {

    const dict = new Fastly.Dictionary("aws_creds")

    const accessKey = <string>dict.get("accessKey")
    const secretKey = <string>dict.get("secretKey")
    const tableName = <string>dict.get("tableName")
    const db = new DynamoClient("dynamo_backend", "eu-west-2", accessKey, secretKey);

    const pollId = url.pathname.slice("/vote/".length)

    const output = db.updateItem(tableName, `{
        "id": { "S": "` + pollId + `"}
    }`, `{
        ":inc": { "N": "1" }
    }`, `ADD votes :inc`)

    Console.log(output + "\n")
    Console.log("Handled vote action!\n")
}
