# Robot Controller Backend

This project implements a Node.js Express backend server to control a UR robot via TCP socket communication. It provides a REST API for connecting to the robot, translating and rotating its TCP, moving individual joints, and managing program execution.

## Table of Contents
- [Setup](#setup)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
  - [POST /api/connect](#post-apiconnect)
  - [POST /api/tcp/translate](#post-apitcptranslate)
  - [POST /api/tcp/rotate](#post-apitcprotate)
  - [POST /api/joint/move](#post-apijointmove)
  - [POST /api/program/start](#post-apiprogramstart)
  - [POST /api/program/stop](#post-apiprogramstop)
  - [POST /api/emergency-stop](#post-apiemergency-stop)
- [URScript Generation](#urscript-generation)
- [Coordinate Indexing](#coordinate-indexing)

## Setup

To set up the project, follow these steps:

1.  **Clone the repository** (if applicable) or navigate to the project directory.
2.  **Install dependencies**:
    ```bash
    npm install
    ```

## Running the Server

To start the backend server:

1.  Ensure you are in the project's root directory (`c:/Programming_projects/Robot_controller/Back_end`).
2.  Run the server using the npm start script:
    ```bash
    npm start
    ```
    The server will start on `http://localhost:3001`. You should see `Server listening at http://localhost:3001` in your terminal. If you visit `http://localhost:3001` in your browser, you will see "Robot Controller Backend is running."

## API Endpoints

The backend exposes the following REST API endpoints:

### POST /api/connect
Connects to the UR robot TCP server.

-   **Request Body (JSON):**
    ```json
    {
      "host": "192.168.1.100",  // IP address of the UR robot
      "port": 30002              // TCP port
    }
    ```
-   **Response (JSON):**
    ```json
    {
      "success": true,
      "message": "Connected to robot"
    }
    ```

### POST /api/tcp/translate
Translates the TCP (Tool Center Point) along the X, Y, or Z axis.

-   **Request Body (JSON):**
    ```json
    {
      "axis": "x",           // "x", "y", or "z"
      "value": 0.01,         // amount in meters
      "direction": "+"       // "+" or "-"
    }
    ```
-   **Response (JSON):**
    ```json
    {
      "success": true,
      "command": "def program_x_pos()...", // Generated URScript
      "timestamp": "2025-01-10T12:34:56Z"
    }
    ```

### POST /api/tcp/rotate
Rotates the TCP around the RX, RY, or RZ axis.

-   **Request Body (JSON):**
    ```json
    {
      "axis": "rx",          // "rx", "ry", or "rz"
      "value": 0.05,         // amount in radians
      "direction": "-"       // "+" or "-"
    }
    ```
-   **Response (JSON):**
    ```json
    {
      "success": true,
      "command": "def program_rx_neg()...", // Generated URScript
      "timestamp": "2025-01-10T12:34:56Z"
    }
    ```

### POST /api/joint/move
Moves an individual robot joint.

-   **Request Body (JSON):**
    ```json
    {
      "joint": 1,            // joint number (1-6)
      "value": 0.01,         // amount in radians
      "direction": "+"       // "+" or "-"
    }
    ```
-   **Response (JSON):**
    ```json
    {
      "success": true,
      "command": "def program_z1_pos()...", // Generated URScript
      "timestamp": "2025-01-10T12:34:56Z"
    }
    ```

### POST /api/program/start
Starts a program on the UR robot by its name.

-   **Request Body (JSON):**
    ```json
    {
      "programName": "MojProgram" // Name of the program to start
    }
    ```
-   **Response (JSON):**
    ```json
    {
      "success": true,
      "command": "def MojProgram()...", // Generated URScript
      "timestamp": "2025-01-10T12:34:56Z"
    }
    ```

### POST /api/program/stop
Stops the currently running program on the UR robot.

-   **Request Body (JSON):**
    ```json
    {}
    ```
-   **Response (JSON):**
    ```json
    {
      "success": true,
      "command": "stop", // Generated URScript
      "timestamp": "2025-01-10T12:34:56Z"
    }
    ```

### POST /api/emergency-stop
Executes an emergency stop command on the UR robot.

-   **Request Body (JSON):**
    ```json
    {}
    ```
-   **Response (JSON):**
    ```json
    {
      "success": true,
      "command": "stopj(10)", // Generated URScript
      "timestamp": "2025-01-10T12:34:56Z"
    }
    ```

## URScript Generation

The backend dynamically generates URScript code based on the incoming API requests. These scripts are then sent to the UR robot via the TCP socket.

## Coordinate Indexing

For reference, here's how coordinates are indexed in URScript arrays:

### TCP Pose Array:
-   `[0]` = X
-   `[1]` = Y
-   `[2]` = Z
-   `[3]` = RX (rotation around X-axis)
-   `[4]` = RY (rotation around Y-axis)
-   `[5]` = RZ (rotation around Z-axis)

### Joint Positions Array:
-   `[0]` = Z1 (Base joint)
-   `[1]` = Z2 (Shoulder joint)
-   `[2]` = Z3 (Elbow joint)
-   `[3]` = Z4 (Wrist 1 joint)
-   `[4]` = Z5 (Wrist 2 joint)
-   `[5]` = Z6 (Wrist 3 joint)