/* eslint-disable no-console */
const fs = require("fs");
const sysPath = require("path");
const klaw = require("klaw");

const filter = item => {
  const basename = sysPath.basename(item);
  // console.log(basename);
  return (basename === "." || basename[0] !== ".") && basename;
};

const ROOTDIR = sysPath.join(__dirname, "../assets/json");
const WRITEFILE = sysPath.join(__dirname, "../assets/db.json");
const DB = {};

const read = path =>
  new Promise((res, rej) => {
    fs.readFile(path, (err, data) => (err ? rej(err) : res(data)));
  });

const setNestedPropertyValue = (obj, fields, val) => {
  const fieldArr = JSON.parse(JSON.stringify(fields));
  let cur = obj;
  const last = fieldArr.pop();
  fieldArr.forEach(field => {
    if (cur[field] === undefined) cur[field] = {};
    cur = cur[field];
  });
  // console.log(cur[last]);
  if (cur[last] === undefined) cur[last] = val;

  return obj;
};

// console.log(`rootdir ${ROOTDIR}`);
klaw(ROOTDIR, { filter })
  .on("data", ({ path }) => {
    const sub = path
      .replace(`${ROOTDIR}`, "")
      .split("/")
      .slice(1);

    if (sub.length === 5 && sub[sub.length - 1].includes(".json")) {
      read(path)
        .then(res => JSON.parse(res))
        .then(json => {
          sub[4] = sub[4].replace(".json", "");
          if (sub[0] === "ms") {
            sub[5] = sub[4].slice(sub[4].length - 1);
            sub[4] = sub[4].slice(0, sub[4].length - 1);
          }
          // console.log(sub);
          setNestedPropertyValue(DB, sub, null);
          // console.log(DB);
          if (sub[0] === "qp") {
            //console.log(DB[sub[0]][sub[1]][sub[2]][sub[3]][sub[4]]);
            //console.log(json);
            DB[sub[0]][sub[1]][sub[2]][sub[3]][sub[4]] = json;
            //console.log(DB[sub[0]][sub[1]][sub[2]][sub[3]][sub[4]]);
          } else if (sub[0] === "ms") {
            DB[sub[0]][sub[1]][sub[2]][sub[3]][sub[4]][sub[5]] = json;
          } else throw new Error(sub);
        })
        .catch(err => console.error(err));
    }
  })
  // eslint-disable-next-line no-shadow
  .on("error", (err, { path }) => console.error(`At ${path}: ${err}`))
  .on("end", () => {
    const stringDB = JSON.stringify(DB);
    fs.writeFile(WRITEFILE, stringDB, "utf8", (err, data) => {
      //console.log(stringDB);
      if (err) throw err;
      //else console.log("Success");
    });
  });
// console.log(DB);
