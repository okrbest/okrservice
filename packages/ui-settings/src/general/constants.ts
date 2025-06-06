import { __ } from 'coreui/utils';

export const LANGUAGES = [
  { label: 'Albanian', value: 'sq' },
  { label: 'Arabic', value: 'ar' },
  { label: 'Bengali', value: 'bn' },
  { label: 'Bulgarian', value: 'bg' },
  { label: 'Chinese', value: 'zh_CN' },
  { label: 'Czech', value: 'cs' },
  { label: 'Dutch', value: 'nl' },
  { label: 'English', value: 'en' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Indonesian', value: 'id_ID' },
  { label: 'Italian', value: 'it' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Javanese', value: 'jv' },
  { label: 'Kazakh', value: 'kk' },
  { label: 'Korean', value: 'ko' },
  { label: 'Marathi', value: 'mr' },
  { label: 'Mongolian', value: 'mn' },
  { label: 'Persian', value: 'fa_IR' },
  { label: 'Polish', value: 'pl_PL' },
  { label: 'Portuguese', value: 'pt_BR' },
  { label: 'Punjabi', value: 'pa' },
  { label: 'Romanian', value: 'ro' },
  { label: 'Russian', value: 'ru' },
  { label: 'Serbian', value: 'en_RS' },
  { label: 'Spanish', value: 'es' },
  { label: 'Tamil', value: 'ta' },
  { label: 'Telugu', value: 'te' },
  { label: 'Turkish', value: 'tr_TR' },
  { label: 'Ukrainian', value: 'uk_UA' },
  { label: 'Urdu', value: 'ur_PK' },
  { label: 'Vietnamese', value: 'vi' },
  { label: 'Yiddish', value: 'yi' }
];

export const SERVICE_TYPES = [
  { label: __('Local'), value: 'local' },
  { label: __('Amazon Web Service'), value: 'AWS' },
  { label: __('Google Cloud Service'), value: 'GCS' },
  { label: __('Cloudflare'), value: 'CLOUDFLARE' },
  { label: __('Azure Storage'), value: 'AZURE' }
];

export const FILE_SYSTEM_TYPES = [
  { label: __('Public'), value: 'true' },
  { label: __('Private'), value: 'false' }
];

export const DATA_RETENTION_DURATION = [
  { label: `3 ${__('months')}`, value: 3 },
  { label: `4 ${__('months')}`, value: 4 },
  { label: `5 ${__('months')}`, value: 5 },
  { label: `6 ${__('months')}`, value: 6 },
  { label: `9 ${__('months')}`, value: 9 },
  { label: `12 ${__('months')}`, value: 12 }
];

export const LOG_RETENTION_DURATION = [
  { label: `1 ${__('months')}`, value: 1 },
  { label: `2 ${__('months')}`, value: 2 },
  { label: `3 ${__('months')}`, value: 3 },
  { label: `4 ${__('months')}`, value: 4 },
  { label: `5 ${__('months')}`, value: 5 },
  { label: `6 ${__('months')}`, value: 6 },
  { label: `9 ${__('months')}`, value: 9 },
  { label: `12 ${__('months')}`, value: 12 }
];

export const KEY_LABELS = {
  UPLOAD_FILE_TYPES: 'Upload File Types',
  WIDGETS_UPLOAD_FILE_TYPES: 'Upload File Types of Widget',
  UPLOAD_SERVICE_TYPE: 'Upload Service Type',
  FILE_SYSTEM_PUBLIC: 'Bucket file system type',
  CLOUDFLARE_ACCESS_KEY_ID: 'Cloudflare Access Key id',
  CLOUDFLARE_SECRET_ACCESS_KEY: 'Cloudflare Secret Access Key',
  CLOUDFLARE_BUCKET_NAME: 'Cloudflare R2 Bucket Name',
  CLOUDFLARE_ACCOUNT_ID: 'Cloudflare Account id',
  CLOUDFLARE_API_TOKEN: 'Cloudflare API Token',
  CLOUDFLARE_USE_CDN: 'Use Cloudflare Images and Stream',
  CLOUDFLARE_ACCOUNT_HASH: 'Cloudflare Account Hash',
  AWS_ACCESS_KEY_ID: 'AWS Access Key Id',
  AWS_SECRET_ACCESS_KEY: 'AWS Secret Access Key',
  AWS_BUCKET: 'AWS Bucket',
  AWS_PREFIX: 'AWS Prefix',
  AWS_COMPATIBLE_SERVICE_ENDPOINT: 'AWS Compatible Service Endpoint',
  AWS_FORCE_PATH_STYLE: 'AWS Force Path Style',
  AWS_SES_ACCESS_KEY_ID: 'AWS SES Access Key id',
  AWS_SES_SECRET_ACCESS_KEY: 'AWS SES Secret Access Key',
  AWS_REGION: 'AWS Region',
  AWS_SES_CONFIG_SET: 'AWS SES Config Set',
  COMPANY_EMAIL_FROM: 'From Email',
  DEFAULT_EMAIL_SERVICE: 'Default Email Service',
  MAIL_SERVICE: 'Mail Service Name',
  MAIL_PORT: 'Port',
  MAIL_USER: 'Username',
  MAIL_PASS: 'Password',
  MAIL_HOST: 'Host',
  TWITTER_CONSUMER_KEY: 'Twitter Consumer Key',
  TWITTER_CONSUMER_SECRET: 'Twitter Consumer secret',
  TWITTER_ACCESS_TOKEN: 'Twitter Access Token',
  TWITTER_ACCESS_TOKEN_SECRET: 'Twitter Access Token Secret',
  TWITTER_WEBHOOK_ENV: 'Twitter Webhook Env',
  NYLAS_CLIENT_ID: 'Nylas Client Id',
  NYLAS_CLIENT_SECRET: 'Nylas Client Secret',
  NYLAS_WEBHOOK_CALLBACK_URL: 'Nylas Webhook Callback Url',
  MICROSOFT_CLIENT_ID: 'Microsoft Client Id',
  MICROSOFT_CLIENT_SECRET: 'Microsoft Client Secret',
  ENCRYPTION_KEY: 'Encryption Key',
  ALGORITHM: 'Algorithm',
  USE_NATIVE_GMAIL: 'Use Default Gmail Service',
  GOOGLE_PROJECT_ID: 'Google Project Id',
  GOOGLE_GMAIL_TOPIC: 'Google Gmail Topic',
  GOOGLE_APPLICATION_CREDENTIALS: 'Google Application Credentials',
  GOOGLE_APPLICATION_CREDENTIALS_JSON: 'Google Application Credentials JSON',
  GOOGLE_GMAIL_SUBSCRIPTION_NAME: 'Google Gmail Subscription Name',
  GOOGLE_CLIENT_ID: 'Google Client Id',
  GOOGLE_CLIENT_SECRET: 'Google Client Secret',
  GOOGLE_MAP_API_KEY: 'Google Map Api Key',

  DAILY_API_KEY: 'Daily api key',
  DAILY_END_POINT: 'Daily end point',
  VIDEO_CALL_TIME_DELAY_BETWEEN_REQUESTS:
    'Time delay (seconds) between requests',
  VIDEO_CALL_MESSAGE_FOR_TIME_DELAY: 'Message for time delay',

  SMOOCH_APP_KEY_ID: 'Smooch App Key Id',
  SMOOCH_APP_KEY_SECRET: 'Smooch App Key Secret',
  SMOOCH_APP_ID: 'Smooch App Id',
  SMOOCH_WEBHOOK_CALLBACK_URL: 'Smooch Webhook Callback Url',

  CHAT_API_UID: 'Chat-API API key',
  CHAT_API_WEBHOOK_CALLBACK_URL: 'Chat-API Webhook Callback Url',

  TELNYX_API_KEY: 'Telnyx API key',
  TELNYX_PHONE: 'Telnyx phone number',
  TELNYX_PROFILE_ID: 'Telnyx messaging profile id',

  sex_choices: 'Pronoun choices',
  company_industry_types: 'Company industry types',
  social_links: 'Social links',

  THEME_LOGO: 'Logo',
  THEME_MOTTO: 'Motto',
  THEME_LOGIN_PAGE_DESCRIPTION: 'Login page description',
  THEME_FAVICON: 'Favicon',
  THEME_TEXT_COLOR: 'Text color',
  THEME_BACKGROUND: 'Background',

  NOTIFICATION_DATA_RETENTION: 'Notification data retention',
  LOG_DATA_RETENTION: 'Log data retention',

  MESSAGE_PRO_API_KEY: 'MessagePro api key',
  MESSAGE_PRO_PHONE_NUMBER: 'MessagePro phone number'
};

export const FILE_MIME_TYPES = [
  // images
  {
    value: 'image/gif',
    label: 'Graphics Interchange Format',
    extension: '.gif'
  },
  {
    value: 'image/vnd.microsoft.icon',
    label: 'Icon format',
    extension: '.ico'
  },
  {
    value: 'image/tiff',
    label: 'Tagged Image File Format',
    extension: '.tif'
  },
  {
    value: 'image/jpeg',
    label: 'JPEG image',
    extension: '.jpeg'
  },
  {
    value: 'image/bmp',
    label: 'Windows OS/2 Bitmap Graphics',
    extension: '.bmp'
  },
  {
    value: 'image/png',
    label: 'Portable Network Graphics',
    extension: '.png'
  },
  {
    value: 'image/svg+xml',
    label: 'Scalable Vector Graphics',
    extension: '.svg'
  },
  {
    value: 'image/webp',
    label: 'WEBP image',
    extension: '.webp'
  },
  {
    value: 'image/heic',
    label: 'High Efficiency Image Coding',
    extension: '.heic'
  },
  {
    value: 'image/heif',
    label: 'High Efficiency Image Format',
    extension: '.heif'
  },
  // documents
  {
    value: 'text/csv',
    label: 'Comma-separated values',
    extension: '.csv'
  },
  {
    value: 'application/msword',
    label: 'Microsoft Word',
    extension: '.doc'
  },
  {
    value:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Microsoft Word (OpenXML)',
    extension: '.docx'
  },
  {
    value: 'application/vnd.ms-excel',
    label: 'Microsoft Excel',
    extension: '.xls'
  },
  {
    value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    label: 'Microsoft Excel OpenXML',
    extension: '.xlsx'
  },
  {
    value: 'application/vnd.ms-powerpoint',
    label: 'Microsoft PowerPoint',
    extension: '.ppt'
  },
  {
    value:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    label: 'Microsoft PowerPoint (OpenXML)',
    extension: '.pptx'
  },
  {
    value: 'application/vnd.oasis.opendocument.presentation',
    label: 'OpenDocument presentation document',
    extension: '.odp'
  },
  {
    value: 'application/vnd.oasis.opendocument.spreadsheet',
    label: 'OpenDocument spreadsheet document',
    extension: '.ods'
  },
  {
    value: 'application/vnd.oasis.opendocument.text',
    label: 'OpenDocument text document',
    extension: '.odt'
  },
  {
    value: 'application/pdf',
    label: 'Adobe Portable Document Format',
    extension: '.pdf'
  },
  {
    value: 'application/rtf',
    label: 'Rich Text Format',
    extension: '.rtf'
  },
  {
    value: 'text/plain',
    label: 'Plain text',
    extension: '.txt'
  },
  {
    value: 'application/haansoft-hwp',
    label: 'Hanword Document (HWP)',
    extension: '.hwp'
  },
  {
    value: 'application/haansoft-hwpml',
    label: 'Hanword Document (HWPX)',
    extension: '.hwpx'
  },
  // media
  {
    value: 'audio/aac',
    label: 'AAC audio',
    extension: '.aac'
  },
  {
    value: 'audio/mpeg',
    label: 'MP3 audio',
    extension: '.mp3'
  },
  {
    value: 'audio/ogg',
    label: 'OGG audio',
    extension: '.oga'
  },
  {
    value: 'audio/3gpp',
    label: '3GPP audio/video container',
    extension: '.3gpp'
  },
  {
    value: 'audio/3gpp2',
    label: '3GPP audio/video container',
    extension: '.3gpp2'
  },
  {
    value: 'video/mpeg',
    label: 'MPEG video',
    extension: '.mpeg'
  },
  {
    value: 'video/ogg',
    label: 'OGG video',
    extension: '.ogv'
  },
  {
    value: 'video/mp4',
    label: 'MP4 video',
    extension: '.mp4'
  },
  {
    value: 'video/webm',
    label: 'WebM video',
    extension: '.webm'
  },
  {
    value: 'audio/wav',
    label: 'WAV audio',
    extension: '.wav'
  },
  {
    value: 'audio/vnd.wave',
    label: 'WAV vnd audio',
    extension: '.wav'
  },
  {
    value: 'audio/m4a',
    label: 'MPEG-4 Audio',
    extension: '.m4a'
  },
  // archives
  {
    value: 'application/vnd.rar',
    label: 'RAR archive',
    extension: '.rar'
  },
  {
    value: 'application/x-tar',
    label: 'Tape archive',
    extension: '.tar'
  },
  {
    value: 'application/x-7z-compressed',
    label: '7-zip archive',
    extension: '.7z'
  },
  {
    value: 'application/gzip',
    label: 'GZip Compressed Archive',
    extension: '.gz'
  }
];
