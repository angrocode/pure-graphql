
const zlib = require('zlib')
const { Readable } = require('stream')
const { pipeline } = require('stream/promises')
const { STATUS_CODES } = require('_http_server')

errors = (code, msg, error) => {
    console.log(`${code}: ${STATUS_CODES[code]}`)
    console.log(`\n === ${msg} === \n`, error ? error : '')
}

module.exports.errors = errors

module.exports.contentType = str => {
    let t, c, _s

    if(str) {
        const a = str.replace(';', ' ').split(' ').filter(Boolean)
        if(a.length >= 1) t = a[0].trim().toLowerCase()
        if(a.length == 2) c = (_s = a[1].split('=')).length == 1 ? _s[0].trim().toLowerCase() : _s[1].trim().toLowerCase()
    }

    t = t ? t : 'application/json' // TODO: Media Type

    switch (c) {
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

module.exports.contentEncoding = async (input, encoding, callback) => {

    if (encoding === undefined) {
        await pipeline(input, callback).catch(e => { errors(500, 'contentEncoding', e) })

    } else if (encoding.includes('gzip')) {
        await pipeline(input, zlib.createGzip(), callback).catch(e => { errors(500, 'contentEncoding createGzip', e) })

    } else if (encoding.includes('deflate')) {
        await pipeline(input, zlib.createDeflate(), callback).catch(e => { errors(500, 'contentEncoding createDeflate', e) })

    } else if (encoding.includes('br')) {
        await pipeline(input, zlib.createBrotliCompress(), callback).catch(e => { errors(500, 'contentEncoding createBrotliCompress', e) })

    }

}

module.exports.contentDecoding = async (input, decoding, callback) => {

    if (decoding === undefined) {
        await pipeline(input, callback).catch(e => { errors(500, 'contentDecoding', e) })

    } else if (decoding.includes('gzip')) {
        await pipeline(input, zlib.createGunzip(), callback).catch(e => { errors(500, 'contentDecoding createGunzip', e) })

    } else if (decoding.includes('deflate')) {
        await pipeline(input, zlib.createInflate(), callback).catch(e => { errors(500, 'contentDecoding createInflate', e) })

    } else if (decoding.includes('br')) {
        await pipeline(input, zlib.createBrotliDecompress(), callback).catch(e => { errors(500, 'contentDecoding createBrotliDecompress', e) })

    }

}

module.exports.createReadable = async (txt, callback) => {

    const str = new Readable({
        read() {
            this.push(txt)
            this.push(null)

        }
    })

    await pipeline(str, callback).catch(e => { errors(500, 'readableStream', e) })
}
