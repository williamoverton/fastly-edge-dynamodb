import { DynamoClient } from "../../lib/dynamodb";
import { DeepJsonParse } from "as-deepjson";
import { JSON } from "assemblyscript-json"
import { Fastly } from "@fastly/as-compute";

export default function render(): string {

    const dict = new Fastly.Dictionary("aws_creds")

    const accessKey = <string>dict.get("accessKey")
    const secretKey = <string>dict.get("secretKey")
    const tableName = <string>dict.get("tableName")
    const db = new DynamoClient("dynamo_backend", "eu-west-2", accessKey, secretKey);

    const data = new DeepJsonParse(db.scan(tableName))

    const polls: Array<Poll> = getPolls(data)

    return `
<html>
    <head>
        <title>Edge Polls</title>
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/5.0.0-alpha2/css/bootstrap.min.css" integrity="sha384-DhY6onE6f3zzKbjUPRc2hOzGAdEf4/Dz+WJwBvEYL/lkkIsI3ihufq9hk9K4lVoK" crossorigin="anonymous">
        <script src="https://stackpath.bootstrapcdn.com/bootstrap/5.0.0-alpha2/js/bootstrap.bundle.min.js" integrity="sha384-BOsAfwzjNJHrJ8cZidOg56tcQWfp6y72vEJ8xQ9w6Quywb24iOsW913URv1IS4GD" crossorigin="anonymous"></script>
    </head>
    <body>
        <div class="container">
            <br>
            <h1>Edge Polls</h1>
            <hr />
            ` + renderPolls(polls) + `
            <hr />
            <h4>Create new Poll</h4>
            <br>
            <form method="GET" action="/new-poll">
                <div class="mb-3">
                    <label for="exampleInputEmail1" class="form-label">Poll Title</label>
                    <input type="text" class="form-control" id="poll-title" name="poll-title" aria-describedby="poll-title-help">
                    <div id="poll-title-help" class="form-text">The title for your poll</div>
                </div>
                <button type="submit" class="btn btn-primary">Submit</button>
            </form>
        </div>

    </body>
</html>
`
}

function renderPolls(polls: Array<Poll>): string {
    let body = "";

    for (let i = 0; i < polls.length; i++) {
        body += `
        <div class="card shadow border-primary mb-5">
            <div class="card-body">
                ` + polls[i].title + `
            </div>
            <div class="card-footer">
                <div class="clearfix">
                    Votes: ` + polls[i].votes + `
                    <a class="btn btn-success float-end" href="/vote/` + polls[i].id + `">+1</a>
                </div>
            </div>
        </div>
        
        `
    }

    return body;
}

function getPolls(data: DeepJsonParse): Array<Poll> {
    const items: JSON.Arr = <JSON.Arr>data.get("Items")

    const polls: Array<Poll> = new Array<Poll>(items._arr.length)

    for (let i = 0; i < items._arr.length; i++) {

        const id = data.get("Items[" + i.toString() + "].id.S")
        const title = data.get("Items[" + i.toString() + "].title.S")
        const votes = data.get("Items[" + i.toString() + "].votes.N")

        if (id != null && title != null && votes != null) {
            polls[i] = new Poll(
                id.toString(),
                title.toString(),
                votes.toString()
            )
        }
    }

    return polls.sort(sortPolls)
}

function sortPolls(a: Poll, b: Poll): i32 {
    return <i32>(parseInt(b.votes) - parseInt(a.votes))
}

class Poll {
    id: string
    title: string
    votes: string
    constructor(id: string, title: string, votes: string) {
        this.id = id
        this.title = title
        this.votes = votes
    }
}