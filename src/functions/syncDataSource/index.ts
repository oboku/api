import { handlerPath } from '@libs/handler-resolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: 'post',
        path: 'sync-datasource',
        // handle preflight cors
        cors: true,
      },
    },
  ],
};
