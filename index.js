
const http = require('http')
const { Readable } = require('stream')
const {errors, contentType, contentEncoding, contentDecoding, createReadable} = require('./utils')

const routing = {
    '/': require('./graphql-console'),
    'graphql': require('./graphql-srv'),
    'files,download': '', // routing /files/download
}

http.createServer(async (req, res) => {

    const encodingInfo = req.headers['content-encoding']

    let urn, query, _i, _p, reqStream, resStream
    _i = (_p = req.url.indexOf('?')) > 0 ? _p : req.url.length
    urn = req.url.substring(0, _i).split('/').filter(Boolean)
    urn = urn.length ? urn : ['/']
    query = req.url.substring(_i + 1)

    switch (req.method){

        case 'GET':
            const body = decodeURIComponent(req.url.substring(_i + 1)).split('&').filter(Boolean)
                .reduce((a, c) => {
                    const _z = c.split('=')
                    a[_z[0]] = _z[1]
                    return a
                }, {})

            createReadable(JSON.stringify(body), async s => {
                return reqStream = s
            })
            break

        case 'POST':
            contentDecoding(req, encodingInfo, async s => {
                return reqStream = s
            })
            break

        default:
            errors(405, 'GraphQL only supports GET and POST requests')
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    // res.end('{"data":{"ping":0}}')

    const run = routing[urn.toString()](Object.freeze({
        urn,
        method: req.method,
        headers: req.headers,
        reqStream,
        resStream: res,
    }))

}).listen(80, 'localhost', e => {
    e ? console.log(`HTTP server start error: ${e}`) : console.log(`HTTP server running ...`)
})
