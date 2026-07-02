import type { KEY_VALUE } from '../index.d';

/**
 * 🎯 convert the number to a string
 * @param {number} value ➡️ The number to convert.
 * @returns {string} 📤 The formatted number as a string with dots if needed.
 */
export const convertNumber2String = (value: number): string => {
    return value.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
};

/**
 * 🎯 Splits a line into a key and value based on the first occurrence of either
 * a colon or space.
 * @todo stabilize more the content for spaces/newlines
 * @param {string} line ➡️ The line to split.
 * @returns {object} 📤 An object containing the key and value.
 */
export const convert2KeyValue = (line: string): KEY_VALUE => {
    const matchesColon = line.match(/^([^\s]+)\:\s(.*)/); // KEY: value
    const matchesSpace = line.match(/^([^\s]+)\s(.*)/); // KEY value
    let key = '';
    let value = '';
    if (matchesColon && matchesColon[2]) {
        key = matchesColon[1];
        value = matchesColon[2];
    } else if (matchesSpace && matchesSpace[2]) {
        key = matchesSpace[1];
        value = matchesSpace[2];
    }
    return {
        key,
        value,
    };
};

/**
 * 🎯 transform a key to camelCase
 * @param {string} key ➡️ The key to transform.
 * @returns {string} 📤 The transformed key in camelCase.
 */
export const convertKey2CamelCase = (key: string): string => {
    let newKey = key.toLowerCase().trim();
    if (newKey.indexOf('-') !== -1) {
        const parts = newKey.split('-');
        let finalKey = '';
        parts.forEach((part: string, index: number) => {
            if (index === 0) {
                finalKey = part;
            } else {
                finalKey += part.charAt(0).toUpperCase() + part.slice(1);
            }
        });
        newKey = finalKey;
    }
    return newKey;
};