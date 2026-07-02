export const STANDARD_CURL_TIMEOUT: number = 0.4;
export const CURL_CONFIG_STATUS = `-m ${STANDARD_CURL_TIMEOUT} --silent`;

export const DOUBLE_REGEX =
    /(ac|co|com|edu|gov|gob|gouv|id|lg|ltd|me|mil|net|nhs|nom|or|org|plc|res|school)\.[a-z]{2}/i;