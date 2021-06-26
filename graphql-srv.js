
const { PassThrough } = require('stream')

const { buildSchema, parse, execute } = require('graphql')
const { validateSchema, validate, specifiedRules } = require('graphql')

const { contentType, eJSON, logger } = require('./utils.js')
const { schema, resolver } = require('./gql/index.js')

let s, e
try {
    s = buildSchema(schema)
} catch (e) {
    logger(500, 'Build schema', e)
}
if ((e = validateSchema(s)).length) logger(500, 'Validate schema', e)

const options = {
    schema: s,
    rootValue: resolver,
    context: {},
    fieldResolver: null,
    typeResolver: null
}


module.exports = async reqData => {

    const { method, headers, urlParam, reqStream } = reqData

    const conType = contentType(headers['content-type'])
    const typeInfo = conType.type === '' ? { charset: conType.charset, type: 'application/json' } : conType

    if (!['application/json', 'application/graphql'].includes(typeInfo.type)) return eJSON(415, 'Only application/json, application/graphql')
    if (!['utf8', 'utf16le'].includes(typeInfo.charset)) return eJSON(415, 'Only utf-8, utf-16')

    let req, documentAST, result

    if (['GET'].includes(method)) {
        if (!urlParam) return eJSON(400, 'The request cannot be empty')
        if (typeof urlParam === 'string'){
            req = { query: urlParam, variables: {}}
        } else {
            req = {...urlParam, variables: JSON.parse(urlParam.variables)}
        }

    } else {
        const b = []
        for await (const c of reqStream) b.push(c)
        if (!b.length) return eJSON(400, 'The request cannot be empty')
        const q = await Buffer.concat(b).toString(typeInfo.charset)
        try {
            req = JSON.parse(q)
        } catch {
            req = { query: q, variables: {}}
        }

    }

    try {
        documentAST = parse(req.query, {noLocation: true})
    } catch (e) {
        return eJSON(500, 'Query parse', e)
    }

    try {
        if ((e = validate(options.schema, documentAST, specifiedRules)).length) return eJSON(500, 'Query validate', e)
    } catch (e) {
        return eJSON(500, 'Query validate', e)
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
    } catch (e) {
        return eJSON(500, 'Query execute', e)
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
