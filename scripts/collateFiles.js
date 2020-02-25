/* eslint-disable no-console */
const fs = require('fs');
const sysPath = require('path');
const klaw = require('klaw');

const filter = (item) => {
  const basename = sysPath.basename(item);
  // console.log(basename);
  return (basename === '.' || basename[0] !== '.') && basename;
};

const ROOTDIR = sysPath.join(__dirname, '../assets/json');
const WRITEFILE = sysPath.join(__dirname, '../assets/json/db.json');
const DB = {};

const read = (path) => new Promise((res, rej) => {
  fs.readFile(path, (err, data) => (err ? rej(err) : res(data)));
});

const setNestedPropertyValue = (obj, fields, val) => {
  let cur = obj;
  const last = fields.pop();

  fields.forEach((field) => {
    cur[field] = {};
    cur = cur[field];
  });

  cur[last] = val;

  return obj;
};

// console.log(`rootdir ${ROOTDIR}`);
klaw(ROOTDIR, { filter })
  .on('data', ({ path }) => {
    const sub = path.replace(`${ROOTDIR}`, '').split('/').slice(1);

    // console.log(sub);
    if (
      sub.length === 5
      && sub[sub.length - 1].includes('.json')
    ) {
      read(path)
        .then((res) => JSON.parse(res))
        .then((json) => {
          sub[4] = sub[4].replace('.json', '');
          if (sub[0] === 'ms') {
            sub[5] = sub[4].slice(sub[4].length - 1);
            sub[4] = sub[4].slice(0, sub[4].length - 1);
          }
          setNestedPropertyValue(DB, sub, null);
          // console.log(DB);
          if (sub[0] === 'qp') DB[sub[0]][sub[1]][sub[2]][sub[3]][sub[4]] = json;
          else if (sub[0] === 'ms') DB[sub[0]][sub[1]][sub[2]][sub[3]][sub[4]][sub[5]] = json;
          else throw new Error(sub);
        })
        .catch((err) => console.error(err));
    }
  })
  // eslint-disable-next-line no-shadow
  .on('error', (err, { path }) => console.error(`At ${path}: ${err}`))
  .on('close', () => {
    const stringDB = JSON.stringify(DB);
    fs.writeFile(WRITEFILE, stringDB, 'utf8', (err) => { console.log(stringDB); throw err; });
  });
// console.log(DB);
