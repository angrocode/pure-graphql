const graphql = code => code // hook graphql tag for webstorm

module.exports.schema = graphql`
    extend type Query {
        hello: String
    }
`

module.exports.resolver = {
    hello: (args, context, info) => {
        return 'Hello world!'
    },
}
