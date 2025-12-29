# TimesWapArena3D

A web-based 3D third-person shooter built with Three.js featuring a unique time-based ghost clone mechanic.

## Game Overview

TimesWapArena3D is an innovative arena shooter where your past actions come back to haunt you - literally! Every 10 seconds, the game records your position, rotation, weapon, shots fired, and power-ups used. After 30 seconds, ghost clones spawn that perfectly replay those actions and can damage you. Survive as long as you can against your own past selves!

## Features

### Core Mechanics
- **Third-Person Shooter**: Smooth third-person camera following the player
- **Low-Poly 3D Arena**: Minimal aesthetic with platforms at different heights and cover objects
- **Recording System**: Records player actions every 10 seconds
- **Ghost Clone System**: Spawns replays of your past actions that can attack you
- **Health System**: Take damage from ghost projectiles, game over at 0 HP

### Controls
- **WASD** - Move
- **Mouse** - Look around and aim
- **Left Click** - Shoot
- **Space** - Jump

### Weapons (Color-Coded)
- **Pistol (Blue)** - Default weapon, balanced damage and fire rate
- **Shotgun (Red)** - Fires multiple pellets, devastating at close range
- **Rifle (Green)** - High damage, fast fire rate, long range

### Power-Ups (Temporary)
- **Speed Boost (Yellow)** - 10-second duration, doubles movement speed
- **Shield (Purple)** - 15-second duration, blocks all incoming damage
- **Damage Boost (Orange)** - 12-second duration, 2x damage multiplier

### Pickup System
- Weapons and power-ups spawn at fixed locations around the arena
- All pickups respawn every 15 seconds
- Color-coded glowing boxes make them easy to identify

## How to Play

1. Open `index.html` in a web browser
2. Click "Start Game" 
3. Move around the arena, collect weapons and power-ups
4. Survive against your ghost clones as long as possible!

## Technical Details

- **Engine**: Three.js (r128)
- **Rendering**: WebGL with shadow mapping
- **Physics**: Simple custom collision detection
- **Architecture**: Vanilla JavaScript, no build tools required

## Installation

### Option 1: Direct Browser
Simply open `index.html` in any modern web browser.

### Option 2: Local Server
```bash
# Using Python
python3 -m http.server 8080

# Using Node.js
npx http-server

# Then visit http://localhost:8080
```

### Option 3: Install Dependencies
```bash
npm install
# three.min.js is already included, but you can reinstall if needed
```

## Development

The game consists of three main files:
- `index.html` - HTML structure, HUD, and UI
- `game.js` - All game logic, physics, and rendering
- `three.min.js` - Three.js library

## Game Strategy

1. **Collect Weapons Early**: Don't stick with the pistol - upgrade to shotgun or rifle
2. **Use Cover**: The gray blocks can protect you from ghost projectiles
3. **Grab Power-Ups**: The shield is especially valuable for surviving ghost attacks
4. **Keep Moving**: Standing still makes you an easy target for your ghosts
5. **Remember Your Actions**: Your ghosts will do exactly what you did 30+ seconds ago

## Future Enhancements

Potential features for future versions:
- Multiple arena layouts
- Score tracking and leaderboards
- Sound effects and music
- Additional weapons and power-ups
- Multiplayer support
- Mobile controls

## License

ISC

## Credits

Built with [Three.js](https://threejs.org/) - MIT License
 
