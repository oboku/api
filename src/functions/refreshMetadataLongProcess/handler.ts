import { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import fs from 'fs'
import path from 'path'
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TMP_DIR } from '../../constants';
import { withToken } from '@libs/auth';
import { configure as configureGoogleDataSource } from '@libs/dataSources/google'
import schema from './schema';
import { atomicUpdate, findOne, getNanoDbForUser } from '@libs/dbHelpers';
import { PromiseReturnType } from '@libs/types';
import { retrieveMetadataAndSaveCover } from '@libs/books/retrieveMetadataAndSaveCover';
import { getNormalizedHeader } from '@libs/utils';

const lambda: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  configureGoogleDataSource({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET
  })

  const files = await fs.promises.readdir(TMP_DIR)

  await Promise.all(files.map(file => {
    return fs.promises.unlink(path.join(TMP_DIR, file));
  }))

  const { userId, email } = await withToken(event)

  const bookId: string | undefined = event.body.bookId

  if (!bookId) {
    throw new Error(`Unable to parse event.body -> ${event.body}`)
  }

  const db = await getNanoDbForUser(email)

  const book = await findOne(db, 'book', { selector: { _id: bookId } })
  if (!book) throw new Error(`Unable to find book ${bookId}`)

  if (book.metadataUpdateStatus !== 'fetching') {
    await atomicUpdate(db, 'book', book._id, old => ({
      ...old,
      metadataUpdateStatus: 'fetching' as const,
    }))
  }

  const firstLinkId = (book.links || [])[0] || '-1'

  const link = await findOne(db, 'link', { selector: { _id: firstLinkId } })

  if (!link) throw new Error(`Unable to find link ${firstLinkId}`)

  let data: PromiseReturnType<typeof retrieveMetadataAndSaveCover>
  try {
    data = await retrieveMetadataAndSaveCover({
      userId,
      userEmail: email,
      credentials: JSON.parse(getNormalizedHeader(event, 'oboku-credentials') || '{}'),
      book,
      link
    })
  } catch (e) {
    await atomicUpdate(db, 'book', book._id, old => ({
      ...old,
      metadataUpdateStatus: null,
      lastMetadataUpdateError: 'unknown',
    }))
    throw e
  }

  await atomicUpdate(db, 'book', book._id, old => ({
    ...old,
    title: data.book?.title || old.title,
    creator: data.book?.creator || old.creator,
    date: data.book?.date || old.date,
    publisher: data.book?.publisher || old.publisher,
    subject: data.book?.subject || old.subject,
    lang: data.book?.lang || old.lang,
    lastMetadataUpdatedAt: new Date().getTime(),
    metadataUpdateStatus: null,
    lastMetadataUpdateError: null,
  }))
  await atomicUpdate(db, 'link', link._id, old => ({ ...old, contentLength: data.link.contentLength }))

  return {
    statusCode: 200,
    body: JSON.stringify({}),
  }
};

export const main = middyfy(lambda);
