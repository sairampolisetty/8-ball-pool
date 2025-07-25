// Mock data for the 8-ball pool game
export const mockGameState = {
  currentPlayer: 1,
  player1Type: null, // 'solid' or 'stripe' - assigned after first legal ball
  player2Type: null,
  gamePhase: 'open', // 'open', 'playing', 'finished'
  canShoot: true,
  winner: null,
  foulCommitted: false,
  eightBallPocketed: false,
  gameHistory: []
};

export const mockPlayers = [
  {
    id: 1,
    name: "Player 1",
    color: "#3B82F6",
    ballType: null,
    score: 0,
    ballsPocketed: []
  },
  {
    id: 2,
    name: "Player 2",
    color: "#EF4444",
    ballType: null,
    score: 0,
    ballsPocketed: []
  }
];

export const mockGameRules = {
  ballTypes: {
    solid: [1, 2, 3, 4, 5, 6, 7],
    stripe: [9, 10, 11, 12, 13, 14, 15],
    eight: [8],
    cue: [0]
  },
  winConditions: {
    pocketAllBalls: true,
    pocketEightBallLast: true,
    avoidFouls: true
  },
  fouls: [
    "Pocketing cue ball",
    "Not hitting any ball",
    "Hitting wrong ball type first",
    "Pocketing eight ball early",
    "Ball off table"
  ]
};

export const mockSoundEffects = {
  ballCollision: "/sounds/ball-collision.wav",
  ballPocket: "/sounds/ball-pocket.wav",
  cueHit: "/sounds/cue-hit.wav",
  gameWin: "/sounds/game-win.wav",
  foul: "/sounds/foul.wav"
};

export const mockVisualEffects = {
  ballTrail: {
    enabled: true,
    length: 10,
    opacity: 0.3
  },
  pocketGlow: {
    enabled: true,
    color: "#FFD700",
    intensity: 0.5
  },
  ballHighlight: {
    enabled: true,
    color: "#FFFFFF",
    intensity: 0.6
  },
  cueGlow: {
    enabled: true,
    color: "#00FFFF",
    intensity: 0.4
  }
};

export const mockGameSettings = {
  tableSize: {
    width: 800,
    height: 400
  },
  ballRadius: 8,
  pocketRadius: 18,
  friction: 0.98,
  bounceDamping: 0.8,
  maxPower: 100,
  aimSensitivity: 1.0,
  visualEffects: true,
  soundEffects: true,
  showTrajectory: true,
  autoSwitchPlayer: true
};