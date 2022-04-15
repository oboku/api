import type { AWS } from '@serverless/typescript';
import covers from '@functions/covers';
import signin from '@functions/signin';
import signup from '@functions/signup';
import requestAccess from '@functions/requestAccess';

const serverlessConfiguration: AWS = {
  service: 'oboku-api',
  frameworkVersion: '3',
  useDotenv: true,
  plugins: ['serverless-bundle'],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
      binaryMediaTypes: [`*/*`]
    },
    // Do this if you want to load env vars into the Serverless environment AND
    // automatically configure all your functions with them.
    // This is usually not recommended to avoid loading secrets by accident (e.g. AWS_SECRET_ACCESS_KEY)
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      COUCH_DB_URL: '${env:COUCH_DB_URL}',
      CONTACT_TO_ADDRESS: '${env:CONTACT_TO_ADDRESS}',
    },
    // iam: {
    //   role: "lambdaDefault"
    // }
  },
  layers: {
    sharp: {
      name: "${sls:stage}-sharp",
      path: `layers/SharpLayer`, // required, path to layer contents on disk
      description: `sharp@0.30.3`,
      package: {
        include: [`node_modules/**`]
      },
    }
  },
  // import the function via paths
  functions: { covers, signin, signup, requestAccess },
  resources: {
    Resources: {
      // @see https://www.serverless.com/framework/docs/providers/aws/guide/iam#custom-iam-roles
      lambdaDefault: {
        Type: `AWS::IAM::Role`,
        Properties: {
          RoleName: "${self:service}-${sls:stage}-${aws:region}-lambda-default",
          // required if you want to use 'serverless deploy --function' later on
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [{ Effect: "Allow", Principal: { Service: [`lambda.amazonaws.com`] }, Action: "sts:AssumeRole" }]
          },
          Policies: [{
            PolicyName: "${self:service}-${sls:stage}-${aws:region}-lambda-default-policy",
            PolicyDocument: {
              Statement: [
                // note that these rights are given in the default policy and are required if you want logs out of your lambda(s)
                {
                  Effect: `Allow`,
                  Action: [
                    `logs:CreateLogGroup`,
                    `logs:CreateLogStream`,
                    `logs:PutLogEvents`,
                  ],
                  Resource: [
                    {
                      "Fn::Join": [
                        ":",
                        [
                          "arn:aws:logs",
                          {
                            "Ref": "AWS::Region"
                          },
                          {
                            "Ref": "AWS::AccountId"
                          },
                          "log-group:/aws/lambda/${self:service}-${sls:stage}*:*:*"
                        ]
                      ]
                    }
                  ],
                },
                // this is needed to read from ssm and retrieve secrets
                {
                  Effect: `Allow`,
                  Action: [
                    `ssm:GetParameter`
                  ],
                  Resource: [
                    {
                      "Fn::Join": [
                        ":",
                        [
                          "arn:aws:ssm",
                          {
                            "Ref": "AWS::Region"
                          },
                          {
                            "Ref": "AWS::AccountId"
                          },
                          "parameter/*"
                        ]
                      ]
                    }
                  ],
                }
              ]
            }
          }]
        }
      }
    }
  },
  package: { individually: true },
  custom: {
    bundle:
    {
      // These are packages that need to be included in the Lambda package (the .zip file that's sent to AWS). 
      // But they are not compatible with Webpack. So they are marked as externals to tell Webpack not bundle them.
      externals: ["knex", "sharp", `aws-sdk`, `aws-lambda`],
      packagerOptions:
      {
        scripts: [`rm -rf node_modules/sharp && SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --arch=x64 --platform=linux sharp`]
      }
    }
  },
};

module.exports = serverlessConfiguration;
