
const fs = require('fs')
const { GraphQLScalarType } = require('graphql')

const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.js') & f !== 'index.js')

let schema = `
    scalar Date

    type Query {
        time: Date
    }
    type Mutation {
        time: Date
    }
`

let resolver = {
    Date: new GraphQLScalarType({
        name: 'Date',
        serialize: v => new Date(v),
        parseValue: v => new Date(v),
        parseLiteral: ast => new Date(parseInt(ast.value, 10))
    }),
    time: () => new Date(),
}

files.forEach(f => {
    /* eslint-disable node/global-require */
    /* eslint-disable import/no-dynamic-require */
    /* eslint-disable node/no-path-concat */
    schema += require(`${__dirname}/${f}`).schema
    resolver = {...resolver, ...require(`${__dirname}/${f}`).resolver}
})

module.exports = {
    schema,
    resolver
}
