const fs = require('fs');
const path = require('path');
const klaw = require('klaw');
const { exec } = require('child_process');

const getText = (regexObject) => Array.from(regexObject, (m) => m[0]);

const getSectioniseRegex = (paperType, year) => {
  let separator;
  let cleaner;
  switch (paperType) {
    case 'ms':
    // Apply to each regex result from first separator
      cleaner = /(?:\nPage \d+ Mark Scheme:? (?:(?!© (?:University of )?(?:UCLES|Cambridge International Examinations) 20\d{2})(?:.|[\n\r]))+© (?:University of )?(?:UCLES|Cambridge International Examinations) 20\d{2}|\n0470\/1[1-3](?:(?!Marks?(?! Scheme))(?:.|[\n\r]))+Marks?)/g;
      /*
    * \d{0,2}.*\([a-c]\) Match question numbers and letters with arbitrary whitespace, eg: 1.   (a)
    * (?!(?:recall\s*,|Page \d+ Mark Scheme|\([a-c]\))) Assert matches cannot have recall,|Page {num}Mark Scheme|([a-c])
    * (?:.|[\n\r]) Otherwise regex can have arbitrary characters and line breaks
    * (?: ... )* Apply for all text
    */
      separator = /\d{0,2}[ \t]*\([a-c]\)(?:(?!(?:recall\s*,|\d{0,2}[ \t]*\([a-c]\)))(?:.|[\n\r]))*/g;
      break;
    case 'qp':
      cleaner = /(?:Copyright\s+Acknowledgements|Permission\s+to\s+reproduce)(?:.|[\n\r])*/g;
      /*
       * \d{0,2}[ \t]*Study the : Match question instructions and extract introduction.
       * (?!(?:\d{0,2}[ \t]*Study the |0470|(?:\n[ \t]*){2})) Assert matches cannot contain new question set | footer for page break | double line break
       * (?:.|[\n\r]) Otherwise regex can have arbitrary characters and line breaks
       * (?: ... )* Apply for all text
       */
      if (year < 2015) {
        separator = /\n\d{1,2}[ \t]*(?:Study the |Look at the|Read the extract|Read the poem)(?:(?!(?:\n\d{1,2}[ \t]*(?:Study the |Look at the|Read the extract|Read the poem)|0470|(?:(?!(?:\n[ \t]*){2}\s*\([a-c]\)|\s+Verwoerd speaking to the people of South Africa|\s+ Content removed due to copyright restrictions.|\s+\/\s+millions\s+1\s+0\s+1928|\s+millions\s+1\s+0\s+1928)(?:\n[ \t]*){2})))(?:.|[\n\r]))*/g;
      } else if (year >= 2015 && year <= 2019) {
        separator = /\n\d{1,2} (?:(?!(?:\n\d{1,2} |(?:\n[ \t]*){2}))(?:.|[\n\r]))*/g;
      } else {
        throw new Error(
          `Year ${year} not within valid year range of 2010-2019`,
        );
      }
      break;
    default:
      throw new Error('Paper Type is not qp or ms.');
  }
  return [separator, cleaner];
};

const removeEmptyQuestionContent = (question) => question.match(/^\s*\([a-c]\)\s*$/g) === null;

const fixDuplicatedMarkSchemes = (captures) => captures
  .map((ans, i, arr) => {
    // Question numbers have different trailing whitespace lengths
    const arbitraryWhitespaceRegex = /\s*\n/g;
    if (
      arr[i + 1] // If next & curr elem have same question number & letter, combine them
        && ans.split(arbitraryWhitespaceRegex)[0]
          === arr[i + 1].split(arbitraryWhitespaceRegex)[0]
    ) {
      return (
        `${ans
        }\n${
          arr[i + 1]
            .split('\n')
            .slice(1)
            .join('')}`
      );
    } if (
      i
        && ans.split(arbitraryWhitespaceRegex)[0]
          === arr[i - 1].split(arbitraryWhitespaceRegex)[0]
    ) {
      return ''; // Only true if prev if statement executed on prev elem, delete secod duplicate
    } return ans;
  }) // Remove empty string elem from combining duplicates
  .filter((elem) => elem !== '');

const sectioniseText = (text, paperType, year = 2019) => {
  const [separatorRegex, cleanerRegex] = getSectioniseRegex(paperType, year);
  const captures = getText(text.matchAll(separatorRegex));
  const cleanedCaptures = captures
    .map((text) => text.replace(cleanerRegex, ' ').trim())
    .filter(removeEmptyQuestionContent);
  switch (paperType) {
    case 'ms':
    // After 2017, (c) mark schemes spanning multiple page have duplicate questions number & letters
      if (year >= 2017) return fixDuplicatedMarkSchemes(cleanedCaptures);
      return cleanedCaptures;
    case 'qp':
      return cleanedCaptures;
    default:
      throw new Error('Paper Type is not qp or ms.');
  }
};

const callback = (path, [paperType, year], writeDir) => {
  fs.readFile(path, 'utf8', (err, text) => {
    if (err) console.error(err);
    console.log(path);
    const sectionised = sectioniseText(text, paperType, 2000 + Number(year));
    new Promise((resolve) => {
      exec(`mkdir -p ${writeDir}`, {}, () => resolve());
    }).then(() =>
      // Have all async save file ops run currently
      sectionised.forEach((section, questionNum) => {
        fs.writeFile(`${writeDir}/${questionNum + 1}.txt`, section, (err) => {
          if (err) console.error(err);
        });
      }));
  });
};

const filter = (item) => {
  const basename = path.basename(item);
  return (basename === '.' || basename[0] !== '.') && basename;
};

const rootDir = path.join(__dirname, '../assets/pdf');
klaw(rootDir, { filter })
  .on('data', ({ path }) => {
    const subfolderNames = path
      .split(rootDir)
      .slice(1)
      .join('')
      .split('/')
      .slice(1);

    if (
      // Last elem of split array of path must be text
      subfolderNames.length === 4
      && subfolderNames[subfolderNames.length - 1].includes('.txt')
    ) {
      const textWriteDir = path
        .split('.txt')
        .slice(0)
        .join('');
      callback(path, subfolderNames, textWriteDir);
    }
  })
  .on('error', (err, { path }) => console.error(`At ${path}: ${err}`))
  .on('end', () => console.log('Klaw done'));
