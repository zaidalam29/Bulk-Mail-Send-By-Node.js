require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Serve static HTML
app.use(express.static('public'));

// File upload setup
const upload = multer({ dest: 'uploads/' });

const cpUpload = upload.fields([
  { name: 'excelFile', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'coverLetter', maxCount: 1 },
]);

// Email sending route
app.post('/send-emails', cpUpload, async (req, res) => {
  const { subject, message } = req.body;
  const excelFile = req.files['excelFile']?.[0];

  if (!subject || !message || !excelFile) {
    return res.status(400).send('Subject, message, and Excel file are required');
  }

  // 📊 Parse Excel file
  const workbook = xlsx.readFile(excelFile.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  const emails = data.map(row => row.email || row.Email).filter(Boolean);

  // 📧 Gmail transport
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  // 📎 Optional attachments
  const attachments = [];
  if (req.files['resume']) {
    attachments.push({
      filename: req.files['resume'][0].originalname,
      path: req.files['resume'][0].path,
    });
  }
  if (req.files['coverLetter']) {
    attachments.push({
      filename: req.files['coverLetter'][0].originalname,
      path: req.files['coverLetter'][0].path,
    });
  }

  // 🔁 Send to all emails
  for (const email of emails) {
    const mailOptions = {
      from: `"Zaid Alam - Full Stack Developer" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      text: message,
      attachments,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Sent to ${email}`);
    } catch (err) {
      console.error(`❌ Error sending to ${email}:`, err.message);
    }
  }

  // 🧹 Cleanup
  fs.unlinkSync(excelFile.path);
  attachments.forEach(file => fs.unlinkSync(file.path));

  res.send('Emails sent!');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
