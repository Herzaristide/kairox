import { pgPool } from './connection';
import bcrypt from 'bcryptjs';

export const setupDatabase = async (reset: boolean = false): Promise<void> => {
  try {
    if (reset) {
      await resetDatabase();
    }

    console.log('🏗️ Setting up database tables...');

    // Create users table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        coins INTEGER DEFAULT 1000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create monster_templates table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS monster_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        element VARCHAR(20) NOT NULL,
        rarity VARCHAR(20) NOT NULL,
        base_hp INTEGER NOT NULL,
        base_strength INTEGER NOT NULL,
        base_speed INTEGER NOT NULL,
        base_ability INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_monsters table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS user_monsters (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        template_id INTEGER REFERENCES monster_templates(id),
        nickname VARCHAR(100),
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        hp INTEGER NOT NULL,
        strength INTEGER NOT NULL,
        speed INTEGER NOT NULL,
        ability INTEGER NOT NULL,
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if template_id column exists, if not add it
    const columnCheck = await pgPool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_monsters' AND column_name = 'template_id'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('🔧 Adding missing template_id column...');
      await pgPool.query(`
        ALTER TABLE user_monsters 
        ADD COLUMN template_id INTEGER REFERENCES monster_templates(id)
      `);
    }

    // Check if description column exists in monster_templates, if not add it
    const descriptionColumnCheck = await pgPool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'monster_templates' AND column_name = 'description'
    `);

    if (descriptionColumnCheck.rows.length === 0) {
      console.log(
        '🔧 Adding missing description column to monster_templates...'
      );
      await pgPool.query(`
        ALTER TABLE monster_templates 
        ADD COLUMN description TEXT
      `);
    }

    // Create equipment_templates table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS equipment_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL,
        slot VARCHAR(20) NOT NULL,
        hp_bonus INTEGER DEFAULT 0,
        strength_bonus INTEGER DEFAULT 0,
        speed_bonus INTEGER DEFAULT 0,
        ability_bonus INTEGER DEFAULT 0,
        rarity VARCHAR(20) NOT NULL,
        price INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_equipment table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS user_equipment (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        equipment_template_id INTEGER REFERENCES equipment_templates(id),
        equipped_monster_id INTEGER REFERENCES user_monsters(id) ON DELETE SET NULL,
        enhancement_level INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables created successfully');

    // Create users and their monsters
    await createUsersAndMonsters();

    // Check if monster templates exist
    const templateCheck = await pgPool.query(
      'SELECT COUNT(*) FROM monster_templates'
    );

    if (parseInt(templateCheck.rows[0].count) === 0) {
      console.log('🐾 Creating sample monsters...');

      // Insert sample monsters
      await pgPool.query(`
        INSERT INTO monster_templates (name, element, rarity, base_hp, base_strength, base_speed, base_ability, description)
        VALUES 
        ('Fire Drake', 'fire', 'rare', 120, 85, 70, 60, 'A fierce dragon with burning breath'),
        ('Water Spirit', 'water', 'common', 100, 60, 90, 80, 'A gentle spirit that controls water'),
        ('Earth Guardian', 'earth', 'epic', 180, 100, 40, 90, 'A mighty guardian of the earth'),
        ('Wind Falcon', 'air', 'rare', 90, 75, 120, 70, 'Swift as the wind itself'),
        ('Shadow Wolf', 'dark', 'legendary', 150, 110, 95, 85, 'A mysterious wolf from the shadows'),
        ('Ice Phoenix', 'ice', 'epic', 130, 90, 110, 95, 'A majestic phoenix of ice and snow'),
        ('Thunder Tiger', 'electric', 'rare', 110, 95, 100, 75, 'A fierce tiger crackling with electricity'),
        ('Crystal Golem', 'crystal', 'common', 140, 70, 50, 100, 'A sturdy golem made of pure crystal')
      `);

      console.log('✅ Sample monsters created successfully');
    } else {
      console.log('✅ Monster templates already exist');
    }

    // Check if equipment templates exist
    const equipmentTemplateCheck = await pgPool.query(
      'SELECT COUNT(*) FROM equipment_templates'
    );

    if (parseInt(equipmentTemplateCheck.rows[0].count) === 0) {
      console.log('⚔️ Creating sample equipment...');

      // Insert sample equipment
      await pgPool.query(`
        INSERT INTO equipment_templates (name, type, slot, hp_bonus, strength_bonus, speed_bonus, ability_bonus, rarity, price, description)
        VALUES 
        ('Iron Sword', 'weapon', 'main_hand', 0, 15, 0, 0, 'common', 100, 'A basic iron sword'),
        ('Steel Shield', 'armor', 'off_hand', 20, 0, 0, 5, 'common', 80, 'A sturdy steel shield'),
        ('Leather Helmet', 'armor', 'head', 10, 0, 0, 2, 'common', 50, 'Basic leather protection'),
        ('Chain Mail', 'armor', 'chest', 30, 0, -5, 10, 'rare', 200, 'Heavy chain mail armor'),
        ('Dragon Sword', 'weapon', 'main_hand', 5, 35, 10, 0, 'epic', 500, 'A sword forged from dragon scales'),
        ('Magic Ring', 'accessory', 'ring', 15, 5, 5, 15, 'rare', 300, 'A ring imbued with magical power'),
        ('Speed Boots', 'armor', 'feet', 5, 0, 25, 0, 'rare', 250, 'Boots that enhance movement speed'),
        ('Legendary Amulet', 'accessory', 'necklace', 25, 20, 20, 25, 'legendary', 1000, 'An amulet of immense power')
      `);

      console.log('✅ Sample equipment created successfully');
    } else {
      console.log('✅ Equipment templates already exist');
    }
  } catch (error) {
    console.error('❌ Database setup error:', error);
    throw error;
  }
};

const createUsersAndMonsters = async (): Promise<void> => {
  // Create demo user
  const demoUserCheck = await pgPool.query(
    'SELECT id FROM users WHERE username = $1',
    ['demo']
  );

  let demoUserId: number;
  if (demoUserCheck.rows.length === 0) {
    console.log('🧪 Creating demo user...');
    const passwordHash = await bcrypt.hash('demo123', 10);
    const demoResult = await pgPool.query(
      `INSERT INTO users (username, email, password_hash, level, experience, coins)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['demo', 'demo@example.com', passwordHash, 5, 250, 5000]
    );
    demoUserId = demoResult.rows[0].id;
    console.log('✅ Demo user created successfully');
    console.log('   Username: demo');
    console.log('   Password: demo123');
  } else {
    demoUserId = demoUserCheck.rows[0].id;
    console.log('✅ Demo user already exists');
  }

  // Create test user
  const testUserCheck = await pgPool.query(
    'SELECT id FROM users WHERE username = $1',
    ['tester']
  );

  let testUserId: number;
  if (testUserCheck.rows.length === 0) {
    console.log('🧪 Creating test user...');
    const passwordHash = await bcrypt.hash('test123', 10);
    const testResult = await pgPool.query(
      `INSERT INTO users (username, email, password_hash, level, experience, coins)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['tester', 'tester@example.com', passwordHash, 3, 150, 3000]
    );
    testUserId = testResult.rows[0].id;
    console.log('✅ Test user created successfully');
    console.log('   Username: tester');
    console.log('   Password: test123');
  } else {
    testUserId = testUserCheck.rows[0].id;
    console.log('✅ Test user already exists');
  }

  // Ensure monster templates exist first
  const templateCheck = await pgPool.query(
    'SELECT COUNT(*) FROM monster_templates'
  );
  if (parseInt(templateCheck.rows[0].count) === 0) {
    console.log('🐾 Creating monster templates first...');
    await pgPool.query(`
      INSERT INTO monster_templates (name, element, rarity, base_hp, base_strength, base_speed, base_ability, description)
      VALUES 
      ('Fire Drake', 'fire', 'rare', 120, 85, 70, 60, 'A fierce dragon with burning breath'),
      ('Water Spirit', 'water', 'common', 100, 60, 90, 80, 'A gentle spirit that controls water'),
      ('Earth Guardian', 'earth', 'epic', 180, 100, 40, 90, 'A mighty guardian of the earth'),
      ('Wind Falcon', 'air', 'rare', 90, 75, 120, 70, 'Swift as the wind itself'),
      ('Shadow Wolf', 'dark', 'legendary', 150, 110, 95, 85, 'A mysterious wolf from the shadows'),
      ('Ice Phoenix', 'ice', 'epic', 130, 90, 110, 95, 'A majestic phoenix of ice and snow'),
      ('Thunder Tiger', 'electric', 'rare', 110, 95, 100, 75, 'A fierce tiger crackling with electricity'),
      ('Crystal Golem', 'crystal', 'common', 140, 70, 50, 100, 'A sturdy golem made of pure crystal')
    `);
  }

  // Get monster templates
  const templates = await pgPool.query(
    'SELECT * FROM monster_templates LIMIT 8'
  );

  // Add monsters to demo user
  const demoMonstersCheck = await pgPool.query(
    'SELECT COUNT(*) FROM user_monsters WHERE user_id = $1',
    [demoUserId]
  );

  if (parseInt(demoMonstersCheck.rows[0].count) === 0) {
    console.log('🐾 Creating monsters for demo user...');

    // Give demo user Fire Drake, Water Spirit, and Earth Guardian
    for (let i = 0; i < 3; i++) {
      const template = templates.rows[i];
      await pgPool.query(
        `
        INSERT INTO user_monsters (user_id, template_id, nickname, level, experience, hp, strength, speed, ability, is_favorite)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
        [
          demoUserId,
          template.id,
          `${template.name} ${i + 1}`,
          Math.floor(Math.random() * 3) + 1, // Level 1-3
          Math.floor(Math.random() * 100),
          template.base_hp + Math.floor(Math.random() * 20),
          template.base_strength + Math.floor(Math.random() * 15),
          template.base_speed + Math.floor(Math.random() * 15),
          template.base_ability + Math.floor(Math.random() * 15),
          i === 0, // First monster is favorite
        ]
      );
    }
    console.log('✅ Demo user monsters created');
  } else {
    console.log('✅ Demo user already has monsters');
  }

  // Add monsters to test user
  const testMonstersCheck = await pgPool.query(
    'SELECT COUNT(*) FROM user_monsters WHERE user_id = $1',
    [testUserId]
  );

  if (parseInt(testMonstersCheck.rows[0].count) === 0) {
    console.log('🐾 Creating monsters for test user...');

    // Give test user Wind Falcon, Shadow Wolf, and Ice Phoenix
    for (let i = 3; i < 6; i++) {
      const template = templates.rows[i];
      await pgPool.query(
        `
        INSERT INTO user_monsters (user_id, template_id, nickname, level, experience, hp, strength, speed, ability, is_favorite)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
        [
          testUserId,
          template.id,
          `${template.name} ${i - 2}`,
          Math.floor(Math.random() * 4) + 1, // Level 1-4
          Math.floor(Math.random() * 150),
          template.base_hp + Math.floor(Math.random() * 25),
          template.base_strength + Math.floor(Math.random() * 20),
          template.base_speed + Math.floor(Math.random() * 20),
          template.base_ability + Math.floor(Math.random() * 20),
          i === 3, // First monster is favorite
        ]
      );
    }
    console.log('✅ Test user monsters created');
  } else {
    console.log('✅ Test user already has monsters');
  }
};

// Function to reset database tables (useful for development)
export const resetDatabase = async (): Promise<void> => {
  try {
    console.log('🗑️ Resetting database tables...');

    // Drop tables in reverse order of dependencies
    await pgPool.query('DROP TABLE IF EXISTS user_monsters CASCADE');
    await pgPool.query('DROP TABLE IF EXISTS monster_templates CASCADE');
    await pgPool.query('DROP TABLE IF EXISTS users CASCADE');

    console.log('✅ Tables dropped successfully');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('🎉 Database setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database setup failed:', error);
      process.exit(1);
    });
}
