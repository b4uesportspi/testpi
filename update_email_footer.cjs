const fs = require('fs');
const path = require('path');

const replacement = `
                  <table style="font-family:Arial,sans-serif;max-width:650px;margin: 0 auto;background-color: #f0f4f8; border-radius: 8px; padding: 25px;">
                    <tr>
                      <td style="padding-right:18px;vertical-align:middle;">
                        <img src="https://b4uesports.com/wp-content/uploads/2025/04/cropped-Black_and_Blue_Simple_Creative_Illustrative_Dragons_E-Sport_Logo_20240720_103229_0000-removebg-preview.png" width="150" style="display:block;" alt="B4U Esports Logo">
                      </td>
                      <td style="padding-left:18px;border-left:4px solid #3b82f6;text-align:left;">
                        <h2 style="margin:0;color:#0f172a;font-size:26px;">B4U Esports</h2>
                        <p style="margin:6px 0;color:#64748b;font-size:14px;">Professional Esports & Gaming Platform</p>
                        <p style="margin:6px 0;font-size:14px;"><b>Email:</b> <a href="mailto:info@b4uesports.com" style="color:#2563eb;text-decoration:none;">info@b4uesports.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Website:</b> <a href="https://b4uesports.pinet.com" style="color:#2563eb;text-decoration:none;">b4uesports.pinet.com</a></p>
                        <p style="margin:6px 0;font-size:14px;"><b>Location:</b> Babesa 11001, Thimphu, Bhutan</p>
                        <p style="margin-top:14px;">
                          <a href="https://www.youtube.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="28" alt="YouTube"></a>
                          <a href="https://facebook.com/b4uesports" target="_blank" style="text-decoration:none;margin-right:10px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="28" alt="Facebook"></a>
                          <a href="https://instagram.com/b4uesports" target="_blank" style="text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="28" alt="Instagram"></a>
                        </p>
                      </td>
                    </tr>
                  </table>`;

const targetFiles = [
  'server/services/email.ts',
  'server/services/transaction-emails.ts',
  'server/services/email-robust.ts'
];

targetFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the old table block inside the Support Section td
  const regex = /<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f4f8; border-radius: 8px; padding: 25px; text-align: center;">[\s\S]*?<\/td>\s*<\/tr>\s*<\/table>/g;
  content = content.replace(regex, replacement);
  
  // Also replace the simple "Need help?" footer
  const simpleFooterRegex = /<p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">Need help\? Reach us anytime at info@b4uesports\.com<\/p>/g;
  content = content.replace(simpleFooterRegex, `<div style="padding-top: 15px; padding-bottom: 15px;">\n${replacement}\n</div>`);
  
  fs.writeFileSync(file, content);
  console.log('Processed ' + file);
});
