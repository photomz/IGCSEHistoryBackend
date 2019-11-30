const fs = require("fs");
const path = require("path");
const klaw = require("klaw");
const { exec } = require("child_process");

const getText = regexObject => Array.from(regexObject, m => m[0]);

const getSubsectioniseRegex = (paperType, year) => {
  switch (paperType) {
    case "ms":
      return;
    case "qp":
      /*
       * \d{0,2}[ \t]*Study the : Match question instructions and extract introduction.
       * (?!(?:\d{0,2}[ \t]*Study the |0470|(?:\n[ \t]*){2})) Assert matches cannot contain new question set | footer for page break | double line break
       * (?:.|[\n\r]) Otherwise regex can have arbitrary characters and line breaks
       * (?: ... )* Apply for all text
       */
      return /^\s*(\d{1,2}) ((?:(?!(?:\s*\([a-c]\)))(?:.|[\n\r]))*)\s*\([a-c]\)\s*((?:(?!(?:\s*\([a-c]\)))(?:.|[\n\r]))*)\s*\([a-c]\)\s*((?:(?!(?:\s*\([a-c]\)))(?:.|[\n\r]))*)\s*\([a-c]\)\s*((?:(?!(?:\s*\([a-c]\)))(?:.|[\n\r]))*)\s*$/g;
    default:
      throw new Error("Paper Type is not qp or ms.");
  }
};

const removeEmptyQuestionContent = question =>
  question.match(/^\s*\([a-c]\)\s*$/g) === null;

const sectioniseText = (text, paperType, year = 2019) => {
  const [separatorRegex, cleanerRegex] = getSubsectioniseRegex(paperType, year);
  const captures = getText(text.matchAll(separatorRegex));
  switch (paperType) {
    case "ms":
      const cleanedCaptures = captures
        .map(answer => answer.replace(cleanerRegex, " ").trim())
        .filter(removeEmptyQuestionContent);
      // After 2017, (c) mark schemes spanning multiple page have duplicate questions number & letters
      if (year >= 2017) return fixDuplicatedMarkSchemes(cleanedCaptures);
      else return cleanedCaptures;
    case "qp":
      return captures
        .map(question => question.trim())
        .filter(removeEmptyQuestionContent);
    default:
      throw new Error("Paper Type is not qp or ms.");
  }
};

const callback = (
  path,
  [paperType, year, season, timeZone, questionIndex],
  writeDir
) => {
  fs.readFile(path, "utf8", (err, text) => {
    if (err) console.error(err);
    console.log(path);
    const sectionised = sectioniseText(text, paperType, 2000 + Number(year));
  });
};

const filter = item => {
  const basename = path.basename(item);
  return (basename === "." || basename[0] !== ".") && basename;
};

const rootDir = path.join(__dirname, "../assets/pdf");
klaw(rootDir, { filter })
  .on("data", ({ path }) => {
    const subfolderNames = path
      .split(rootDir)
      .slice(1)
      .join("")
      .split("/")
      .slice(1);

    if (
      // Last elem of split array of path must be text
      subfolderNames.length === 5 &&
      subfolderNames[subfolderNames.length - 1].includes(".txt")
    ) {
      const textWriteDir = path
        .split(".txt")
        .slice(0)
        .join("");
      callback(path, subfolderNames, textWriteDir);
    }
  })
  .on("error", (err, { path }) => console.error(`At ${path}: ${err}`))
  .on("end", () => console.log("Klaw done"));
