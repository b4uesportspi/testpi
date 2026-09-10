import { storage } from './server/storage.js';

async function createDefaultTournament() {
  try {
    console.log('🏆 Creating default PUBG tournament...');

    const tournamentData = {
      title: 'PUBG Mobile Championship 2025',
      description: 'Join the ultimate PUBG Mobile Tournament! Compete with top players, win exciting prizes, and showcase your skills in action-packed matches. Mobile Only - No emulators allowed!',
      game: 'PUBG',
      mode: 'squad',
      format: 'elimination',
      skillLevel: 'open',
      status: 'registration_open',
      visibility: 'public',
      maxParticipants: 50,
      minParticipants: 2,
      teamSize: 4,
      registrationFeePi: '5',
      prizePoolPi: '200', // 50 teams * 5 PI * 80% = 200 PI
      currency: 'PI',
      rules: `Entry Fee: 5 PI per team\nTeam Size: 4 players\nMobile Only - No emulators allowed\nAll players must provide valid PUBG IGN and UID\nPan/Fist is allowed\nEmergency Pick-up is not allowed\nVehicle Skins are allowed\nCarrying an enemy is not allowed (carrying teammates is allowed)\nFace Cam required from League Showdown to Grand Finals\nScreen Sharing not allowed\nSecure In-Game Screenshots of results for device verification`,
      region: 'Bhutan',
      platform: 'mobile',
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      registrationOpensAt: new Date(),
      registrationClosesAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
    };

    const tournament = await storage.createTournament(tournamentData);
    console.log('✅ Default tournament created successfully:', tournament);
    console.log('🎮 Tournament ID:', tournament.id);
    console.log('🔗 Registration URL: `/tournament/' + tournament.id);
    
    return tournament;
  } catch (error) {
    console.error('❌ Failed to create default tournament:', error);
    throw error;
  }
}

// Run the function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createDefaultTournament()
    .then(() => {
      console.log('🎉 Default tournament setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

export { createDefaultTournament };
