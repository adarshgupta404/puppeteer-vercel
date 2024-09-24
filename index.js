const express = require("express");
const puppeteer = require("puppeteer-core");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid"); // Import uuid for unique IDs
require("dotenv").config();
const app = express();
const chromium = require("@sparticuz/chromium-min");
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;
// Middleware to parse JSON and URL-encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Route to convert HTML to PDF and return as buffer
app.post("/generate-pdf", async (req, res) => {
  const { html } = req.body;
  console.log(1);
  if (!html) {
    return res.status(400).send("HTML content is required");
  }
  console.log(2);

  try {
    // Launch Puppeteer
    console.log(3);
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: process.env.CHROME_EXECUTABLE_PATH || await chromium.executablePath(`https://omnileadzdev.s3.ap-south-1.amazonaws.com/chromium-v126.0.0-pack.tar`),
      headless: chromium.headless,
    });
    console.log(4);
    const page = await browser.newPage();
    console.log(5);
    await page.setContent(html);
    console.log(6);
    // Generate a unique file name for the PDF
    const pdfFileName = `generated_pdf_${uuidv4()}.pdf`;
    const pdfPath = path.join(__dirname, pdfFileName);
    console.log(7);
    const scrollHeight = await page.evaluate(() => {
      return document.documentElement.scrollHeight;
    });
    console.log(8);

    await page.pdf({
      path: pdfPath,
      width: "800px", // Adjust width as needed
      height: `${scrollHeight + 60}px`, // Add 60px to the calculated scroll height
      printBackground: true, // Ensure background is printed
    });
    console.log(9);
    await browser.close();

    // Read the PDF file into a buffer
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log(10);
    // Optionally, delete the PDF file after reading
    fs.unlinkSync(pdfPath);
    console.log(11);
    // Send the PDF buffer in the response
    res.setHeader("Content-Type", "application/pdf");
    console.log(12);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send(`Failed to generate PDF: ${error}`);
  }
});

// Example route for HTML form (optional, for testing)
app.get("/", (req, res) => {
  res.send("Puppeteer renderer working!");
});

// Start the server
const PORT = process.env.PORT || 8737;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
