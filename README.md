# Rakka
Pure server graphql. The only dependency graphql-js.

* support for simple application/graphql syntax
  - browser: http//localhost/graphql?{hello, time}
  - curl: curl -X POST "http//localhost/graphql/" -d "{hello, time}"
* support for gzip, deflate, br decoding and encoding
