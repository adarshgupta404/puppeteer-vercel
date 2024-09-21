const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid"); // Import uuid for unique IDs
require("dotenv").config();
const app = express();

let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}
// Middleware to parse JSON and URL-encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/api", async (req, res) => {
  let options = {};
  const { html } = req.body;
  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath("https://my-media-assets.s3.amazonaws.com/chromium-v126.0.0-pack.tar"),
      headless: true,
      ignoreHTTPSErrors: true,
    };
  }

  try {
    
    let browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    await page.setContent(html);

    // Generate a unique file name for the PDF
    const pdfFileName = `generated_pdf_${uuidv4()}.pdf`;
    const pdfPath = path.join(__dirname, pdfFileName);
    const scrollHeight = await page.evaluate(() => {
      return document.documentElement.scrollHeight;
    });

    await page.pdf({
      path: pdfPath,
      width: "800px", // Adjust width as needed
      height: `${scrollHeight + 60}px`, // Add 60px to the calculated scroll height
      printBackground: true, // Ensure background is printed
    });

    await browser.close();

    // Read the PDF file into a buffer
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Optionally, delete the PDF file after reading
    fs.unlinkSync(pdfPath);

    // Send the PDF buffer in the response
    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    return null;
  }
});

app.listen(process.env.PORT || 8000, () => {
  console.log("Server started");
});

module.exports = app;
