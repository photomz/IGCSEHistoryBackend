#!/bin/bash
echo "Webscraping PDFs from pastpapers.co"
node --unhandled-rejections=strict ./webscrape.js
echo "Converting PDFs to text"
node ./pdfToTxt.js
echo "Removing excess text data"
node ./prettifyText.js
echo "Converting text to JSON"
node ./extractSubsections.js
echo "Combining JSON files"
node ./collateFiles.js
echo "Cleaning up"
#rm -rf ../assets/pdf/
#rm -rf ../assets/json/
echo "Success"
