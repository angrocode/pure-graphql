
const http = require('http')
const { PassThrough } = require('stream')
const { pipeline } = require('stream/promises')
const {urlParser, acceptEncoding, contentDecoders, contentEncoders} = require('./utils')

const favicon = async reqData => {
    const ico = `iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA
    7DAcdvqGQAAAHDSURBVDhPY2TAAtZdb2Nk+PfHCcg0AeL/QHyWgYllX5BmFYiNApigNBysu9okDdTc9P//P8Z7b09duPv25Js//35xAcXqwXJoAMUFa
    683szH++1/9+uv97k8/Xq4HCrkA8U8gli+12/YSaEAzIxNDc6Bm3S+QehBAcQFQcziQmv/5x0tuIK0NFmRgWALSDGEyzv7/jyEawoYAFigNAxJB2nUP
    QIxF5/I02Vi4XrIxcxr2HWFL/Pvvl8e9t8eylIQtRcEqoQDdAObuQ16qQHruu+9PHsgK6LMDQ80IGI7zQJL/GRjngtSA2DCAHogsPKxCb4C00e+/P2K
    ffbx2/9//v/Z///1+DhT7z8rM8RhI4zVghTifWgSQzgXifz/+fN4aqtN0CMguBeJeOQEDWyC9HIjhAMUAoP/vAKnvysIWv4EBpgF0fg1IXIPLbBlQ7D
    aQ+Reo5i5IDAawJ6SrTXZAyoGDhfcfw///LD/+fgFF5VGgZpBriAefv3yq+ATEUC5WgJESSQUDbwDWQOw+5A1KPJOYGVmUgUoY//7/fRNIF5TabT0PV
    QIHOFzwH2gAw+G///8sAGqeD2QfA4oZgqVQAAMDANfApeNG0BOMAAAAAElFTkSuQmCC`
    return { code: 200, headers: { 'Content-Type': 'image/x-icon' },
        resStream: new PassThrough().end(Buffer.from(ico, 'base64'))
    }
}

const routing = {
    'favicon.ico': favicon,
    '/': require('./graphql-console'),
    'graphql': require('./graphql-srv'),
    'files,download': '', // routing /files/download
}

http.createServer(async (req, res) => {

    const { urn, urlParam } = urlParser(req.url)
    const decoding = req.headers['content-encoding']
    const encoding = acceptEncoding(req.headers['accept-encoding'])

    const reqStream = new PassThrough()
    const de = decoding ? contentDecoders[decoding] : PassThrough
    await pipeline(req, de(), reqStream)

    const resData = routing[urn.toString()]({
        urn,
        method: req.method,
        headers: req.headers,
        urlParam,
        reqStream,
    })

    const {code, headers: _headers, resStream} = await resData

    const headers = {
        ..._headers,
        'Accept-Encoding': 'gzip, deflate, br'
    }
    encoding & urn.toString() !== 'favicon.ico' ? headers['Content-Encoding'] = encoding : ''

    res.writeHead(code, headers)

    const en = encoding & urn.toString() !== 'favicon.ico' ? contentEncoders[encoding] : PassThrough
    await pipeline(resStream, en(), res)


}).listen(80, 'localhost', e => {
    e ? console.log(`HTTP server start error: ${e}`) : console.log(`HTTP server running ...`)
})
