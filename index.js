

const { createServer: httpServer } = require('http')
const { PassThrough } = require('stream')
const { pipeline } = require('stream/promises')

const { eHTML, logger } = require('./utils.js')
const { urlParser, getEncoding, contentDecoders, contentEncoders } = require('./utils.js')


const routing = {
    /* eslint-disable node/global-require */
    'favicon.ico': require('./utils.js').favicon,
    '/': require('./graphql-console.js'),
    'graphql': require('./graphql-srv.js'),
    'files,download': '', // routing /files/download
}

httpServer(async (req, res) => {

    const { urn, urlParam } = urlParser(req.url)
    const decoding = req.headers['content-encoding']
    const encoding = getEncoding(req.headers['accept-encoding'])

    const reqStream = new PassThrough()
    const de = decoding ? contentDecoders[decoding] : PassThrough
    await pipeline(req, de(), reqStream).catch(e => logger(500, 'Request pipeline', e))

    const resData = !routing[urn.toString()]
        ? eHTML(404, 'Rout', urn.toString())
        : routing[urn.toString()]({
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
    if (encode && encoding) headers['Content-Encoding'] = encoding

    res.writeHead(code, headers)

    const en = encode && encoding ? contentEncoders[encoding] : PassThrough
    await pipeline(resStream, en(), res).catch(e => logger(500, 'Response pipeline', e))


}).listen(80, 'localhost', e => {
    e ? logger(500, 'HTTP server start error', e) : logger(200, 'HTTP server running ...')
})
