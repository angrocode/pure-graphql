
const {contentType, errors} = require('./utils')
const graphql = require('graphql')

const util = require('util')
// console.log(util.inspect('', false, 33, true))

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
    context: ''
}

module.exports = async data => {

    const { urn, method, headers, reqStream, resStream } = data
    if (reqStream === undefined || resStream === undefined) errors(500, `graphql-srv reqStream:${typeof reqStream}, resStream:${typeof resStream}`)

    const typeInfo = contentType(headers['content-type'])
    if(!['application/json', 'application/graphql'].includes(typeInfo.type)) errors(415, `Unsupported Media Type "${typeInfo.type}"`)
    if(!['utf8', 'utf16le'].includes(typeInfo.charset)) errors(415, `Unsupported Media Type Charset "${typeInfo.charset}". Only 'utf-8', 'utf-16'`)
    // https://datatracker.ietf.org/doc/html/rfc7159#section-8.1
    // https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings

    const _b = []
    for await (const _c of reqStream) _b.push(_c)
    const _e = await Buffer.concat(_b).toString(typeInfo.charset)
    const _req = JSON.parse(_e, (k, v) => {
        if (k === '') return v
        return v === '{}' ? {} : v
    })

    const { query, variables, operationName } = _req

    const schema = options.schema
    const rootValue = options.rootValue
    const context = options.context

    // Validate Schema
    const schemaValidationErrors = graphql.validateSchema(schema)
    if (schemaValidationErrors.length > 0) {
        errors(500, 'GraphQL validation error', schemaValidationErrors)
    }

    // Parse source to AST, reporting any syntax error.
    const documentAST = graphql.parse(new graphql.Source(query, 'GraphQL request'))

    //Only query operations are allowed on GET requests.
    if (method === 'GET') {
        const operationAST = graphql.getOperationAST(documentAST, operationName)
        if (operationAST && operationAST.operation !== 'query') {
            errors(405, `Can only perform a ${operationAST.operation} operation from a POST request`)
        }
    }

    // Validate AST, reporting any errors.
    const validationErrors = graphql.validate(schema, documentAST, [
        ...graphql.specifiedRules,
    ])
    if (validationErrors.length > 0) {
        errors(500, 'GraphQL validation error', validationErrors)
    }

    // Perform the execution, reporting any errors creating the context.
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

    let _o
    const formattedResult = {
        ...result,
        // errors: (_o = result.errors) === null || _o === void 0 ? void 0 : _o.map(graphql.formatError),
    }

    // console.log(util.inspect(formattedResult, false, 33, true))


    resStream.write(Buffer.from(JSON.stringify(formattedResult), typeInfo.charset))
    resStream.end()

}
