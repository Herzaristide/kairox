# Kairox Monster Battler

A real-time web-based monster battler game built with Node.js, TypeScript, React, and Socket.IO.

## Features

- **Monster Collection**: Collect, upgrade, and equip monsters with unique stats and abilities
- **Real-time Combat**: Turn-based 1v1 battles using WebSockets with real-time updates
- **Equipment System**: Equip monsters with weapons, armor, and accessories to boost stats
- **Matchmaking**: Automatic matchmaking system that pairs players for battles
- **RESTful API**: Complete REST API for account management, inventory, and upgrades
- **Modular Architecture**: Well-structured codebase with separation of concerns

## Tech Stack

### Backend

- **Node.js** with **TypeScript** for server-side logic
- **Express.js** for REST API endpoints
- **Socket.IO** for real-time WebSocket communication
- **PostgreSQL** for persistent data storage (users, monsters, equipment, matches)
- **MongoDB** for flexible data storage (future extensibility)
- **Redis** for session caching and real-time match state
- **JWT** for authentication
- **bcryptjs** for password hashing

### Frontend

- **React** with **TypeScript** for the user interface
- **Tailwind CSS** for styling and responsive design
- **React Query** for state management and API caching
- **React Router** for navigation
- **Socket.IO Client** for real-time communication

### Database

- **PostgreSQL** with comprehensive schema for relational data
- **Redis** for caching and session management
- **Docker Compose** for easy database setup

## Project Structure

```
kairox/
├── src/                          # Backend source code
│   ├── database/                 # Database connections and migrations
│   ├── middleware/               # Express middleware (auth, etc.)
│   ├── repositories/             # Data access layer
│   ├── routes/                   # Express route handlers
│   ├── services/                 # Business logic and Socket.IO server
│   ├── types/                    # TypeScript type definitions
│   └── server.ts                 # Main server entry point
├── client/                       # React frontend application
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── contexts/             # React contexts
│   │   ├── services/             # API and socket services
│   │   └── types/                # Frontend type definitions
│   └── public/                   # Static assets
├── docker-compose.yml            # Database containers
└── README.md
```

## Game Mechanics

### Monster System

- Each monster has 4 core stats: HP, Strength, Speed, Ability
- Monsters have 3 skills with different effects (damage, heal, buff, debuff)
- Skills have cooldown periods to balance gameplay
- Monsters can be upgraded to increase stats and level

### Equipment System

- Equipment provides stat bonuses (HP, Strength, Speed, Ability)
- Equipment can be enhanced to increase bonus values
- Different equipment slots: weapons, armor, accessories
- Equipment affects combat effectiveness

### Combat System

- Turn-based combat with turn order determined by Speed stat
- Players select 1-3 monsters for battle
- 30-second preparation phase for monster selection
- 20-second turn timer for skill selection
- Server-side validation prevents cheating
- Real-time battle updates via WebSocket

### Matchmaking

- Players join a lobby to find opponents
- Automatic pairing based on availability
- Real-time match status updates

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd kairox
   ```

2. **Install backend dependencies**

   ```bash
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Start databases with Docker**

   ```bash
   npm run docker:up
   ```

5. **Set up environment variables**

   ```bash
   # Copy .env and adjust if needed
   cp .env.example .env
   ```

6. **Build and start the backend**

   ```bash
   npm run build
   npm run dev
   ```

7. **Start the frontend (in a new terminal)**

   ```bash
   cd client
   npm start
   ```

8. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - Health check: http://localhost:3000/health

### Database Setup

The PostgreSQL schema will be automatically created when you start the databases. The schema includes:

- **Users**: Player accounts with authentication
- **Monster Templates**: Base monster definitions
- **Skills**: Monster abilities and effects
- **Equipment Templates**: Equipment definitions
- **User Monsters**: Player-owned monster instances
- **User Equipment**: Player-owned equipment instances
- **Matches**: Battle records and history

## API Endpoints

### Authentication

- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - User login

### Inventory Management

- `GET /api/inventory/monsters` - Get user's monsters
- `GET /api/inventory/equipment` - Get user's equipment
- `POST /api/inventory/monsters/:id/favorite` - Toggle monster favorite
- `POST /api/inventory/equipment/:id/equip` - Equip item to monster
- `POST /api/inventory/equipment/:id/unequip` - Unequip item

### Monster Upgrades

- `POST /api/monsters/upgrade` - Upgrade monster level or equipment
- `GET /api/monsters/:id/stats` - Get detailed monster stats
- `POST /api/monsters/:id/enhance-equipment/:equipmentId` - Enhance equipment

### Shop

- `GET /api/inventory/shop/monsters` - Available monster templates
- `GET /api/inventory/shop/equipment` - Available equipment
- `POST /api/inventory/shop/equipment/:id/buy` - Purchase equipment

## WebSocket Events

### Client to Server

- `join_lobby` - Join matchmaking queue
- `leave_lobby` - Leave matchmaking queue
- `select_monsters` - Select monsters for battle
- `use_skill` - Use skill in combat

### Server to Client

- `lobby_joined` - Confirmation of joining lobby
- `match_found` - Match found with opponent info
- `preparation_phase` - Battle preparation started
- `turn_start` - New combat turn started
- `battle_update` - Combat state updates
- `battle_end` - Battle finished with results

## Development

### Available Scripts

**Backend:**

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run migrate` - Run database migrations

**Frontend:**

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

**Docker:**

- `npm run docker:up` - Start database containers
- `npm run docker:down` - Stop database containers

### Environment Variables

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=3000

# Database URLs
POSTGRES_URL=postgresql://postgres:password123@localhost:5432/kairox_battler
MONGODB_URL=mongodb://admin:password123@localhost:27017/kairox_battler?authSource=admin
REDIS_URL=redis://localhost:6379

# JWT Secret (change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# CORS Origin
CORS_ORIGIN=http://localhost:3001
```

### Database Schema

The game uses PostgreSQL for structured data with the following main entities:

- **Users**: Authentication and player data
- **Monster Templates**: Base monster definitions with stats and skills
- **User Monsters**: Player-owned monster instances with levels and experience
- **Equipment Templates**: Equipment definitions with stat bonuses
- **User Equipment**: Player-owned equipment with enhancement levels
- **Matches**: Battle records with participants and results

## Future Enhancements

- **Guilds**: Player organizations and guild battles
- **Tournaments**: Scheduled competitive events
- **Monster Breeding**: Create new monsters by combining existing ones
- **Quests**: PvE content with rewards
- **Achievements**: Player progression tracking
- **Trading**: Player-to-player item exchange
- **Mobile App**: React Native mobile version
- **AI Opponents**: Computer-controlled battles for practice

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with modern web technologies for scalable real-time gaming
- Designed for extensibility and future feature additions
- Optimized for both development and production environments
