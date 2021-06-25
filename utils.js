
const zlib = require('zlib')
const { STATUS_CODES } = require('http')
const { PassThrough } = require('stream')


logger = async (code, comment, data) => {

    let out = code + ': ' + STATUS_CODES[code] + '\n === ' + comment + ' === \n' + (data ? data : '')
    process.stdout.write(out + '\n')

}
module.exports.logger = logger

module.exports.contentType = str => {
    let t = '', c = ''

    if(str) {
        const _a = str.replace(';', ' ').split(' ').filter(Boolean)
        if(_a.length >= 1) t = _a[0].trim().toLowerCase()
        if(_a.length == 2) c = (_s = _a[1].split('=')).length == 1 ? _s[0].trim().toLowerCase() : _s[1].trim().toLowerCase()
    }

    switch (c) { // TODO: more charsets
        case '':
            c = 'utf8'
            break
        case 'utf-8':
            c = 'utf8'
            break
        case 'utf-16':
            c = 'utf16le'
    }

    return {
        type: t,
        charset: c
    }
}

module.exports.urlParser = url => {
    const _i = (_p = url.indexOf('?')) > 0 ? _p : url.length
    const urn = (_u = url.substring(0, _i).split('/').filter(Boolean)).length ? _u : ['/']
    if ((_q = url.substring(_i + 1)).length == 0) {
        return { urn, urlParam: null }
    } else {
        const _b = decodeURIComponent(_q).split('&').filter(Boolean).map(c => c.split('='))
        return { urn, urlParam: _b.length == 1 && _b[0].length == 1 ? _b[0][0] :  Object.fromEntries(_b) }
    }

}

module.exports.getEncoding = str => {
    if (str.includes('identity')) return null
    if (str.includes('*')) return 'br'
    if (str.includes('br')) return 'br'
    if (str.includes('gzip')) return 'gzip'
    if (str.includes('deflate')) return 'deflate'
    return null
}

module.exports.contentDecoders = {
    gzip: zlib.createGunzip,
    deflate: zlib.createInflate,
    br: zlib.createBrotliDecompress,
}

module.exports.contentEncoders = {
    gzip: zlib.createGzip,
    deflate: zlib.createDeflate,
    br: zlib.createBrotliCompress,
}

module.exports.eHTML = async (code, comment, data) => {
    logger(code, comment, data)

    const body = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${code}</title>
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
            ${STATUS_CODES[code]}
        </div>
        ${
        !comment ? '' :
            `<div style="
            display: flex;
            justify-content: center;
            font-size: large;
            font-weight: bold;
            color: olivedrab;
            "
            >
                ${comment.toString()}
            </div>`
        }
        ${
        !data ? '' :
            `<div style="
            display: flex;
            justify-content: center;
            font-size: large;
            font-weight: bold;
            color: olivedrab;
            "
            >
                ${data.toString()}
            </div>`
        }
    </body>
    </html>
    `

    return { code: code, headers: { 'Content-Type': 'text/html' },
        resStream: new PassThrough().end(Buffer.from(body, 'utf8'))
    }
}

module.exports.eJSON = async (code, comment, data) => {
    logger(code, comment, data)

    const body = {
        errors: [ { message: `[${code}] ${STATUS_CODES[code]}` + (comment ? ': ' + comment : '') } ]
    }

    if (data) body.errors = [...body.errors, ...(Array.isArray(data) ? data : [data])]

    return { code, headers: { 'Content-Type': 'application/json' }, encode: true,
        resStream: new PassThrough().end(Buffer.from(JSON.stringify(body, (k, v) => k === 'message' ? v.replace(/"/g, "'") : v), 'utf8'))
    }
}

module.exports.favicon = async () => {
    const ico = `iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA
    7DAcdvqGQAAAHDSURBVDhPY2TAAtZdb2Nk+PfHCcg0AeL/QHyWgYllX5BmFYiNApigNBysu9okDdTc9P//P8Z7b09duPv25Js//35xAcXqwXJoAMUFa
    683szH++1/9+uv97k8/Xq4HCrkA8U8gli+12/YSaEAzIxNDc6Bm3S+QehBAcQFQcziQmv/5x0tuIK0NFmRgWALSDGEyzv7/jyEawoYAFigNAxJB2nUP
    QIxF5/I02Vi4XrIxcxr2HWFL/Pvvl8e9t8eylIQtRcEqoQDdAObuQ16qQHruu+9PHsgK6LMDQ80IGI7zQJL/GRjngtSA2DCAHogsPKxCb4C00e+/P2K
    ffbx2/9//v/Z///1+DhT7z8rM8RhI4zVghTifWgSQzgXifz/+fN4aqtN0CMguBeJeOQEDWyC9HIjhAMUAoP/vAKnvysIWv4EBpgF0fg1IXIPLbBlQ7D
    aQ+Reo5i5IDAawJ6SrTXZAyoGDhfcfw///LD/+fgFF5VGgZpBriAefv3yq+ATEUC5WgJESSQUDbwDWQOw+5A1KPJOYGVmUgUoY//7/fRNIF5TabT0PV
    QIHOFzwH2gAw+G///8sAGqeD2QfA4oZgqVQAAMDANfApeNG0BOMAAAAAElFTkSuQmCC`

    return { code: 200, headers: { 'Content-Type': 'image/x-icon' }, encode: false,
        resStream: new PassThrough().end(Buffer.from(ico, 'base64'))
    }
}
