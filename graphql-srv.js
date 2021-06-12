
const graphql = require('graphql')
const { PassThrough } = require('stream')
const {contentType, errors} = require('./utils')

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
    schema: graphql.buildSchema(schema),
    rootValue: resolver,
    context: {}
}

module.exports = async reqData => {

    const {urn, method, headers, urlParam, reqStream} = reqData

    const typeInfo = (_o = contentType(headers['content-type'])).type === undefined ? { ..._o, type: 'application/json' } : _o
    if (!['application/json', 'application/graphql'].includes(typeInfo.type)) errors(415, `Unsupported Media Type "${typeInfo.type}"`)
    if (!['utf8', 'utf16le'].includes(typeInfo.charset)) errors(415, `Unsupported Media Type Charset "${typeInfo.charset}". Only 'utf-8', 'utf-16'`)
    // https://datatracker.ietf.org/doc/html/rfc7159#section-8.1
    // https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings

    let _req
    if (['GET'].includes(method)) {
        _req = (_u = urlParam).variables === '{}' ? { ..._u, variables: {}} : _u
    } else {
        const _b = []
        for await (const _c of reqStream) _b.push(_c)
        const _e = await Buffer.concat(_b).toString(typeInfo.charset)
        _req = JSON.parse(_e)
    }

    const { query, variables, operationName } = _req

    const schema = options.schema
    const rootValue = options.rootValue
    const context = options.context

    // Validate Schema
    const schemaValidationErrors = graphql.validateSchema(schema)
    if (schemaValidationErrors.length > 0) {
        errors(500, 'GraphQL validation error', schemaValidationErrors)
    }

    // Parse source to AST, reporting any syntax error
    const documentAST = graphql.parse(new graphql.Source(query, 'GraphQL request'))

    //Only query operations are allowed on GET requests.
    if (method === 'GET') {
        const operationAST = graphql.getOperationAST(documentAST, operationName)
        if (operationAST && operationAST.operation !== 'query') {
            errors(405, `Can only perform a ${operationAST.operation} operation from a POST request`)
        }
    }

    // Validate AST, reporting any errors
    const validationErrors = graphql.validate(schema, documentAST, [
        ...graphql.specifiedRules,
    ])
    if (validationErrors.length > 0) {
        errors(500, 'GraphQL validation error', validationErrors)
    }

    // Perform the execution, reporting any errors creating the context
    let result
    try {
        result = await graphql.execute({
            schema: schema,
            document: documentAST,
            rootValue: rootValue,
            contextValue: context,
            variableValues: variables,
            operationName: operationName,
            fieldResolver: null,
            typeResolver: null
        })
    }
    catch (contextError) {
        errors(500, 'GraphQL execution context error', contextError)
    }

    // if (errorAcc.length) result.errors = errorAcc // TODO: formatted errors

    const code = 200

    return {
        code,
        headers: {
            'Content-Type': 'application/json'
        },
        resStream: new PassThrough().end(Buffer.from(JSON.stringify(result), typeInfo.charset))
    }

    // '{"data":{"ping":' + new Date().getMilliseconds() + '}}'

}
