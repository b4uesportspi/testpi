import { storage } from './storage.js';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function seedPackagesViaAPI() {
  try {
    console.log('Seeding packages via API...');
    
    // Make a POST request to the seed endpoint
    const response = await axios.post('http://localhost:5000/api/seed-packages');
    console.log('API response:', response.data);
  } catch (error) {
    console.error('Error seeding packages via API:', error);
  }
}

async function seedPackages() {
  try {
    console.log('Seeding packages...');
    
    // Check if packages already exist
    const existingPackages = await storage.getPackages();
    if (existingPackages.length > 0) {
      console.log('Packages already exist, checking for missing packages...');
      console.log('Existing packages:', existingPackages.map(p => p.name));
      
      // Create default PUBG packages
      const pubgPackages = [
        {
          game: 'PUBG',
          name: 'PUBG Tournament Entry',
          inGameAmount: 0,
          usdtValue: '5.0000',
          image: '',
          isActive: true,
        },
        // {
        //   game: 'PUBG',
        //   name: '0.06 UC',
        //   inGameAmount: 1, // Using 1 as a placeholder since inGameAmount is integer and 0.06 is not a valid integer
        //   usdtValue: '0.001',
        //   image: '',
        //   isActive: false, // Deactivated - can be activated when needed
        // },
        {
          game: 'PUBG',
          name: '60 UC',
          inGameAmount: 60,
          usdtValue: '1.5000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '325 UC',
          inGameAmount: 325,
          usdtValue: '6.5000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '660 UC',
          inGameAmount: 660,
          usdtValue: '12.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '1800 UC',
          inGameAmount: 1800,
          usdtValue: '25.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '3850 UC',
          inGameAmount: 3850,
          usdtValue: '49.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '8100 UC',
          inGameAmount: 8100,
          usdtValue: '96.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '16200 UC',
          inGameAmount: 16200,
          usdtValue: '186.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '24300 UC',
          inGameAmount: 24300,
          usdtValue: '278.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '32400 UC',
          inGameAmount: 32400,
          usdtValue: '369.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'PUBG',
          name: '40500 UC',
          inGameAmount: 40500,
          usdtValue: '459.0000',
          image: '',
          isActive: true,
        }
      ];

      // Create default MLBB packages
      const mlbbPackages = [
        {
          game: 'MLBB',
          name: '56 Diamonds',
          inGameAmount: 56,
          usdtValue: '3.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'MLBB',
          name: '278 Diamonds',
          inGameAmount: 278,
          usdtValue: '6.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'MLBB',
          name: '571 Diamonds',
          inGameAmount: 571,
          usdtValue: '11.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'MLBB',
          name: '1783 Diamonds',
          inGameAmount: 1783,
          usdtValue: '33.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'MLBB',
          name: '3005 Diamonds',
          inGameAmount: 3005,
          usdtValue: '52.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'MLBB',
          name: '6012 Diamonds',
          inGameAmount: 6012,
          usdtValue: '99.0000',
          image: '',
          isActive: true,
        },
        {
          game: 'MLBB',
          name: '12000 Diamonds',
          inGameAmount: 12000,
          usdtValue: '200.0000',
          image: '',
          isActive: true,
        }
      ];

      // Create default COC packages
      const cocPackages = [
        {
          game: 'COC',
          name: 'Gold Pass',
          inGameAmount: 1,
          usdtValue: '9.0000',
          image: '',
          isActive: true,
        }
      ];

      // Insert all packages, checking for existing ones first
      const allPackages = [...pubgPackages, ...mlbbPackages, ...cocPackages];
      const createdPackages = [];

      for (const pkg of allPackages) {
        // Check for existing package with same name and game before creating
        const existingPackage = existingPackages.find(
          p => p.name === pkg.name && p.game === pkg.game
        );
        
        if (!existingPackage) {
          const createdPackage = await storage.createPackage(pkg);
          createdPackages.push(createdPackage);
          console.log(`Created package: ${createdPackage.name}`);
        } else {
          console.log(`Package ${pkg.name} for ${pkg.game} already exists, skipping creation`);
        }
      }

      console.log(`Successfully created ${createdPackages.length} new packages`);
      return;
    }

    // Create default PUBG packages
    const pubgPackages = [
      // {
      //   game: 'PUBG',
      //   name: '0.06 UC',
      //   inGameAmount: 1, // Using 1 as a placeholder since inGameAmount is integer and 0.06 is not a valid integer
      //   usdtValue: '0.001',
      //   image: '',
      //   isActive: false, // Deactivated - can be activated when needed
      // },
      {
        game: 'PUBG',
        name: '60 UC',
        inGameAmount: 60,
        usdtValue: '1.5000',
        image: '',
        isActive: true,
      },
      {
        game: 'PUBG',
        name: '325 UC',
        inGameAmount: 325,
        usdtValue: '6.5000',
        image: '',
        isActive: true,
      },
      {
        game: 'PUBG',
        name: '660 UC',
        inGameAmount: 660,
        usdtValue: '12.0000',
        image: '',
        isActive: true,
      },
      {
        game: 'PUBG',
        name: '1800 UC',
        inGameAmount: 1800,
        usdtValue: '25.0000',
        image: '',
        isActive: true,
      },
      {
        game: 'PUBG',
        name: '3850 UC',
        inGameAmount: 3850,
        usdtValue: '49.0000',
        image: '',
        isActive: true,
      },
      {
        game: 'PUBG',
        name: '8100 UC',
        inGameAmount: 8100,
        usdtValue: '96.0000',
        image: '',
        isActive: true,
      },
      {
        game: 'PUBG',
        name: '16200 UC',
        inGameAmount: 16200,
        usdtValue: '186.0000',
        image: '',
        isActive: true,
      },
      {
        game: 'PUBG',
        name: '24300 UC',
        inGameAmount: 24300,
        usdtValue: '278.0000',
        image: '',
        isActive: true,
      },
      {
        game: 'PUBG',
        name: '32400 UC',
        inGameAmount: 32400,
        usdtValue: '369.0000',
        image: '',
        isActive: true,
      },
      {
        game: 'PUBG',
        name: '40500 UC',
        inGameAmount: 40500,
        usdtValue: '459.0000',
        image: '',
        isActive: true,
      }
    ];

    // Create default MLBB packages
    const mlbbPackages = [
      {
        game: 'MLBB',
        name: '56 Diamonds',
        inGameAmount: 56,
        usdtValue: '3.0000',
        image: '',
        isActive: true,
      },
      {
        game: 'MLBB',
        name: '278 Diamonds',
        inGameAmount: 278,
        usdtValue: '6.0000',
        image: '',
        isActive: true,
      },
      {
        game: 'MLBB',
        name: '571 Diamonds',
        inGameAmount: 571,
        usdtValue: '11.0000',
        image: '',
        isActive: true,
      },
      {
        game: 'MLBB',
        name: '1783 Diamonds',
        inGameAmount: 1783,
        usdtValue: '33.0000',
        image: '',
        isActive: true,
      },
      {
        game: 'MLBB',
        name: '3005 Diamonds',
        inGameAmount: 3005,
        usdtValue: '52.0000',
        image: '',
        isActive: true,
      },
      {
        game: 'MLBB',
        name: '6012 Diamonds',
        inGameAmount: 6012,
        usdtValue: '99.0000',
        image: '',
        isActive: true,
      },
      {
        game: 'MLBB',
        name: '12000 Diamonds',
        inGameAmount: 12000,
        usdtValue: '200.0000',
        image: '',
        isActive: true,
      }
    ];

    // Create default COC packages
    const cocPackages = [
      {
        game: 'COC',
        name: 'Gold Pass',
        inGameAmount: 1,
        usdtValue: '9.0000',
        image: '',
        isActive: true,
      }
    ];

    // Create default Robux packages
    const robuxPackages = [
      {
        game: 'ROBUX',
        name: '40 Robux',
        inGameAmount: 40,
        usdtValue: '1.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
        isActive: true,
      },
      {
        game: 'ROBUX',
        name: '80 Robux',
        inGameAmount: 80,
        usdtValue: '1.5000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
        isActive: true,
      },
      {
        game: 'ROBUX',
        name: '400 Robux',
        inGameAmount: 400,
        usdtValue: '5.5000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
        isActive: true,
      },
      {
        game: 'ROBUX',
        name: '800 Robux',
        inGameAmount: 800,
        usdtValue: '10.5000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
        isActive: true,
      },
      {
        game: 'ROBUX',
        name: '1700 Robux',
        inGameAmount: 1700,
        usdtValue: '20.5000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
        isActive: true,
      },
      {
        game: 'ROBUX',
        name: '4500 Robux',
        inGameAmount: 4500,
        usdtValue: '51.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
        isActive: true,
      },
      {
        game: 'ROBUX',
        name: '10000 Robux',
        inGameAmount: 10000,
        usdtValue: '101.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
        isActive: true,
      },
      {
        game: 'ROBUX',
        name: '22500 Robux',
        inGameAmount: 22500,
        usdtValue: '201.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
        isActive: true,
      }
    ];

    // Create default NEW STATE packages
    const newstatePackages = [
      {
        game: 'NEWSTATE',
        name: '300 NC',
        inGameAmount: 300,
        usdtValue: '1.5000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
        isActive: true,
      },
      {
        game: 'NEWSTATE',
        name: '1580 NC',
        inGameAmount: 1580,
        usdtValue: '5.5000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
        isActive: true,
      },
      {
        game: 'NEWSTATE',
        name: '3850 NC',
        inGameAmount: 3850,
        usdtValue: '12.5000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
        isActive: true,
      },
      {
        game: 'NEWSTATE',
        name: '10230 NC',
        inGameAmount: 10230,
        usdtValue: '32.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
        isActive: true,
      },
      {
        game: 'NEWSTATE',
        name: '16800 NC',
        inGameAmount: 16800,
        usdtValue: '51.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
        isActive: true,
      },
      {
        game: 'NEWSTATE',
        name: '35000 NC',
        inGameAmount: 35000,
        usdtValue: '101.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
        isActive: true,
      }
    ];

    // Create default FREE FIRE packages
    const freefirePackages = [
      {
        game: 'FREEFIRE',
        name: '110 Diamonds',
        inGameAmount: 110,
        usdtValue: '2.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg',
        isActive: true,
      },
      {
        game: 'FREEFIRE',
        name: '210 Diamonds',
        inGameAmount: 210,
        usdtValue: '3.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg',
        isActive: true,
      },
      {
        game: 'FREEFIRE',
        name: '530 Diamonds',
        inGameAmount: 530,
        usdtValue: '6.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg',
        isActive: true,
      },
      {
        game: 'FREEFIRE',
        name: '1080 Diamonds',
        inGameAmount: 1080,
        usdtValue: '11.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg',
        isActive: true,
      },
      {
        game: 'FREEFIRE',
        name: '2200 Diamonds',
        inGameAmount: 2200,
        usdtValue: '22.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg',
        isActive: true,
      },
      {
        game: 'FREEFIRE',
        name: '5600 Diamonds',
        inGameAmount: 5600,
        usdtValue: '55.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg',
        isActive: true,
      }
    ];

    // Create TikTok Followers packages
    const tiktokFollowersPackages = [
      {
        game: 'TIKTOK_FOLLOWERS',
        name: '100 Followers',
        inGameAmount: 100,
        usdtValue: '2.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
        isActive: true,
      },
      {
        game: 'TIKTOK_FOLLOWERS',
        name: '1,000 Followers',
        inGameAmount: 1000,
        usdtValue: '7.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
        isActive: true,
      },
      {
        game: 'TIKTOK_FOLLOWERS',
        name: '1,500 Followers',
        inGameAmount: 1500,
        usdtValue: '10.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
        isActive: true,
      },
      {
        game: 'TIKTOK_FOLLOWERS',
        name: '2,000 Followers',
        inGameAmount: 2000,
        usdtValue: '11.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
        isActive: true,
      },
      {
        game: 'TIKTOK_FOLLOWERS',
        name: '5,000 Followers',
        inGameAmount: 5000,
        usdtValue: '25.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
        isActive: true,
      },
      {
        game: 'TIKTOK_FOLLOWERS',
        name: '10,000 Followers',
        inGameAmount: 10000,
        usdtValue: '48.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
        isActive: true,
      },
      {
        game: 'TIKTOK_FOLLOWERS',
        name: '50,000 Followers',
        inGameAmount: 50000,
        usdtValue: '225.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
        isActive: true,
      },
      {
        game: 'TIKTOK_FOLLOWERS',
        name: '100,000 Followers',
        inGameAmount: 100000,
        usdtValue: '450.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
        isActive: true,
      }
    ];

    // Create TikTok Monetization Views packages
    const tiktokViewsPackages = [
      {
        game: 'TIKTOK_VIEWS',
        name: '30000 Views',
        inGameAmount: 30000,
        usdtValue: '55.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png',
        isActive: true,
      },
      {
        game: 'TIKTOK_VIEWS',
        name: '50000 Views',
        inGameAmount: 50000,
        usdtValue: '85.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png',
        isActive: true,
      },
      {
        game: 'TIKTOK_VIEWS',
        name: '100000 Views',
        inGameAmount: 100000,
        usdtValue: '200.0000',
        image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png',
        isActive: true,
      }
    ];

    // Insert all packages
    const allPackages = [...pubgPackages, ...mlbbPackages, ...cocPackages, ...robuxPackages, ...newstatePackages, ...freefirePackages, ...tiktokFollowersPackages, ...tiktokViewsPackages];
    const createdPackages = [];

    for (const pkg of allPackages) {
      const createdPackage = await storage.createPackage(pkg);
      createdPackages.push(createdPackage);
      console.log(`Created package: ${createdPackage.name}`);
    }

    console.log(`Successfully seeded ${createdPackages.length} packages`);
  } catch (error) {
    console.error('Error seeding packages:', error);
    // Don't try the API approach if we're having database connection issues
    console.log('Skipping API seeding approach due to database connection issues');
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seedPackages();