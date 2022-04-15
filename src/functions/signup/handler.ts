import { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import schema from './schema';
import { validators, ObokuErrorCode } from '@oboku/shared'
import { auth, createUser, getAdminNano } from '@libs/dbHelpers';
import { generateToken } from '@libs/auth';
import { PromiseReturnType } from '@libs/types';
import { createHttpError } from '@libs/httpErrors';

const lambda: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  if (!await validators.signupSchema.isValid(event.body)) {
    throw createHttpError(400)
  }

  const { email = '', password = '', code = '' } = event.body
  const superAdminSensitiveNanoInstance = await getAdminNano()
  const db = superAdminSensitiveNanoInstance.use('beta')

  let foundEmail = undefined
  try {
    const res = (await db.get(code)) as PromiseReturnType<typeof db.get> & { email?: string }
    foundEmail = res.email
  } catch (e) {
    if ((e as any)?.statusCode !== 404) {
      throw e
    }
  }

  if (foundEmail !== email)
    throw createHttpError(400, { code: ObokuErrorCode.ERROR_INVALID_BETA_CODE })

  try {
    await createUser(superAdminSensitiveNanoInstance, email, password)
  } catch (e) {
    if ((e as any)?.statusCode === 409) {
      throw createHttpError(400, { code: ObokuErrorCode.ERROR_EMAIL_TAKEN })
    }
    throw e
  }

  const authResponse = await auth(email, password)

  if (!authResponse) throw createHttpError(400)

  const userId = Buffer.from(email).toString('hex')
  const token = await generateToken(email, userId)

  return {
    statusCode: 200,
    body: JSON.stringify({
      token,
      userId,
      dbName: `userdb-${userId}`
    })
  }
};

export const main = middyfy(lambda);
