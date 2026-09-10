const { execSync } = require('child_process');

try {
  console.log('Adding files to git...');
  execSync('git add client/src/hooks/use-pi-network.tsx client/src/components/ads-button.tsx', { stdio: 'inherit' });
  
  console.log('Committing changes...');
  execSync('git commit -m "Fix token persistence issue by ensuring fresh user data is fetched from server on app initialization and properly handling token updates"', { stdio: 'inherit' });
  
  console.log('Pushing to GitHub...');
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('Deployment completed successfully!');
} catch (error) {
  console.error('Deployment failed:', error.message);
}