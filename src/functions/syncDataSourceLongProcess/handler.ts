import { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { AWS_API_URI } from 'src/constants';
import { configure as configureGoogleDataSource } from '@libs/dataSources/google'
import { S3 } from 'aws-sdk'
import { withToken } from '@libs/auth';
import schema from './schema';
import { createHttpError } from '@libs/httpErrors';
import { getNormalizedHeader } from '@libs/utils';
import { dataSourceFacade } from '@libs/dataSources';
import { getNanoDbForUser } from '@libs/dbHelpers';
import axios from "axios"
import { getParameterValue } from '@libs/ssm';

const s3 = new S3()

const lambda: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  configureGoogleDataSource({
    client_id: await getParameterValue({ Name: `GOOGLE_CLIENT_ID` }) ?? ``,
    client_secret: await getParameterValue({ Name: `GOOGLE_CLIENT_SECRET` }) ?? ``,
  })

  const { email } = await withToken(event)
  const { dataSourceId } = event.body

  if (!dataSourceId) {
    throw createHttpError(400)
  }

  const credentials = JSON.parse(getNormalizedHeader(event, 'oboku-credentials') || '{}')
  const authorization = getNormalizedHeader(event, 'authorization') || ``

  const refreshBookMetadata = ({ bookId }: { bookId: string }) =>
    axios({
      method: `post`,
      url: `${AWS_API_URI}/refresh-metadata`,
      data: {
        bookId
      },
      headers: {
        "content-type": "application/json",
        "accept": "application/json",
        'oboku-credentials': JSON.stringify(credentials),
        'authorization': authorization
      }
    })

  const isBookCoverExist = async ({ coverId }: { coverId: string }) => {
    try {
      await s3
        .headObject({ Bucket: 'oboku-covers', Key: `cover-${coverId}` }).promise()
      return true
    } catch (e) {
      if ((e as any).code === 'NotFound') return false
      throw e
    }
  }

  await dataSourceFacade.sync({
    dataSourceId,
    db: await getNanoDbForUser(email),
    refreshBookMetadata,
    isBookCoverExist,
    userEmail: email,
    credentials
  })

  return {
    statusCode: 200,
    body: JSON.stringify({}),
  }
};

export const main = middyfy(lambda);
