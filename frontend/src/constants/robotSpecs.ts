export interface RobotKinematics {
    d: number[];
    a: number[];
    alpha: number[];
    offsets: {
        joint?: number[];
        visual?: number[][];
    };
}

export const ROBOT_SPECS: Record<string, RobotKinematics> = {
    "UR3": {
        d: [0.1519, 0, 0, 0.11235, 0.08535, 0.0819],
        a: [0, -0.24365, -0.21325, 0, 0, 0],
        alpha: [Math.PI / 2, 0, 0, Math.PI / 2, -Math.PI / 2, 0],
        offsets: {}
    },
    "UR3e": {
        d: [0.15185, 0, 0, 0.13105, 0.08535, 0.0921],
        a: [0, -0.24365, -0.2132, 0, 0, 0],
        alpha: [Math.PI / 2, 0, 0, Math.PI / 2, -Math.PI / 2, 0],
        offsets: {}
    },
    "UR5": {
        d: [0.089159, 0, 0, 0.10915, 0.09465, 0.0823],
        a: [0, -0.425, -0.39225, 0, 0, 0],
        alpha: [Math.PI / 2, 0, 0, Math.PI / 2, -Math.PI / 2, 0],
        offsets: {}
    },
    "UR5e": {
        d: [0.1625, 0, 0, 0.1333, 0.0997, 0.0996],
        a: [0, -0.425, -0.3922, 0, 0, 0],
        alpha: [Math.PI / 2, 0, 0, Math.PI / 2, -Math.PI / 2, 0],
        offsets: {}
    },
    "UR10": {
        d: [0.1273, 0, 0, 0.163941, 0.1157, 0.0922],
        a: [0, -0.612, -0.5723, 0, 0, 0],
        alpha: [Math.PI / 2, 0, 0, Math.PI / 2, -Math.PI / 2, 0],
        offsets: {}
    },
    "UR10e": {
        d: [0.1807, 0, 0, 0.17415, 0.11985, 0.11655],
        a: [0, -0.6127, -0.57155, 0, 0, 0],
        alpha: [Math.PI / 2, 0, 0, Math.PI / 2, -Math.PI / 2, 0],
        offsets: {}
    },
    "UR16e": {
        d: [0.1807, 0, 0, 0.17415, 0.11985, 0.11655],
        a: [0, -0.484, -0.447, 0, 0, 0],
        alpha: [Math.PI / 2, 0, 0, Math.PI / 2, -Math.PI / 2, 0],
        offsets: {}
    }
};
