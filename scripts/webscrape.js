/* eslint-disable no-console */
const _ = require("lodash");
const fs = require("fs");
const https = require("https");
const { exec } = require("child_process");
const sysPath = require("path");
const rootDir = sysPath.join(__dirname, "../assets/pdf");

const PAPER = 1;
const HOSTNAME = "https://pastpapers.co";
const SUBJECT = "0470";

const shortYears = _.range(10, 19 + 1).map(year => year.toString());
const shortSeasons = ["m", "s", "w"];
const paperTypes = ["qp", "ms"];
const timeZones = [1, 2, 3];

// key of shortYear, value of longYear
const yearValues = _.range(2010, 2017 + 1);
const longYears = shortYears.reduce(
  (prev, curr, i) => ({ ...prev, [curr]: yearValues[i] }),
  {}
);
const seasonValues = ["Mar", "Jun", "Nov"];
const longSeasons = shortSeasons.reduce(
  (prev, curr, i) => ({ ...prev, [curr]: seasonValues[i] }),
  {}
);

const yearExceptions = {
  m18: "2018-March",
  s18: "2018-May-June",
  w18: "2018-Oct-Nov",
  s19: "2019-May-June",
  w19: "2019-Oct-Nov"
};

const mkdir = dir =>
  new Promise(resolve => {
    exec(`mkdir -p ${dir}`, {}, () => resolve());
  });
let waits = 0;

shortYears.forEach(year => {
  shortSeasons.forEach(season => {
    paperTypes.forEach(paperType => {
      timeZones.forEach(timeZone => {
        const yearPath = yearExceptions[season + year] || longYears[year];
        // console.log(yearExceptions[season + year], season + year);
        // console.log(longYears[year], year);
        const seasonPath = season + year;
        let url;
        if (yearExceptions[season + year]) {
          // is directory structure of newer years
          url = `${HOSTNAME}/cie/IGCSE/History-${SUBJECT}/${yearPath}/${SUBJECT}_${seasonPath}_${paperType}_${PAPER}${timeZone}.pdf`;
        } else {
          url = `${HOSTNAME}/cie/IGCSE/History-${SUBJECT}/${yearPath}/${yearPath}%20${longSeasons[season]}/${SUBJECT}_${seasonPath}_${paperType}_${PAPER}${timeZone}.pdf`;
        }
        waits += 1;
        const saveUrl = `${rootDir}/${paperType}/${year}/${season}`;
        const fileName = `${timeZone}.pdf`;
        mkdir(saveUrl)
          .then(() => {
            const file = fs.createWriteStream(`${saveUrl}/${fileName}`);
            const scrape = i => {
              if (i > 1) console.log("Retrying");
              if (i > 3) {
                console.log(`ABORTED ${url}`);
                waits--;
                file.end();
                fs.unlink(`${saveUrl}/${fileName}`, () => {});
              }
              const request = https
                .get(url, res => {
                  // console.log(url);
                  // console.log(
                  //   `${SUBJECT}_${seasonPath}_${paperType}_${timeZone} ${res.headers["content-type"]}`
                  // );
                  if (res.headers["content-type"] === "application/pdf") {
                    res.pipe(file);
                  }
                  if (res.headers["content-type"] !== "application/pdf") {
                    file.end();
                    request.end();
                    fs.unlink(`${saveUrl}/${fileName}`, () => {});
                  }
                  waits--;
                })
                .on("error", err => {
                  console.log(url);
                  console.log(
                    `${SUBJECT}_${seasonPath}_${paperType}_${timeZone}`
                  );
                  console.error(err);
                  scrape(i + 1);
                });
              request.setTimeout(60000, () => {
                scrape(i + 1);
              });
            };
            scrape(1);
            file.on("end", () => {
              file.close();
            });
          })
          .catch(e => {
            throw e;
          });
      });
    });
  });
});

setInterval(() => {
  if (waits > 0) console.log("Waiting for " + waits + " requests");
  else process.exit();
}, 5000);
