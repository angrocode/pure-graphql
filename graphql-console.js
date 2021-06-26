
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
const { contentType } = require('./utils.js')

module.exports = async reqData => {

    const { headers } = reqData

    const typeInfo = contentType(headers['content-type'])

    return {
        code: 200,
        headers: {
            'Content-Type': `text/html; charset=${typeInfo.charset}`
        },
        encode: true,
        resStream: new PassThrough().end(Buffer.from(body, typeInfo.charset))
    }
}
