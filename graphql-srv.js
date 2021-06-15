
const graphql = require('graphql')
const { PassThrough } = require('stream')
const {contentType, errors, eJSON} = require('./utils')

const schema = `
    type Query {
        """getting the current milliseconds"""
        ping(par: Int): Int
    }
`
const resolver = {
    ping: () => new Date().getMilliseconds()
}

const options = {
    schema: graphql.buildSchema(schema),
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

    if (!'query' in req) return eJSON('"query" not found in the request')
    if (!'variables' in req) return eJSON('"variables" not found in the request')
    if (!'operationName' in req) return eJSON('"operationName" not found in the request')


    let result
    try {
        const result = await graphql.execute({
            schema: options.schema,
            document: graphql.parse(req.query, {noLocation: true}),
            rootValue: options.rootValue,
            contextValue: options.context,
            variableValues: req.variables,
            operationName: req.operationName,
            fieldResolver: options.fieldResolver,
            typeResolver: options.typeResolver
        })
    } catch (e) {
        eJSON(`GraphQL execution context error: ${e}`)
    }

    // if (!'errors' in result) return eJSON('GraphQL execute error', result.errors)


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

/*

    // Validate Schema
    const schemaValidationErrors = graphql.validateSchema(schema)
    if (schemaValidationErrors.length > 0) {
        errors(500, 'GraphQL validation error', schemaValidationErrors)
    }

    // Parse source to AST, reporting any syntax error
    const documentAST = graphql.parse(query, {noLocation: true})

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

    return {
        code: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        // resStream: new PassThrough().end(Buffer.from(JSON.stringify(result), typeInfo.charset))
        resStream: new PassThrough().end(Buffer.from('{"data":{"ping":' + new Date().getMilliseconds() + '}}', typeInfo.charset))
    }

    // '{"data":{"ping":' + new Date().getMilliseconds() + '}}'

}

 */

/*
validateSchema
parse
Source
getOperationAST
validate
execute

  formatError,
  getOperationAST,
  GraphQLSchema,
  parse,
  print,
  validate,
  validateSchema,
  ValidationRule,

DocumentNode,
ExecutionArgs,
ExecutionResult,
formatError,
FormattedExecutionResult,
getOperationAST,
GraphQLArgs,
GraphQLSchema,
parse,
print,
SubscriptionArgs,
validate,
validateSchema,
ValidationRule,
 */

// https://dgraph.io/docs/graphql/api/requests/

// https://graphql.org/graphql-js/utilities/

// https://github.com/hoangvvo/benzene/blob/main/packages/extra/src/errors.ts
