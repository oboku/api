// DO NOT STORE ANY SECRETS HERE
export const COUCH_DB_URL = process.env.COUCH_DB_URL ?? `__COUCH_DB_URL__`
export const CONTACT_TO_ADDRESS = process.env.CONTACT_TO_ADDRESS ?? `__CONTACT_TO_ADDRESS__`
export const STAGE = process.env.STAGE ?? `dev`

export const AWS_API_URI = process.env.AWS_API_URI ?? `__AWS_API_URI__` // @todo secret
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? `__GOOGLE_CLIENT_ID__` // @todo secret
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? `__GOOGLE_CLIENT_SECRET__` // @todo secret
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? `__GOOGLE_API_KEY__` // @todo secret
export const GOOGLE_BOOK_API_URL = process.env.GOOGLE_BOOK_API_URL ?? `__GOOGLE_BOOK_API_URL__` // @todo secret

// env unrelated to environment
export const TMP_DIR = '/tmp'
export const METADATA_EXTRACTOR_SUPPORTED_EXTENSIONS = ['application/x-cbz', 'application/epub+zip', 'application/zip']
export const COVER_MAXIMUM_SIZE_FOR_STORAGE = { width: 400, height: 600 }