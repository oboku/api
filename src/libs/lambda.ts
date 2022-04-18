import middy from "@middy/core"
import { jsonSafeParse } from "@middy/util"
import middyJsonBodyParser from "@middy/http-json-body-parser"
import httpErrorHandler from '@middy/http-error-handler'
import cors from '@middy/http-cors'
import { Lambda, Endpoint } from "aws-sdk"

export const middyfy = (handler: any) => {
  return middy(handler)
    .use(middyJsonBodyParser())
    .use({
      onError: async request => {
        // we enforce non exposure unless specified
        if (request.error && (request.error as any)?.expose === undefined) {
          (request.error as any).expose = false
        }
        // we force JSON response for any error that is a simple string
        if (request.error && typeof jsonSafeParse(request.error.message) === `string`) {
          request.error.message = JSON.stringify({ message: request.error.message })
        }
      }
    })
    // @todo eventually protect the api and only allow a subset of origins
    .use(cors())
    .use(httpErrorHandler({
      // handle non http error with 500 and generic message
      fallbackMessage: `An error occurred`,
    }))

}

export const getAwsLambda = () => new Lambda({
  region: 'us-east-1',
  // endpoint: 'http://0.0.0.0:4001',
  // endpoint: 'http://host.docker.internal:4001',
  // endpoint: new aws.Endpoint('http://host.docker.internal:4002'),
  // endpoint: new aws.Endpoint('localhost:4001'),
  // hostPrefixEnabled: false,
  // sslEnabled: false,
  httpOptions: {
    // agent: new https.Agent({ rejectUnauthorized: false })
  },
  ...process.env.AWS_SAM_LOCAL && {
    endpoint: new Endpoint('http://host.docker.internal:4002'),
  },
})