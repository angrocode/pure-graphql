
const zlib = require('zlib')
const { STATUS_CODES } = require('http')

// globalThis.errorAcc = []
errors = (code, msg, error) => {
    console.log(`${code}: ${STATUS_CODES[code]}`)
    console.log(`=== ${msg} ===`)
    console.log(error ? error : '')

    // errorAcc.push({ code: code, srv_message: STATUS_CODES[code], message: msg })

}
module.exports.errors = errors

module.exports.contentType = str => {
    let t, c

    if(str) {
        const _a = str.replace(';', ' ').split(' ').filter(Boolean)
        if(_a.length >= 1) t = _a[0].trim().toLowerCase()
        if(_a.length == 2) c = (_s = _a[1].split('=')).length == 1 ? _s[0].trim().toLowerCase() : _s[1].trim().toLowerCase()
    }

    switch (c) { // TODO: more charsets
        case undefined:
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
    const urlParam = (query = url.substring(_i + 1)).length
        ? decodeURIComponent(query).split('&').filter(Boolean)
        .reduce((a, c) => {
            const _z = c.split('=')
            a[_z[0]] = _z[1]
            return a
        }, {})
        : null

    return { urn, urlParam }
}

module.exports.acceptEncoding = str => {
    // https://datatracker.ietf.org/doc/html/rfc7231#section-5.3.4
    if(!str) return null

    let _a = str
        .split(',')
        .filter(Boolean)
        .reduce((a, c) => {
            a.push(c.split(';').map(v => {
                return (_v = v.split('=')).length == 1 ? _v[0].trim().toLowerCase() : _v[1].trim().toLowerCase()
            }))
            return a
        }, [])

    // "identity;q=0" or "*;q=0"
    if(_a.length == 1 & _a[0][0] == '*' & _a[0][1] == '0') return null
    if(_a.length == 1 & _a[0][0] == 'identity' & _a[0][1] == '0') return null

    _a = _a
        .map(v => { if (['gzip', 'deflate', 'br', '*'].includes(v[0])) return v })
        .filter(Boolean)
        .sort((a, b) => {
            return a[1] ? a[1] < b[1] ? 1 : -1 : 0
        })

    return _a[0][0] == '*' ? 'gzip' : _a[0][0]

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
