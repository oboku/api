import jwt from 'jsonwebtoken'
// import fs from 'fs'
// import { JWT_PRIVATE_KEY_PATH } from '../constants'
// import { APIGatewayProxyEvent } from 'aws-lambda'
import { SSM } from 'aws-sdk'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { createHttpError } from './httpErrors'
// import createHttpError from 'http-errors'

const ssm = new SSM({ region: 'us-east-1' })

const getJwtPrivateKey = () => ssm.getParameter({
  Name: `jwt-private-key`,
  WithDecryption: true
}).promise().then(value => value.Parameter?.Value)

const isAuthorized = async (authorization?: string) => {
  try {
    if (!authorization) throw new Error('Looks like authorization is empty')

    const token = authorization.replace('Bearer ', '')

    const privateKey = await getJwtPrivateKey()

    if (!privateKey) {
      console.error(`Unable to retrieve private key`)
      throw createHttpError(401)
    }

    return jwt.verify(token, privateKey, { algorithms: ['RS256'] }) as Token
  } catch (e) {
    throw createHttpError(401)
  }
}

// export const createAuthenticator = ({ privateKey }: { privateKey: string }) => ({
//   withToken: _withToken(privateKey)
// })

// const authenticator = createAuthenticator({ privateKey: JWT_PRIVATE_KEY })

export type Token = {
  userId: string,
  email: string,
  sub: string,
  '_couchdb.roles'?: string[]
}

export const createRefreshToken = (name: string) => {
  return generateToken(name, '1d')
}

export const generateToken = async (email: string, userId: string) => {
  const tokenData: Token = { email, userId, sub: email, '_couchdb.roles': [email] }

  return jwt.sign(tokenData, await getJwtPrivateKey() ?? ``, { algorithm: 'RS256' })
}

export const generateAdminToken = async () => {
  const data: Token = {
    email: '',
    userId: '',
    sub: 'admin',
    '_couchdb.roles': ['_admin']
  }

  return jwt.sign(data, await getJwtPrivateKey() ?? ``, { algorithm: 'RS256' })
}

export const withToken = async (event: Pick<APIGatewayProxyEvent, `headers`>) => {
  const authorization = event.headers.Authorization as string | undefined || event.headers.authorization as string | undefined

  return await isAuthorized(authorization)
}



// const createRefreshToken = (name: string, authSession: string) => {
//   return generateToken(name, '1d')
// }

// const generateToken = async (email: string, userId: string, expiresIn: string = '1d') => {
//   const tokenData: Token = { email, userId }

//   return jwt.sign(tokenData, JWT_PRIVATE_KEY, { algorithm: 'RS256' })
// }