import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { mockGameState } from '../mock';

const PoolGame = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [gameState, setGameState] = useState(mockGameState);
  const [isAiming, setIsAiming] = useState(false);
  const [aimAngle, setAimAngle] = useState(0);
  const [power, setPower] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });
  const [scale, setScale] = useState(1);
  const [shotResult, setShotResult] = useState(null);
  const [cueBallPlacement, setCueBallPlacement] = useState(false);
  const animationRef = useRef(null);

  // Table dimensions (base dimensions)
  const BASE_TABLE_WIDTH = 800;
  const BASE_TABLE_HEIGHT = 400;
  const BALL_RADIUS = 8;
  const POCKET_RADIUS = 18;
  const FRICTION = 0.98;
  const BOUNCE_DAMPING = 0.8;

  // Responsive table dimensions
  const TABLE_WIDTH = canvasSize.width;
  const TABLE_HEIGHT = canvasSize.height;

  // Update canvas size based on container
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32; // Account for padding
        const maxWidth = Math.min(containerWidth, 1000);
        const aspectRatio = BASE_TABLE_HEIGHT / BASE_TABLE_WIDTH;
        const newWidth = maxWidth;
        const newHeight = newWidth * aspectRatio;
        const newScale = newWidth / BASE_TABLE_WIDTH;
        
        setCanvasSize({ width: newWidth, height: newHeight });
        setScale(newScale);
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Pocket positions (scaled)
  const POCKETS = [
    { x: 15 * scale, y: 15 * scale }, // Top left
    { x: TABLE_WIDTH / 2, y: 10 * scale }, // Top center
    { x: TABLE_WIDTH - 15 * scale, y: 15 * scale }, // Top right
    { x: 15 * scale, y: TABLE_HEIGHT - 15 * scale }, // Bottom left
    { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - 10 * scale }, // Bottom center
    { x: TABLE_WIDTH - 15 * scale, y: TABLE_HEIGHT - 15 * scale }, // Bottom right
  ];

  // Ball colors
  const BALL_COLORS = {
    0: '#FFFFFF', // Cue ball
    1: '#FFD700', // Yellow
    2: '#0066CC', // Blue
    3: '#FF0000', // Red
    4: '#800080', // Purple
    5: '#FFA500', // Orange
    6: '#008000', // Green
    7: '#8B4513', // Brown
    8: '#000000', // Black
    9: '#FFD700', // Yellow stripe
    10: '#0066CC', // Blue stripe
    11: '#FF0000', // Red stripe
    12: '#800080', // Purple stripe
    13: '#FFA500', // Orange stripe
    14: '#008000', // Green stripe
    15: '#8B4513', // Brown stripe
  };

  const initializeBalls = useCallback(() => {
    const balls = [];
    
    // Cue ball
    balls.push({
      id: 0,
      x: TABLE_WIDTH * 0.25,
      y: TABLE_HEIGHT / 2,
      vx: 0,
      vy: 0,
      color: BALL_COLORS[0],
      type: 'cue',
      pocketed: false,
      trail: []
    });

    // Rack formation
    const rackX = TABLE_WIDTH * 0.75;
    const rackY = TABLE_HEIGHT / 2;
    const ballNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    
    let ballIndex = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        if (ballIndex < ballNumbers.length) {
          const ballNum = ballNumbers[ballIndex];
          balls.push({
            id: ballNum,
            x: rackX + row * (BALL_RADIUS * scale * 1.8),
            y: rackY + (col - row / 2) * (BALL_RADIUS * scale * 1.8),
            vx: 0,
            vy: 0,
            color: BALL_COLORS[ballNum],
            type: ballNum <= 7 ? 'solid' : ballNum === 8 ? 'eight' : 'stripe',
            pocketed: false,
            trail: []
          });
          ballIndex++;
        }
      }
    }
    
    return balls;
  }, [TABLE_WIDTH, TABLE_HEIGHT, scale]);

  const [balls, setBalls] = useState(initializeBalls);

  // Reset balls when canvas size changes
  useEffect(() => {
    setBalls(initializeBalls());
  }, [initializeBalls]);

  // Game rule functions
  const getBallType = (ballId) => {
    if (ballId === 0) return 'cue';
    if (ballId === 8) return 'eight';
    if (ballId <= 7) return 'solid';
    return 'stripe';
  };

  const getPlayerBallType = (playerId) => {
    return gameState[`player${playerId}Type`];
  };

  const isPlayerBall = (ballId, playerId) => {
    const ballType = getBallType(ballId);
    const playerType = getPlayerBallType(playerId);
    return ballType === playerType;
  };

  const getPlayerRemainingBalls = (playerId) => {
    const playerType = getPlayerBallType(playerId);
    if (!playerType) return [];
    
    return balls.filter(ball => 
      ball.type === playerType && !ball.pocketed
    );
  };

  const canShootEightBall = (playerId) => {
    const remainingBalls = getPlayerRemainingBalls(playerId);
    return remainingBalls.length === 0;
  };

  const handleBallPocketed = useCallback((ball) => {
    if (ball.id === 0) {
      // Cue ball scratched
      return {
        type: 'scratch',
        foul: true,
        switchTurn: true,
        message: 'Cue ball scratched!'
      };
    }

    if (ball.id === 8) {
      // 8-ball pocketed
      const canShoot8 = canShootEightBall(gameState.currentPlayer);
      if (canShoot8) {
        return {
          type: 'win',
          winner: gameState.currentPlayer,
          message: `Player ${gameState.currentPlayer} wins!`
        };
      } else {
        return {
          type: 'lose',
          winner: gameState.currentPlayer === 1 ? 2 : 1,
          message: `Player ${gameState.currentPlayer} loses! 8-ball pocketed early.`
        };
      }
    }

    // Regular ball pocketed
    const ballType = getBallType(ball.id);
    const currentPlayerType = getPlayerBallType(gameState.currentPlayer);

    if (!currentPlayerType) {
      // First ball determines player type
      const newPlayerType = ballType;
      const otherPlayerType = ballType === 'solid' ? 'stripe' : 'solid';
      
      return {
        type: 'assignment',
        playerType: newPlayerType,
        otherPlayerType: otherPlayerType,
        continueShoot: true,
        message: `Player ${gameState.currentPlayer} gets ${newPlayerType}s!`
      };
    }

    if (ballType === currentPlayerType) {
      // Player pocketed their own ball
      return {
        type: 'success',
        continueShoot: true,
        message: `Good shot! Continue shooting.`
      };
    } else {
      // Player pocketed opponent's ball
      return {
        type: 'opponent_ball',
        foul: true,
        switchTurn: true,
        message: `Wrong ball! Turn switches.`
      };
    }
  }, [gameState.currentPlayer, balls]);

  const repositionCueBall = useCallback(() => {
    setBalls(prevBalls => 
      prevBalls.map(ball => 
        ball.id === 0 
          ? {
              ...ball,
              x: TABLE_WIDTH * 0.25,
              y: TABLE_HEIGHT / 2,
              vx: 0,
              vy: 0,
              pocketed: false,
              trail: []
            }
          : ball
      )
    );
    setCueBallPlacement(true);
  }, [TABLE_WIDTH, TABLE_HEIGHT]);

  const drawTable = useCallback((ctx) => {
    // Table felt with modern gradient
    const gradient = ctx.createLinearGradient(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    gradient.addColorStop(0, '#1a4d3a');
    gradient.addColorStop(0.5, '#2d5a3d');
    gradient.addColorStop(1, '#1a4d3a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // Table border with modern styling
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, TABLE_WIDTH - 8, TABLE_HEIGHT - 8);

    // Inner border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, TABLE_WIDTH - 24, TABLE_HEIGHT - 24);

    // Pockets with glow effect
    POCKETS.forEach(pocket => {
      // Glow effect
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner pocket
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, POCKET_RADIUS - 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Center spot
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Rack outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(TABLE_WIDTH * 0.75 - 20, TABLE_HEIGHT / 2 - 40);
    ctx.lineTo(TABLE_WIDTH * 0.75 + 60, TABLE_HEIGHT / 2 - 40);
    ctx.lineTo(TABLE_WIDTH * 0.75 + 60, TABLE_HEIGHT / 2 + 40);
    ctx.lineTo(TABLE_WIDTH * 0.75 - 20, TABLE_HEIGHT / 2 + 40);
    ctx.closePath();
    ctx.stroke();
  }, []);

  const drawBalls = useCallback((ctx) => {
    balls.forEach(ball => {
      if (ball.pocketed) return;

      // Draw ball trail
      if (ball.trail.length > 1) {
        ctx.strokeStyle = `${ball.color}40`;
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(ball.trail[0].x, ball.trail[0].y);
        for (let i = 1; i < ball.trail.length; i++) {
          ctx.lineTo(ball.trail[i].x, ball.trail[i].y);
        }
        ctx.stroke();
      }

      // Ball shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 5 * scale;
      ctx.shadowOffsetX = 2 * scale;
      ctx.shadowOffsetY = 2 * scale;

      // Main ball
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS * scale, 0, Math.PI * 2);
      ctx.fill();

      // Ball highlight
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      const highlightGradient = ctx.createRadialGradient(
        ball.x - 3 * scale, ball.y - 3 * scale, 0,
        ball.x - 3 * scale, ball.y - 3 * scale, BALL_RADIUS * scale
      );
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlightGradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS * scale, 0, Math.PI * 2);
      ctx.fill();

      // Ball number
      if (ball.id !== 0) {
        ctx.fillStyle = ball.type === 'stripe' ? '#FFFFFF' : '#000000';
        ctx.font = `bold ${10 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ball.id.toString(), ball.x, ball.y);
      }

      // Stripe pattern for striped balls
      if (ball.type === 'stripe') {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS * scale - 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = ball.color;
        ctx.fillRect(ball.x - BALL_RADIUS * scale + 2, ball.y - 2 * scale, (BALL_RADIUS * scale - 2) * 2, 4 * scale);
      }

      // Highlight cue ball placement mode
      if (cueBallPlacement && ball.id === 0) {
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 3 * scale;
        ctx.setLineDash([5 * scale, 5 * scale]);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS * scale + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }, [balls, scale, cueBallPlacement]);

  const drawCue = useCallback((ctx) => {
    const cueBall = balls.find(b => b.id === 0);
    if (!cueBall || cueBall.pocketed || !isAiming || cueBallPlacement) return;

    const cueLength = (100 + power * 2) * scale;
    const cueX = cueBall.x - Math.cos(aimAngle) * cueLength;
    const cueY = cueBall.y - Math.sin(aimAngle) * cueLength;

    // Cue stick shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 3 * scale;
    ctx.shadowOffsetX = 2 * scale;
    ctx.shadowOffsetY = 2 * scale;

    // Cue stick gradient
    const cueGradient = ctx.createLinearGradient(cueX, cueY, cueBall.x, cueBall.y);
    cueGradient.addColorStop(0, '#D2691E');
    cueGradient.addColorStop(0.8, '#8B4513');
    cueGradient.addColorStop(1, '#654321');

    ctx.strokeStyle = cueGradient;
    ctx.lineWidth = 6 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cueX, cueY);
    ctx.lineTo(cueBall.x - Math.cos(aimAngle) * (BALL_RADIUS * scale + 5), cueBall.y - Math.sin(aimAngle) * (BALL_RADIUS * scale + 5));
    ctx.stroke();

    // Cue tip
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#000080';
    ctx.beginPath();
    ctx.arc(cueBall.x - Math.cos(aimAngle) * (BALL_RADIUS * scale + 5), cueBall.y - Math.sin(aimAngle) * (BALL_RADIUS * scale + 5), 3 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Aim line
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + power * 0.007})`;
    ctx.lineWidth = 2 * scale;
    ctx.setLineDash([5 * scale, 5 * scale]);
    ctx.beginPath();
    ctx.moveTo(cueBall.x, cueBall.y);
    ctx.lineTo(cueBall.x + Math.cos(aimAngle) * (50 + power) * scale, cueBall.y + Math.sin(aimAngle) * (50 + power) * scale);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [balls, isAiming, aimAngle, power, scale, cueBallPlacement]);

  const checkCollision = useCallback((ball1, ball2) => {
    const dx = ball1.x - ball2.x;
    const dy = ball1.y - ball2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < BALL_RADIUS * scale * 2;
  }, [scale]);

  const resolveBallCollision = useCallback((ball1, ball2) => {
    const dx = ball1.x - ball2.x;
    const dy = ball1.y - ball2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < BALL_RADIUS * scale * 2) {
      // Normalize collision vector
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Separate balls
      const overlap = BALL_RADIUS * scale * 2 - distance;
      ball1.x += nx * overlap * 0.5;
      ball1.y += ny * overlap * 0.5;
      ball2.x -= nx * overlap * 0.5;
      ball2.y -= ny * overlap * 0.5;
      
      // Calculate relative velocity
      const rvx = ball1.vx - ball2.vx;
      const rvy = ball1.vy - ball2.vy;
      
      // Calculate relative velocity in collision normal direction
      const speed = rvx * nx + rvy * ny;
      
      // Do not resolve if velocities are separating
      if (speed > 0) return;
      
      // Calculate restitution
      const restitution = 0.8;
      const impulse = 2 * speed / (1 + 1); // Assuming equal mass
      
      // Apply impulse
      ball1.vx -= impulse * nx * restitution;
      ball1.vy -= impulse * ny * restitution;
      ball2.vx += impulse * nx * restitution;
      ball2.vy += impulse * ny * restitution;
    }
  }, [scale]);

  const checkPocket = useCallback((ball) => {
    return POCKETS.some(pocket => {
      const dx = ball.x - pocket.x;
      const dy = ball.y - pocket.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < (POCKET_RADIUS - 2) * scale;
    });
  }, [scale]);

  const updatePhysics = useCallback(() => {
    setBalls(prevBalls => {
      const newBalls = prevBalls.map(ball => {
        if (ball.pocketed) return ball;

        // Update trail
        const newTrail = [...ball.trail, { x: ball.x, y: ball.y }];
        if (newTrail.length > 10) newTrail.shift();

        // Update position
        const newBall = {
          ...ball,
          x: ball.x + ball.vx,
          y: ball.y + ball.vy,
          trail: newTrail
        };

        // Wall collisions
        if (newBall.x <= BALL_RADIUS * scale || newBall.x >= TABLE_WIDTH - BALL_RADIUS * scale) {
          newBall.vx = -newBall.vx * BOUNCE_DAMPING;
          newBall.x = Math.max(BALL_RADIUS * scale, Math.min(TABLE_WIDTH - BALL_RADIUS * scale, newBall.x));
        }
        if (newBall.y <= BALL_RADIUS * scale || newBall.y >= TABLE_HEIGHT - BALL_RADIUS * scale) {
          newBall.vy = -newBall.vy * BOUNCE_DAMPING;
          newBall.y = Math.max(BALL_RADIUS * scale, Math.min(TABLE_HEIGHT - BALL_RADIUS * scale, newBall.y));
        }

        // Apply friction
        newBall.vx *= FRICTION;
        newBall.vy *= FRICTION;

        // Stop ball if moving very slowly
        if (Math.abs(newBall.vx) < 0.1 && Math.abs(newBall.vy) < 0.1) {
          newBall.vx = 0;
          newBall.vy = 0;
          newBall.trail = [];
        }

        return newBall;
      });

      // Check ball-ball collisions
      for (let i = 0; i < newBalls.length; i++) {
        for (let j = i + 1; j < newBalls.length; j++) {
          if (!newBalls[i].pocketed && !newBalls[j].pocketed) {
            if (checkCollision(newBalls[i], newBalls[j])) {
              resolveBallCollision(newBalls[i], newBalls[j]);
            }
          }
        }
      }

      // Check pocket collisions and handle game logic
      const pocketedThisTurn = [];
      newBalls.forEach(ball => {
        if (!ball.pocketed && checkPocket(ball)) {
          ball.pocketed = true;
          ball.vx = 0;
          ball.vy = 0;
          ball.trail = [];
          pocketedThisTurn.push(ball);
        }
      });

      // Process pocketed balls
      if (pocketedThisTurn.length > 0) {
        let continueShoot = false;
        let switchTurn = false;
        let gameEnd = false;
        let winner = null;
        let foul = false;
        let resultMessage = '';

        pocketedThisTurn.forEach(ball => {
          const result = handleBallPocketed(ball);
          
          if (result.type === 'win' || result.type === 'lose') {
            gameEnd = true;
            winner = result.winner;
            resultMessage = result.message;
          } else if (result.type === 'scratch') {
            foul = true;
            switchTurn = true;
            resultMessage = result.message;
            // Reposition cue ball after animation stops
            setTimeout(() => {
              repositionCueBall();
            }, 500);
          } else if (result.type === 'assignment') {
            // Assign ball types to players
            setGameState(prev => ({
              ...prev,
              [`player${gameState.currentPlayer}Type`]: result.playerType,
              [`player${gameState.currentPlayer === 1 ? 2 : 1}Type`]: result.otherPlayerType,
              gamePhase: 'playing'
            }));
            continueShoot = true;
            resultMessage = result.message;
          } else if (result.type === 'success') {
            continueShoot = true;
            resultMessage = result.message;
          } else if (result.type === 'opponent_ball') {
            foul = true;
            switchTurn = true;
            resultMessage = result.message;
          }
        });

        setShotResult({
          message: resultMessage,
          type: gameEnd ? 'game_end' : foul ? 'foul' : 'success',
          winner: winner
        });

        if (gameEnd) {
          setGameState(prev => ({
            ...prev,
            gamePhase: 'finished',
            winner: winner,
            canShoot: false
          }));
        }
      }

      // Check if all balls are stopped
      const allStopped = newBalls.every(ball => ball.pocketed || (ball.vx === 0 && ball.vy === 0));
      if (allStopped && isAnimating) {
        setIsAnimating(false);
        
        // Handle turn switching logic
        if (pocketedThisTurn.length === 0) {
          // No balls pocketed, switch turns
          setGameState(prev => ({
            ...prev,
            currentPlayer: prev.currentPlayer === 1 ? 2 : 1,
            canShoot: true
          }));
          setShotResult({
            message: 'No balls pocketed. Turn switches.',
            type: 'miss'
          });
        } else {
          // Handle based on what was pocketed
          let shouldSwitchTurn = false;
          let shouldContinue = false;
          
          pocketedThisTurn.forEach(ball => {
            const result = handleBallPocketed(ball);
            if (result.switchTurn) shouldSwitchTurn = true;
            if (result.continueShoot) shouldContinue = true;
          });

          if (shouldSwitchTurn) {
            setGameState(prev => ({
              ...prev,
              currentPlayer: prev.currentPlayer === 1 ? 2 : 1,
              canShoot: true
            }));
          } else if (shouldContinue) {
            setGameState(prev => ({
              ...prev,
              canShoot: true
            }));
          }
        }
      }

      return newBalls;
    });
  }, [checkCollision, resolveBallCollision, checkPocket, isAnimating, scale, TABLE_WIDTH, TABLE_HEIGHT, handleBallPocketed, repositionCueBall, gameState.currentPlayer]);

  const animate = useCallback(() => {
    if (isAnimating) {
      updatePhysics();
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isAnimating, updatePhysics]);

  useEffect(() => {
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, animate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    
    drawTable(ctx);
    drawBalls(ctx);
    drawCue(ctx);
  }, [drawTable, drawBalls, drawCue]);

  const handleMouseDown = useCallback((e) => {
    if (!gameState.canShoot || isAnimating) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cueBall = balls.find(b => b.id === 0);
    if (!cueBall || cueBall.pocketed) return;

    const dx = x - cueBall.x;
    const dy = y - cueBall.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 50) {
      setIsAiming(true);
      setAimAngle(Math.atan2(dy, dx));
      setPower(0);
    }
  }, [gameState.canShoot, isAnimating, balls]);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (isAiming) {
      const cueBall = balls.find(b => b.id === 0);
      if (cueBall) {
        const dx = x - cueBall.x;
        const dy = y - cueBall.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        setAimAngle(Math.atan2(dy, dx));
        setPower(Math.min(100, Math.max(0, distance - 50)));
      }
    }
  }, [isAiming, balls]);

  const handleMouseUp = useCallback(() => {
    if (isAiming && power > 0) {
      const cueBall = balls.find(b => b.id === 0);
      if (cueBall) {
        const powerMultiplier = power * 0.2;
        setBalls(prevBalls => 
          prevBalls.map(ball => 
            ball.id === 0 
              ? {
                  ...ball,
                  vx: Math.cos(aimAngle) * powerMultiplier,
                  vy: Math.sin(aimAngle) * powerMultiplier
                }
              : ball
          )
        );
        
        setIsAnimating(true);
        setGameState(prev => ({ ...prev, canShoot: false }));
      }
    }
    
    setIsAiming(false);
    setPower(0);
  }, [isAiming, power, aimAngle, balls]);

  const resetGame = useCallback(() => {
    setBalls(initializeBalls());
    setGameState(mockGameState);
    setIsAnimating(false);
    setIsAiming(false);
    setPower(0);
  }, [initializeBalls]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            8-Ball Pool
          </h1>
          <p className="text-slate-300">Modern 2D Pool Game</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Game Board */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <div className="p-4">
              <canvas
                ref={canvasRef}
                width={TABLE_WIDTH}
                height={TABLE_HEIGHT}
                className="border-2 border-slate-600 rounded-lg shadow-2xl cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          </Card>

          {/* Game Info */}
          <div className="lg:w-80 space-y-4">
            {/* Current Player */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Current Player</h3>
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${gameState.currentPlayer === 1 ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                  <span className="text-white font-medium">
                    Player {gameState.currentPlayer}
                  </span>
                  <Badge variant={gameState.canShoot ? "default" : "secondary"}>
                    {gameState.canShoot ? "Your Turn" : "Waiting"}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Power Bar */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Power</h3>
                <Progress value={power} className="h-3" />
                <p className="text-sm text-slate-400 mt-2">
                  {power > 0 ? `${Math.round(power)}% power` : "Aim and drag to shoot"}
                </p>
              </div>
            </Card>

            {/* Game Stats */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Game Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Balls Pocketed:</span>
                    <span className="text-white">{gameState.pocketedBalls.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Player 1 Score:</span>
                    <span className="text-white">{gameState.player1Score}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Player 2 Score:</span>
                    <span className="text-white">{gameState.player2Score}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Controls */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Controls</h3>
                <div className="space-y-2 text-sm text-slate-400">
                  <p>• Click and drag near cue ball to aim</p>
                  <p>• Drag distance controls power</p>
                  <p>• Release to shoot</p>
                </div>
                <Button 
                  onClick={resetGame}
                  className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  New Game
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoolGame;