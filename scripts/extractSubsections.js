/* eslint-disable no-console */
const fs = require('fs');
const sysPath = require('path');
const klaw = require('klaw');
const { exec } = require('child_process');

const rootDir = sysPath.join(__dirname, '../assets/pdf');

const getSubsectioniseRegex = (paperType, year, season, timeZone, questionIndex) => {
  let separator;
  switch (paperType) {
    case 'ms':
    /*
    * ^[\s\d]* : Arbitrary whitespace and digits at start
    * (\([a-c]\)) : Capture question letter only - question number can be deduced by index
    * ((?:(?!\s*Level)(?:.|[\n\r]))*) : Capture everything until "Level x" - question statement
    * \s*Level\s+[0-5]\s+(?:(?!e\.g\.)(?:.|[\n\r]))*e\.g\. : Match & ignore from "Level x" to "e.g."
    * ((?:(?!\s*Level)(?:.|[\n\r]))*) : Capture everything until next "Level x"
    * (?:\s*Level\s+[0-5]\s+)?(?:.|[\n\r])*$ : Match & ignore after fourth "Level x" till end
    * Repeat capturing (steps 3 & 4) for 2-3 times
    */
      if (year < 2017) separator = /^[\s\d]*\(([a-c])\)((?:(?!\s*Level\s+)(?:.|[\n\r]))*)\s*Level\s+[0-5]\s*(?:(?!e\.g\.)(?:.|[\n\r]))*e\.g\.((?:(?!\s*Level\s+)(?:.|[\n\r]))*)\s*Level\s+[0-5]\s*(?:(?!e\.g\.)(?:.|[\n\r]))*(?:e\.g\.((?:(?!\s*Level\s+)(?:.|[\n\r]))*)(?:\s*Level\s+[0-5]\s*(?:(?!e\.g\.)(?:.|[\n\r]))*e\.g\.)?((?:(?!\s*Level\s+)(?:.|[\n\r]))*))?(?:\s*Level\s+[0-5]\s*)?(?:.|[\n\r])*$/g;
      // 2017 spring MS shows marks awarded to each level at end, not at start like rest after 2017
      else if (year === 2017 && season === 's') separator = /^[\s\d]*\(([a-c])\)((?:(?![1-9](?:-[1-9])?\s*Level)(?:.|[\n\r]))*)[1-9–-\s]+Level\s*[0-5]\s+(?:(?!e\.g\.)(?:.|[\n\r]))*e\.g\.((?:(?![1-9](?:[–-][1-9])?\s*Level)(?:.|[\n\r]))*)(?:[1-9–-\s]+Level\s+[0-5]\s+(?:(?!e\.g\.)(?:.|[\n\r]))*e\.g\.((?:(?![1-9](?:[–-][1-9])?\s*Level)(?:.|[\n\r]))*))?(?:[1-9–-\s]+Level\s+[0-5]\s+(?:(?!e\.g\.)(?:.|[\n\r]))*e\.g\.((?:(?![1-9](?:[–-][1-9])?\s*Level)(?:.|[\n\r]))*))?(?:[1-9–-\s]+Level\s+[0-5]\s+)?(?:.|[\n\r])*$/g;
      // This exact subquestion mark scheme has no "e.g." separator, must build special regex
      else if (year === 2018 && season === 'w' && timeZone === '3' && questionIndex === '13') separator = /^[\s\d]*\(([a-c])\)((?:(?!\s*Level\s+)(?:.|[\n\r]))*)\s*Level\s+[0-5]\s*(?:(?!‘Hungary)(?:.|[\n\r]))*((?:(?!\s*Level\s+)(?:.|[\n\r]))*)\s*Level\s+[0-5]\s*(?:(?!e\.g\.)(?:.|[\n\r]))*(?:.|[\n\r])*$/g;
      else separator = /^[\s\d]*\(([a-c])\)((?:(?!\d{0,2}\s*Level)(?:.|[\n\r]))*)\d{0,2}\s*Level\s*[0-5]\s+(?:(?!e\.g\.)(?:.|[\n\r]))*e\.g\.((?:(?!\s*Level)(?:.|[\n\r]))*)(?:\s*Level\s+[0-5]\s+(?:(?!e\.g\.)(?:.|[\n\r]))*e\.g\.((?:(?!\s*Level)(?:.|[\n\r]))*))?(?:\s*Level\s+[0-5]\s+(?:(?!e\.g\.)(?:.|[\n\r]))*e\.g\.((?:(?!\s*Level)(?:.|[\n\r]))*))?(?:\s*Level\s+[0-5]\s+)?(?:.|[\n\r])*$/g;
      break;
    case 'qp':
    /*
    * ^\s*(\d{1,2}) : Start of text & question number
    * ((?:(?!(?:\s*\([a-c]\)))(?:.|[\n\r]))*) : Captures until it reaches a new part ([a-c])
    * \s*\([a-c]\)\s*((?:(?!(?:\s*\([a-c]\)))(?:.|[\n\r]))*):
    *  Repeated 3 times to capture letter and everything after until another letter
    */
      separator = /^\s*(\d{1,2}) ((?:(?!(?:\s*\([a-c]\)))(?:.|[\n\r]))*)\s*\([a-c]\)\s*((?:(?!(?:\s*\([a-c]\)))(?:.|[\n\r]))*)\s*\([a-c]\)\s*((?:(?!(?:\s*\([a-c]\)))(?:.|[\n\r]))*)\s*\([a-c]\)\s*((?:(?!(?:\s*\([a-c]\)))(?:.|[\n\r]))*)\s*$/g;
      break;
    default:
      throw new Error('Paper Type is not qp or ms.');
  }
  // Replace keywords or whitespaces with single space or leading or trailing numbers
  const cleaner = /\s{2,}|OR|e\.g\.|\n+|\r+|\t+|[0-9]-\s*$|^\s*[0-9]-|^\s*[0-9]{1,2}.+(?!$)|(?!^).+[0-9]{1,2}\s*$/g;

  return [separator, cleaner];
};

const sectioniseText = (text, paperType, year = 2019, season = 'w', timeZone = 1, qIndex = 1) => {
  const regexes = getSubsectioniseRegex(paperType, year, season, timeZone, qIndex);
  let captures;
  const [separatorRegex, cleanerRegex] = regexes;

  // eslint-disable-next-line no-useless-catch
  try {
    captures = [...text.matchAll(separatorRegex)][0].slice(1);
  } catch (e) {
    // console.log(captures);
    // console.log(paperType + year + season + timeZone + qIndex);
    throw e;
  }
  // console.log(`Captures at sectioniseText: ${captures}`)
  const cleanedCaptures = captures
    .map((answer) => (answer ? answer.replace(cleanerRegex, ' ').trim() : null));
  return cleanedCaptures;
};

const removeQuotes = (exemplar) => exemplar.slice(1, exemplar.length - 1);

const sectioniseExemplars = (text) => {
  if (text === null) return text;
  let exemplars;
  // try {
  const regexWithoutEndQuote = /(?:[‘']|’[A-Z])(?:(?!\.[’'])(?:\w|[ ,–\-'‘’"“”.!?/]))+\.?[’']?/g;
  // Match by quotes and then remove quotes
  exemplars = text.match(regexWithoutEndQuote);
  if (!exemplars) {
    const regexWithoutStartQuote = /(?:[‘']|’[A-Z])?(?:(?!\.[’'])(?:\w|[ ,–\-'‘’"“”.!?/]))+\.?[’']/g;
    exemplars = text.match(regexWithoutStartQuote);
  }
  return exemplars.map(removeQuotes);
  // } catch (e) { console.log(`${text} ${exemplars}`); throw e; }
};

const sectionsToJSON = (sections, paperType, year) => {
  if (paperType === 'qp') {
    const [questionNumber, questionStatement, a, b, c] = sections;
    return {
      number: questionNumber,
      statement: questionStatement,
      a,
      b,
      c,
    };
  } if (paperType === 'ms') {
    const [questionLetter, questionStatement, ...levels] = sections;
    // console.log(`At sectionsToJSON: ${sections}`)
    const sectionisedLevels = levels.map(sectioniseExemplars);
    // Before 2017 Levels shown ascending, after & during 2017 shown descending
    let lv1; let lv2; let
      lv3;
    if (year < 2017) {
      [lv1, lv2, lv3] = sectionisedLevels;
    } else {
      [lv3, lv2, lv1] = sectionisedLevels;
    }
    return {
      letter: questionLetter,
      statement: questionStatement,
      level: {
        1: lv1,
        2: lv2,
        3: lv3,
      },
    };
  }
  throw new Error('paperType not ms or qp.');
};

const saveJSONSubsection = (json, subfolderNames, writeDir) => new Promise((resolve) => {
  exec(`mkdir -p ${writeDir}`, {}, () => resolve());
}).then(() => {
  // Have all async save file ops run currently
  // eslint-disable-next-line no-unused-vars
  const [paperType, year, season, timeZone, questionIndex] = subfolderNames;
  const questionNumber = Number(questionIndex.replace('.txt', ''));
  const filename = paperType === 'ms' ? (Math.floor(questionNumber / 3) + 1) + json.letter : questionNumber;
  fs.writeFile(`${writeDir}/${filename}.json`, JSON.stringify(json), (err) => {
    if (err) console.error(err);
    // console.log(`To ${writeDir.replace(rootDir, '')}/${filename}.json`);
  });
});

const callback = (path, subfolderNames, writeDir) => {
  fs.readFile(path, 'utf8', (err, text) => {
    if (err) console.error(err);
    // console.log(`From ${subfolderNames}`);
    const [paperType, year, season, timeZone, questionIndex] = subfolderNames;
    const sections = sectioniseText(text, paperType, 2000 + Number(year), season, timeZone, questionIndex.replace('.txt', ''));
    const jsonSections = sectionsToJSON(sections, paperType, 2000 + Number(year));
    saveJSONSubsection(jsonSections, subfolderNames, writeDir);
  });
};

const filter = (item) => {
  const basename = sysPath.basename(item);
  return (basename === '.' || basename[0] !== '.') && basename;
};

// callback(
//   path.join(__dirname, "../assets/pdf/ms/10/s/1/3.txt"),
//   ["ms", "10", "s", "1", "3.txt"],
//   path.join(__dirname, "../assets/json/ms/10/s/1")
// )

klaw(rootDir, { filter })
  .on('data', ({ path }) => {
    const subfolderNames = path
      .replace(rootDir, '')
      .split('/')
      .slice(1);
    if (
      // Last elem of split array of path must be text
      subfolderNames.length === 5
      && subfolderNames[subfolderNames.length - 1].includes('.txt')
    ) {
      const textWriteDir = path.replace(/\/(?:\w|\.)+$/g, '').replace('pdf', 'json');
      callback(path, subfolderNames, textWriteDir);
    }
  })
  .on('error', (err, { path }) => console.error(`At ${path}: ${err}`));
// .on('end', () => console.log('Klaw done'));
