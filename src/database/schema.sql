-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 1000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monster templates (base monster data)
CREATE TABLE monster_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    base_hp INTEGER NOT NULL,
    base_strength INTEGER NOT NULL,
    base_speed INTEGER NOT NULL,
    base_ability INTEGER NOT NULL,
    rarity VARCHAR(50) NOT NULL, -- common, rare, epic, legendary
    element VARCHAR(50) NOT NULL, -- fire, water, earth, air, dark, light
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skills table
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    damage INTEGER,
    cooldown INTEGER NOT NULL,
    effect_type VARCHAR(50), -- damage, heal, buff, debuff
    effect_value INTEGER,
    element VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monster template skills (which skills each monster template has)
CREATE TABLE monster_template_skills (
    id SERIAL PRIMARY KEY,
    monster_template_id INTEGER REFERENCES monster_templates(id),
    skill_id INTEGER REFERENCES skills(id),
    skill_slot INTEGER CHECK (skill_slot IN (1, 2, 3)),
    UNIQUE(monster_template_id, skill_slot)
);

-- Equipment templates
CREATE TABLE equipment_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- weapon, armor, accessory
    slot VARCHAR(50) NOT NULL, -- main_hand, off_hand, head, chest, legs, feet, ring, necklace
    hp_bonus INTEGER DEFAULT 0,
    strength_bonus INTEGER DEFAULT 0,
    speed_bonus INTEGER DEFAULT 0,
    ability_bonus INTEGER DEFAULT 0,
    rarity VARCHAR(50) NOT NULL,
    price INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User monsters (actual monster instances owned by players)
CREATE TABLE user_monsters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    monster_template_id INTEGER REFERENCES monster_templates(id),
    nickname VARCHAR(255),
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    hp INTEGER NOT NULL,
    strength INTEGER NOT NULL,
    speed INTEGER NOT NULL,
    ability INTEGER NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User equipment (equipment instances owned by players)
CREATE TABLE user_equipment (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    equipment_template_id INTEGER REFERENCES equipment_templates(id),
    equipped_monster_id INTEGER REFERENCES user_monsters(id) ON DELETE SET NULL,
    enhancement_level INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matches (battle records)
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    player1_id INTEGER REFERENCES users(id),
    player2_id INTEGER REFERENCES users(id),
    winner_id INTEGER REFERENCES users(id),
    status VARCHAR(50) NOT NULL, -- waiting, in_progress, completed, abandoned
    match_data JSONB, -- Store battle log and state
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match participants (which monsters participated in each match)
CREATE TABLE match_participants (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    monster_id INTEGER REFERENCES user_monsters(id),
    position INTEGER CHECK (position IN (1, 2, 3)),
    hp_remaining INTEGER
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_monsters_user_id ON user_monsters(user_id);
CREATE INDEX idx_user_equipment_user_id ON user_equipment(user_id);
CREATE INDEX idx_matches_player1_id ON matches(player1_id);
CREATE INDEX idx_matches_player2_id ON matches(player2_id);
CREATE INDEX idx_matches_status ON matches(status);

-- Insert some sample monster templates
INSERT INTO monster_templates (name, base_hp, base_strength, base_speed, base_ability, rarity, element) VALUES
('Fire Drake', 100, 25, 15, 20, 'common', 'fire'),
('Water Serpent', 120, 20, 20, 25, 'common', 'water'),
('Earth Golem', 150, 30, 10, 15, 'rare', 'earth'),
('Wind Eagle', 80, 20, 30, 25, 'rare', 'air'),
('Shadow Wolf', 90, 35, 25, 20, 'epic', 'dark'),
('Light Phoenix', 110, 30, 20, 35, 'legendary', 'light');

-- Insert some sample skills
INSERT INTO skills (name, description, damage, cooldown, effect_type, effect_value, element) VALUES
('Fireball', 'Launches a ball of fire at the enemy', 35, 2, 'damage', 35, 'fire'),
('Water Blast', 'Shoots a powerful stream of water', 30, 2, 'damage', 30, 'water'),
('Heal', 'Restores health to self', 0, 3, 'heal', 40, 'light'),
('Rock Throw', 'Hurls a large rock at the enemy', 40, 3, 'damage', 40, 'earth'),
('Lightning Strike', 'Calls down lightning from the sky', 45, 4, 'damage', 45, 'air'),
('Shadow Claw', 'Strikes with dark energy', 50, 3, 'damage', 50, 'dark'),
('Divine Light', 'Blinds enemy and deals damage', 35, 3, 'damage', 35, 'light'),
('Flame Burst', 'Area fire attack', 25, 2, 'damage', 25, 'fire'),
('Ice Shard', 'Freezing water attack', 30, 2, 'damage', 30, 'water');

-- Insert sample equipment templates
INSERT INTO equipment_templates (name, type, slot, hp_bonus, strength_bonus, speed_bonus, ability_bonus, rarity, price) VALUES
('Iron Sword', 'weapon', 'main_hand', 0, 10, 0, 0, 'common', 100),
('Steel Shield', 'armor', 'off_hand', 20, 0, 0, 5, 'common', 80),
('Leather Armor', 'armor', 'chest', 15, 0, 5, 0, 'common', 120),
('Magic Ring', 'accessory', 'ring', 0, 0, 0, 15, 'rare', 300),
('Dragon Scale Armor', 'armor', 'chest', 50, 5, 0, 10, 'epic', 1000);

-- Link monster templates with skills
INSERT INTO monster_template_skills (monster_template_id, skill_id, skill_slot) VALUES
(1, 1, 1), (1, 8, 2), (1, 3, 3), -- Fire Drake
(2, 2, 1), (2, 9, 2), (2, 3, 3), -- Water Serpent
(3, 4, 1), (3, 3, 2), (3, 1, 3), -- Earth Golem
(4, 5, 1), (4, 2, 2), (4, 3, 3), -- Wind Eagle
(5, 6, 1), (5, 1, 2), (5, 4, 3), -- Shadow Wolf
(6, 7, 1), (6, 3, 2), (6, 5, 3); -- Light Phoenix
