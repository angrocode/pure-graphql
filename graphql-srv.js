
const { buildSchema, parse, execute } = require('graphql')
const { validateSchema, validate, specifiedRules } = require('graphql')
const { PassThrough } = require('stream')
const { contentType, eJSON, logger } = require('./utils')
const { schema, resolver } = require('./gql')

let _s
try {
    _s = buildSchema(schema)
} catch (_e) {
    logger(500, 'Build schema', _e)
}
if ((_e = validateSchema(_s)).length) logger(500, 'Validate schema', _e)

const options = {
    schema: _s,
    rootValue: resolver,
    context: {},
    fieldResolver: null,
    typeResolver: null
}


module.exports = async reqData => {

    const { method, headers, urlParam, reqStream } = reqData

    const typeInfo = (_o = contentType(headers['content-type'])).type === null ? { ..._o, type: 'application/json' } : _o
    if (!['application/json', 'application/graphql'].includes(typeInfo.type)) return eJSON(415, 'Only application/json, application/graphql')
    if (!['utf8', 'utf16le'].includes(typeInfo.charset)) return eJSON(415, 'Only utf-8, utf-16')
    // https://datatracker.ietf.org/doc/html/rfc7159#section-8.1
    // https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings

    let req, documentAST, result

    if (['GET'].includes(method)) {
        if (!urlParam) return eJSON(400, 'The request cannot be empty')
        req = { ...urlParam, variables: JSON.parse(urlParam.variables)}
    } else {
        const _b = []
        for await (const _c of reqStream) _b.push(_c)
        if (!_b.length) return eJSON(400, 'The request cannot be empty')
        const _s = await Buffer.concat(_b).toString(typeInfo.charset)
        req = JSON.parse(_s)
    }

    try {
        documentAST = parse(req.query, {noLocation: true})
    } catch (_e) {
        return eJSON(500, 'Query parse', _e)
    }

    try {
        if ((_e = validate(options.schema, documentAST, specifiedRules)).length) return eJSON(500, 'Query validate', _e)
    } catch (_e) {
        return eJSON(500, 'Query validate', _e)
    }

    try {
        result = await execute({
            schema: options.schema,
            document: documentAST,
            rootValue: options.rootValue,
            contextValue: options.context,
            variableValues: req.variables,
            operationName: req.operationName,
            fieldResolver: options.fieldResolver,
            typeResolver: options.typeResolver
        })
    } catch (_e) {
        return eJSON(500, 'Query execute', _e)
    }

    return {
        code: 200,
        headers: {
            'Content-Type': `application/json; charset=${typeInfo.charset}`
        },
        encode: true,
        resStream: new PassThrough().end(Buffer.from(JSON.stringify(result), typeInfo.charset))
    }

}
