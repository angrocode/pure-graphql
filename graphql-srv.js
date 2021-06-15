
const { buildSchema, parse, execute } = require('graphql')
const { validate, specifiedRules, TypeInfo } = require('graphql')
const { PassThrough } = require('stream')
const { contentType, errors, eJSON } = require('./utils')

const schema = `
    type Query {
        """getting the current milliseconds"""
        ping: Int
    }
`
const resolver = {
    ping: () => new Date().getMilliseconds()
}

const options = {
    schema: buildSchema(schema),
    rootValue: resolver,
    context: {},
    fieldResolver: null,
    typeResolver: null
}


module.exports = async reqData => {

    const { method, headers, urlParam, reqStream } = reqData

    const typeInfo = (_o = contentType(headers['content-type'])).type === null ? { ..._o, type: 'application/json' } : _o
    if (!['application/json', 'application/graphql'].includes(typeInfo.type)) errors(415, `Unsupported Media Type "${typeInfo.type}"`)
    if (!['utf8', 'utf16le'].includes(typeInfo.charset)) errors(415, `Unsupported Media Type Charset "${typeInfo.charset}". Only 'utf-8', 'utf-16'`)
    // https://datatracker.ietf.org/doc/html/rfc7159#section-8.1
    // https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings

    let req
    if (['GET'].includes(method)) {
        if (!urlParam) return eJSON(400)
        req = { ...urlParam, variables: JSON.parse(urlParam.variables)}
    } else {
        const _b = []
        for await (const _c of reqStream) _b.push(_c)
        if (!_b.length) return eJSON(400)
        const _e = await Buffer.concat(_b).toString(typeInfo.charset)
        req = JSON.parse(_e)
    }

    const documentAST = parse(req.query, {noLocation: true})

    const reqError = validate(options.schema, documentAST, specifiedRules)
    if (reqError.length) return eJSON(reqError)

    const result = await execute({
        schema: options.schema,
        document: documentAST,
        rootValue: options.rootValue,
        contextValue: options.context,
        variableValues: req.variables,
        operationName: req.operationName,
        fieldResolver: options.fieldResolver,
        typeResolver: options.typeResolver
    })

    return {
        code: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        encode: false,
        resStream: new PassThrough().end(Buffer.from(JSON.stringify(result), typeInfo.charset))
        // resStream: new PassThrough().end(Buffer.from('{"data":{"ping":' + new Date().getMilliseconds() + '}}', 'utf8'))
    }

}
