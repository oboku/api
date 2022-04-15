import middy from "@middy/core"
import { jsonSafeParse } from "@middy/util"
import middyJsonBodyParser from "@middy/http-json-body-parser"
import httpErrorHandler from '@middy/http-error-handler'
import cors from '@middy/http-cors'

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
    .use(httpErrorHandler({
      // handle non http error with 500 and generic message
      fallbackMessage: `An error occurred`,
    }))
    // @todo eventually protect the api and only allow a subset of origins
    .use(cors({
      origin: `*`,
      headers: `*`,
      methods: `delete,get,head,options,patch,post,put`
    }))
}