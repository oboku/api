import { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { getAwsLambda, middyfy } from '@libs/lambda';
import { STAGE } from 'src/constants';

const lambda: ValidatedEventAPIGatewayProxyEvent = async (event) => {
  await getAwsLambda().invoke({
    InvocationType: 'Event',
    FunctionName: `oboku-api-${STAGE}-refreshMetadataLongProcess`,
    ...process.env.AWS_SAM_LOCAL && {
      InvocationType: 'RequestResponse',
      FunctionName: 'refreshMetadataLongProcess',
    },
    Payload: JSON.stringify(event),
  }).promise()

  return {
    statusCode: 202,
    body: JSON.stringify({}),
  }
};

export const main = middyfy(lambda);
