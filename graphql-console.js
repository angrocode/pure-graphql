
const body = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Console</title>
</head>
<body style="background-color: #161b22">
    <div style="
        display: flex;
        justify-content: center;
        font-size: xx-large;
        font-weight: bold;
        color: olivedrab;
        "
    >
        GraphQL console
    </div>
</body>
</html>
`

const { PassThrough } = require('stream')
const {contentType, errors} = require('./utils')

module.exports = async reqData => {

    const { headers } = reqData

    const typeInfo = contentType(headers['content-type'])

    const code = 200

    return {
        code,
        headers: {
            'Content-Type': 'text/html'
        },
        resStream: new PassThrough().end(Buffer.from(body, typeInfo.charset))
    }
}
