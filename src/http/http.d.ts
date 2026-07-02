/**
 * 🧩 types for HTTP
 * @module backend/_shared/HTTP
 * @version 0.0.2
 * @date 2026-09-18
 * @lastModified 2026-10-15
 * @license MIT
 * @author Robert Willemelis <github.com/willi84>
 */
export type MOCKED_URL = { [key: string]: string };
export type MOCKED_URLS_TYPE = { [key: string]: MOCKED_URL };
export type MOCKED_RESPONSE = { [key: string]: string };
export type MOCKED_RESPONSES_TYPE = { [key: string]: MOCKED_RESPONSE };

export type $MOCK_VALUE = string | undefined;

type StringLike<T extends string> = string & { __brand?: T }; // avoid collision not working with build-in prototypes of a string (e.g. replace())

export type TLD = `${string}`;
export type SLD = `${string}`;
export type SUBDOMAIN = `${string}`;
export type HOSTNAME = StringLike<`${SUBDOMAIN | ''}${SLD}.${TLD}`>;
export type DOMAIN = `${SLD}.${TLD}`;
export type FQDN = `http${'s' | ''}://${DOMAIN}`; // fully qualified domain name
export type URL = StringLike<`${FQDN | DOMAIN}`>;

export type HTTP_OPTS = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    timeout?: number; // in seconds as string
    ua?: string; // user agent string
    acceptHeader?: string; // additional curl type options
    type?: 'json' | 'html' | 'text' | 'xml';
    token?: string; // auth token
    isDev?: boolean; // development mode
    showLog?: boolean; // whether to show logs or not
};

export type HTTPStatusBase = {
    protocol: string;
    protocolVersion: string;
    status: string;
    statusMessage: string;
    server: string;
    date: string;
    contentType: string;
    // Define other common properties here
    [key: string]: string;
};
export type CurlItem = {
    header: HTTPStatusBase | {};
    content: string;
    status: string;
    success: boolean;
    time?: number; // Optional, for performance measurement
};