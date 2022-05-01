import nodeFetch from 'node-fetch'
import { createHttpError } from '@libs/httpErrors';
import { middyfy } from '@libs/lambda';
import { APIGatewayProxyEvent } from 'aws-lambda';

const lambda = async (event: APIGatewayProxyEvent) => {
  const params = event.pathParameters;
  const { Host, host, Origin, origin, ...headers } = event.headers;
  const bodyStr = event.body as string ?? ``

  console.log(event);
  console.log(`Got request with params:`, params);

  if (!params || !params.url) {
    console.error("Unable get url from 'url' query parameter")
    throw createHttpError(400)
  }

  const requestParams = Object.entries(params)
    .reduce((acc: string[], param) => {
      if (param[0] !== 'url') {
        acc.push((param).join('='))
      }
      return acc;
    }, [])
    .join('&');

  const url = `${params.url}${requestParams}`;
  const hasBody = /(POST|PUT)/i.test(event.httpMethod);
  const res = await nodeFetch(url, {
    method: event.httpMethod,
    // timeout: 20000,
    body: hasBody ? bodyStr : undefined,
    headers: headers as any,
  });
  console.log(`Got response from ${url} ---> {statusCode: ${res.status}}`);

  const bodyBuffer = await res.buffer()
  // text did not work before
  // const body = await res.text();
  // const passthroughHeaders = Array
  //   .from(res.headers.keys())
  //   .reduce((acc, key) => ({
  //     ...acc,
  //     [key]: res.headers.get(key)
  //   }), {})

  // console.log(`headers to pass through`, passthroughHeaders)

  // console.log(`Final headers`, {
  //   ...passthroughHeaders,
  //   'Access-Control-Allow-Origin': '*', // Required for CORS support to work
  //   'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
  // })

  return {
    statusCode: res.status,
    headers: {
      // ...passthroughHeaders,
      'content-type': res.headers.get('content-type') || ``,
      // 'content-length': res.headers.get('content-length') || ``,
      'Content-Length': bodyBuffer.byteLength,
      'Access-Control-Allow-Origin': '*', // Required for CORS support to work
      'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    },
    body: bodyBuffer.toString('base64'),
    isBase64Encoded: true
  };
};

export const main = middyfy(lambda);

