/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '../assets/json');

const stdin = process.openStdin();

const getInput = () => new Promise((resolve, reject) => {
  try {
    stdin.addListener('data', (buffer) => {
      const text = buffer.toString().trim();
      console.log(text);
      resolve(text);
    });
  } catch (e) {
    reject(e);
  }
});

const userGetText = async () => {
  console.log('Query a question or mark scheme.');
  console.log('Format is:');
  console.log('paperType.year.season.timeZone.question[.letter]');
  const input = await getInput();
  const [paperType, year, season, timeZone, question, letter] = input.split(
    '.',
  );
  if (!paperType || !year || !season || !timeZone || !question) {
    console.log('Required arguments not specified.');
    return;
  }
  if (paperType === 'ms') {
    if (!letter) {
      console.error('Letter must be specified when querying mark scheme.');
      return;
    }
    // eslint-disable-next-line no-shadow
    console.log(
      `${rootDir}/${paperType}/${year}/${season}/${timeZone}/${question}${letter}.json`,
    );
    fs.readFile(
      `${rootDir}/${paperType}/${year}/${season}/${timeZone}/${question}${letter}.json`,
      (err, data) => {
        if (err) console.error(`Error opening JSON file: ${err}`);
        // eslint-disable-next-line no-shadow
        const { letter, statement, level } = JSON.parse(data);
        console.log(`${question}(${letter}) ${statement}`);
        console.log(level);
      },
    );
  } else if (paperType === 'qp') {
    console.log(
      `${rootDir}/${paperType}/${year}/${season}/${timeZone}/${question}.json`,
    );
    fs.readFile(
      `${rootDir}/${paperType}/${year}/${season}/${timeZone}/${question}.json`,
      (err, data) => {
        if (err) console.error(`Error opening JSON file: ${err}`);
        const {
          number, statement, a, b, c,
        } = JSON.parse(data);
        console.log(`${number} ${statement}`);
        console.log(`(a) ${a} \n(b) ${b}\n(c) ${c}`);
      },
    );
  }
  stdin.end();
};

userGetText();
