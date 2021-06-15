
const { createServer: httpServer } = require('http')
const { PassThrough } = require('stream')
const { pipeline } = require('stream/promises')
const { urlParser, getEncoding, contentDecoders, contentEncoders, eHTML } = require('./utils')


const routing = {
    'favicon.ico': require('./utils').favicon,
    '/': require('./graphql-console'),
    'graphql': require('./graphql-srv'),
    'files,download': '', // routing /files/download
}

httpServer(async (req, res) => {

    const { urn, urlParam } = urlParser(req.url)
    const decoding = req.headers['content-encoding']
    const encoding = getEncoding(req.headers['accept-encoding'])

    const reqStream = new PassThrough()
    const de = decoding ? contentDecoders[decoding] : PassThrough
    await pipeline(req, de(), reqStream)

    const resData = !(_run = routing[urn.toString()]) ? eHTML(404) : _run({
        urn,
        method: req.method,
        headers: req.headers,
        urlParam,
        reqStream,
    })

    const {code, headers: _headers, encode, resStream} = await resData

    const headers = {
        ..._headers,
        'Accept-Encoding': 'gzip, deflate, br'
    }
    encoding && encode ? headers['Content-Encoding'] = encoding : ''

    res.writeHead(code, headers)

    const en = encoding && encode ? contentEncoders[encoding] : PassThrough
    await pipeline(resStream, en(), res)


}).listen(80, 'localhost', e => {
    e ? console.log(`HTTP server start error: ${e}`) : console.log(`HTTP server running ...`)
})
