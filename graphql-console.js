
const {contentType, errors} = require('./utils')

module.exports = async data => {
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
    const typeInfo = contentType(data.headers['content-type'])

    data.resStream.write(Buffer.from(body), typeInfo.charset)
    data.resStream.end()
}
