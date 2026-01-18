import { useEffect, useRef } from 'react';

interface RobotVisualizerProps {
  position: { x: number; y: number; z: number };
}

const RobotVisualizer = ({ position }: RobotVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawScene = () => {
      // Clear canvas with deep navy background
      ctx.fillStyle = 'hsl(222, 47%, 11%)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = 'hsl(220, 40%, 20%, 0.2)';
      ctx.lineWidth = 1;
      
      const gridSize = 40;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Vertical lines
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw axes with purple/cyan theme
      ctx.strokeStyle = 'hsl(280, 85%, 65%, 0.4)';
      ctx.lineWidth = 2;
      
      // X axis
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvas.width, centerY);
      ctx.stroke();
      
      // Y axis
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, canvas.height);
      ctx.stroke();

      // Draw robot position
      const scale = 4;
      const robotX = centerX + position.x * scale;
      const robotY = centerY - position.y * scale;
      const robotSize = 8 + Math.abs(position.z) * 0.5;

      // Robot shadow
      ctx.fillStyle = 'hsl(280, 85%, 65%, 0.1)';
      ctx.beginPath();
      ctx.arc(robotX, robotY + 10, robotSize + 5, 0, Math.PI * 2);
      ctx.fill();

      // Robot body with purple gradient
      const gradient = ctx.createRadialGradient(robotX, robotY, 0, robotX, robotY, robotSize);
      gradient.addColorStop(0, 'hsl(280, 85%, 75%)');
      gradient.addColorStop(1, 'hsl(280, 85%, 55%)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(robotX, robotY, robotSize, 0, Math.PI * 2);
      ctx.fill();

      // Robot glow with purple
      ctx.strokeStyle = 'hsl(280, 85%, 65%)';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 25;
      ctx.shadowColor = 'hsl(280, 85%, 65%)';
      ctx.beginPath();
      ctx.arc(robotX, robotY, robotSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw position lines
      ctx.strokeStyle = 'hsl(280, 85%, 65%, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      // X line
      ctx.beginPath();
      ctx.moveTo(centerX, robotY);
      ctx.lineTo(robotX, robotY);
      ctx.stroke();
      
      // Y line
      ctx.beginPath();
      ctx.moveTo(robotX, centerY);
      ctx.lineTo(robotX, robotY);
      ctx.stroke();
      
      ctx.setLineDash([]);
    };

    drawScene();
  }, [position]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="w-full h-full border border-border rounded-lg"
    />
  );
};

export default RobotVisualizer;
