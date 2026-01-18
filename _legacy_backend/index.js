const express = require('express');
const cors = require('cors');
const net = require('net');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

let robotSocket = null;

app.get('/', (req, res) => {
  res.send('Robot Controller Backend is running.');
});

// 1. POST /api/connect
app.post('/api/connect', (req, res) => {
  console.log('Received /api/connect request:', req.body);
  const { host, port } = req.body;

  if (robotSocket) {
    robotSocket.destroy();
  }

  robotSocket = net.createConnection({ host, port }, () => {
    console.log('Connected to robot');
    res.json({ success: true, message: 'Connected to robot' });
  });

  robotSocket.on('error', (err) => {
    console.error('Robot connection error:', err);
    res.status(500).json({ success: false, message: 'Failed to connect to robot' });
    robotSocket = null;
  });

  robotSocket.on('close', () => {
    console.log('Connection to robot closed');
    robotSocket = null;
  });
});

function sendCommand(urscript) {
  if (robotSocket && robotSocket.writable) {
    robotSocket.write(urscript + '\n');
    return true;
  }
  return false;
}

// URScript Generators
function generateTranslationScript(axis, value, direction) {
  const axisIndex = { x: 0, y: 1, z: 2 }[axis];
  const sign = direction === '+' ? '+' : '-';
  const funcName = `program_${axis}_${direction === '+' ? 'pos' : 'neg'}`;

  return `
def ${funcName}():
  poz_tcp=get_actual_tcp_pose()
  poz_tcp2=poz_tcp
  poz_tcp2[${axisIndex}]=poz_tcp2[${axisIndex}]${sign}${value}
  movel(poz_tcp2,a=1,v=1,t=0,r=0)
end
`;
}

function generateRotationScript(axis, value, direction) {
    const axisIndex = { rx: 3, ry: 4, rz: 5 }[axis];
    const sign = direction === '+' ? '+' : '-';
    const funcName = `program_${axis}_${direction === '+' ? 'pos' : 'neg'}`;
  
    return `
  def ${funcName}():
    poz_tcp=get_actual_tcp_pose()
    poz_tcp2=poz_tcp
    poz_tcp2[${axisIndex}]=poz_tcp2[${axisIndex}]${sign}${value}
    movel(poz_tcp2,a=1,v=1,t=0,r=0)
  end
  `;
  }

  function generateJointMoveScript(joint, value, direction) {
    const jointIndex = joint - 1;
    const sign = direction === '+' ? '+' : '-';
    const funcName = `program_z${joint}_${direction === '+' ? 'pos' : 'neg'}`;
  
    return `
  def ${funcName}():
    poz_zgl=get_actual_joint_positions()
    poz_zgl2=poz_zgl
    poz_zgl2[${jointIndex}]=poz_zgl2[${jointIndex}]${sign}${value}
    movej(poz_zgl2,a=1,v=1,t=0,r=0)
  end
  `;
  }

// 2. POST /api/tcp/translate
app.post('/api/tcp/translate', (req, res) => {
    console.log('Received /api/tcp/translate request:', req.body);
    const { axis, value, direction } = req.body;
    const script = generateTranslationScript(axis, value, direction);
    if (sendCommand(script)) {
      res.json({ success: true, command: script, timestamp: new Date().toISOString() });
    } else {
      res.status(500).json({ success: false, message: 'Not connected to robot' });
    }
  });

// 3. POST /api/tcp/rotate
app.post('/api/tcp/rotate', (req, res) => {
    console.log('Received /api/tcp/rotate request:', req.body);
    const { axis, value, direction } = req.body;
    const script = generateRotationScript(axis, value, direction);
    if (sendCommand(script)) {
      res.json({ success: true, command: script, timestamp: new Date().toISOString() });
    } else {
      res.status(500).json({ success: false, message: 'Not connected to robot' });
    }
  });

// 4. POST /api/joint/move
app.post('/api/joint/move', (req, res) => {
    console.log('Received /api/joint/move request:', req.body);
    const { joint, value, direction } = req.body;
    const script = generateJointMoveScript(joint, value, direction);
    if (sendCommand(script)) {
      res.json({ success: true, command: script, timestamp: new Date().toISOString() });
    } else {
      res.status(500).json({ success: false, message: 'Not connected to robot' });
    }
  });

// 5. POST /api/program/start
app.post('/api/program/start', (req, res) => {
    console.log('Received /api/program/start request:', req.body);
    const { programName } = req.body;
    const script = `def ${programName}():\n  # Program code goes here\nend`;
    if (sendCommand(script)) {
      res.json({ success: true, command: script, timestamp: new Date().toISOString() });
    } else {
      res.status(500).json({ success: false, message: 'Not connected to robot' });
    }
  });

// 6. POST /api/program/stop
app.post('/api/program/stop', (req, res) => {
    console.log('Received /api/program/stop request:', req.body);
    const script = 'stop';
    if (sendCommand(script)) {
      res.json({ success: true, command: script, timestamp: new Date().toISOString() });
    } else {
      res.status(500).json({ success: false, message: 'Not connected to robot' });
    }
  });

// 7. POST /api/emergency-stop
app.post('/api/emergency-stop', (req, res) => {
    console.log('Received /api/emergency-stop request:', req.body);
    const script = 'stopj(10)';
    if (sendCommand(script)) {
      res.json({ success: true, command: script, timestamp: new Date().toISOString() });
    } else {
      res.status(500).json({ success: false, message: 'Not connected to robot' });
    }
  });


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// Keep the process alive
setInterval(() => {}, 1 << 30);