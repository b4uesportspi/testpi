async function triggerWeeklyMarketingEmails() {
  const secretKey = process.env.MARKETING_EMAIL_SECRET || 'replace-with-your-secret';
  const url = `https://b4uesports.com/api/weekly-marketing?key=${secretKey}`;

  try {
    console.log('🚀 Triggering weekly engagement marketing emails...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Weekly engagement emails triggered successfully!');
      console.log('📊 Results:', result);
    } else {
      console.log('❌ Failed to trigger weekly engagement emails:', result);
    }
  } catch (error) {
    console.error('❌ Error triggering weekly engagement emails:', error);
  }
}

triggerWeeklyMarketingEmails();
