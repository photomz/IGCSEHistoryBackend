/* eslint-disable no-console */
const _ = require('lodash');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

const PAPER = 1;
const HOSTNAME = 'https://pastpapers.co';
const SUBJECT = '0470';

const shortYears = _.range(10, 19 + 1).map((year) => year.toString());
const shortSeasons = ['m', 's', 'w'];
const paperTypes = ['qp', 'ms'];
const timeZones = [1, 2, 3];

// key of shortYear, value of longYear
const yearValues = _.range(2010, 2017 + 1);
const longYears = shortYears.reduce(
  (prev, curr, i) => ({ ...prev, [curr]: yearValues[i] }),
  {},
);
const seasonValues = ['Mar', 'Jun', 'Nov'];
const longSeasons = shortSeasons.reduce(
  (prev, curr, i) => ({ ...prev, [curr]: seasonValues[i] }),
  {},
);

const yearExceptions = {
  m18: '2018-March',
  s18: '2018-May-June',
  w18: '2018-Oct-Nov',
  s19: '2019-May-June',
};

const mkdir = (dir) => new Promise((resolve) => {
  exec(`mkdir -p ${dir}`, {}, () => resolve());
});

shortYears.forEach((year) => {
  shortSeasons.forEach((season) => {
    paperTypes.forEach((paperType) => {
      timeZones.forEach((timeZone) => {
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

        const saveUrl = `./assets/pdf/${paperType}/${year}/${season}`;
        const fileName = `${timeZone}.pdf`;
        const file = fs.createWriteStream(`${saveUrl}/${fileName}`);
        mkdir(saveUrl).then(() => {
          https.get(url, (res) => {
            console.log(url);
            console.log(
              `${SUBJECT}_${seasonPath}_${paperType}_${timeZone} ${res.headers['content-type']}`,
            );
            if (res.headers['content-type'] === 'application/pdf') res.pipe(file);
            else {
              // html file, 404 Page
              file.end();
              fs.unlink(`${saveUrl}/${fileName}`, () => {});
            }
          });
        });
      });
    });
  });
});
