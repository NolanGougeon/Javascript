/*
 * Use this script to update translations From:
 * - The React-intl localized message in your app
 * - The keys you have entered in messages.js directly
 * - The work you have done in the local translations folder
 *
 * The latest translations will be saved
 * in both Messages.js and {LOCALE}.js
 *
 * This script will also (re)generate local translations
 * In sub folders so that it remains manageable
 * WARNING: Those folders are only helpers and
 * You should keep them in your .gitignore file
 * So that we keep only one source of truth
 *
 * ARGS:
 * - LOCALE (e.g: en, fr)
 *
 * USAGE: (from project root)
 * - node_modules/.bin/babel-node scripts/generateComponentLocales fr
 *
 */

 /* eslint-disable no-underscore-dangle,no-restricted-syntax,no-console */

import * as fs from 'fs';
import { find,difference } from 'lodash';
import { sync as globSync } from 'glob';
import path from 'path';
import messages from '../src/translations/messages';
import { saveTranslations, saveLocalTranslations,ReplaceTranslations } from './utils';

const WARNINGS = true;

const TRANSLATION_PATTERN = './src/**/components/**/*.jsx';
const LOCALE = process.argv[2] || 'en';

// Gather our existing translations
const archivedTranslations = messages[LOCALE] ?
  messages[LOCALE]
  :
  {};

const getTranslationKeysAndDefaultMessagesFromText = (content, fileName) => {
  const results = [];
  const regx = /<FormattedMessage([\s\S]*?) \/>|formatMessage\(([\s\S]*?)\)/g;

  // for every FormattedMessage extract:
  // - the id
  // - the defaultMessage
  // - fileName

  const matches = content.match(regx);

  if (!matches || !matches.length) {
    // console.log(fileName);
    return results;
  }

  matches.forEach(match => {
    const matchedText = match.replace(/'/g, '"').replace(/: /g, '=');

    const id =
      /id="([\s\S]*?)"/.exec(matchedText)
      || /id='([\s\S]*?)'/.exec(matchedText)
      || /id={`([\s\S]*?)`}/.exec(matchedText);

    const defaultMessage =
      /defaultMessage="([\s\S]+)"/.exec(matchedText)
      || /defaultMessage='([\s\S]+)'/.exec(matchedText)
      || /defaultMessage={([\s\S]*?)}/.exec(matchedText);

    if (id && !/\$/.test(id[1])) {
      results.push({
        id: id[1],
        defaultMessage: defaultMessage[1],
        fileName,
      });
    }
  });
  return results;
};

export const findLocalisedMessages = pattern => globSync(pattern)
  // get all files matching pattern
  .map(fileName => {
    let results = [];

    // remove extra white sapces and extra lines from file content
    const content = fs
      .readFileSync(fileName, 'utf8')
      .replace(/[\n\r]+/g, '').replace(/\s{2,10}/g, ' ');

    // find all FormattedMessage components in the file
    results = getTranslationKeysAndDefaultMessagesFromText(content, fileName);
    return results.length > 0 ? results : null;
  })
  .reduce((allTranslations, fileTranslations) => {
    if (!fileTranslations) { return allTranslations; }
    allTranslations._tmp_ = allTranslations._tmp_ || {};

    fileTranslations.forEach(translation => {
      const { id, fileName } = translation;
      let { defaultMessage } = translation;
      const dirName = path.dirname(fileName);

      if (find(allTranslations, { id })) {
        throw new Error(
          `Duplicate message
            - with id: ${id}
            - and defaultMessage: ${defaultMessage}
            - at path: ${dirName}/${fileName}`
        );
      }

      if (!defaultMessage) {
        throw new Error(
          `No default message for component:
            - with id: ${id}
            - at path: ${dirName}/${fileName}`
        );
      }

      // For every key to be translated
      // We check if it has already be translated
      // in our archived file
      if (archivedTranslations[id]) {
        defaultMessage = archivedTranslations[id];
      } else if (WARNINGS) {
        console.warn(
          `No translation for component:
            - with id: ${id}
            - at path: ${dirName}/${fileName}
          for LOCALE: ${LOCALE}`
        );
      }

      // For every key to be translated
      // We check if it has already be translated
      // in our local translation files
      try {
        let { previousDirName, localTranslation } = allTranslations._tmp_;
        if (!previousDirName || previousDirName !== dirName) {
          // Avoid unnecessary readFileSync
          const candidate = `${dirName}/translations/${LOCALE}.json`;
          fs.accessSync(candidate, fs.F_OK);
          localTranslation = JSON.parse(fs.readFileSync(candidate, 'utf8'));
          previousDirName = dirName;
        }

        for (const key in localTranslation) {
          if (key === id) {
            // local translation has priority - DISABLED
            // if (localTranslation[key]) { defaultMessage = localTranslation[key]; }
            break;
          }
        }
      } catch (e) {
        // The local translation file does not exist, do nothing
      }

      // local translations
      allTranslations._local_ = allTranslations._local_ || {};
      allTranslations._local_[dirName] = allTranslations._local_[dirName] || {};
      allTranslations._local_[dirName][id] = defaultMessage;

      // main translations
      allTranslations[id] = defaultMessage;
    });
    delete allTranslations._tmp_;
    return allTranslations;
  }, {});

const localisedMessages = findLocalisedMessages(TRANSLATION_PATTERN);

// Sort the translations used and unused 
const savedMessages = Object.keys(messages[LOCALE]);
const usedMessages = Object.keys(findLocalisedMessages(TRANSLATION_PATTERN));
const OnlyUnusedMessages = difference(savedMessages, usedMessages);
const OnlyUsedMessages = difference(savedMessages, OnlyUnusedMessages);
const newMessages = {};

for (let i = 0; i < OnlyUsedMessages.length ; i++) {
  newMessages[OnlyUsedMessages[i]] = messages[LOCALE][OnlyUsedMessages[i]];
}

// replace the existing messages.js by an new messages.js which contain only the traductions use in the website.
ReplaceTranslations(LOCALE,newMessages);

// Merge and Leverage messages.js
// Save updated translations for given LOCALE
// saveTranslations(LOCALE, localisedMessages);

// (re)Build Local translation for given LOCALE
// saveLocalTranslations(LOCALE, localisedMessages._local_);

export default findLocalisedMessages;