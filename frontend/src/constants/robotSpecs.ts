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
    "UR5": {
        d: [0.089159, 0, 0, 0.10915, 0.09465, 0.0823],
        a: [0, -0.425, -0.39225, 0, 0, 0],
        alpha: [Math.PI / 2, 0, 0, Math.PI / 2, -Math.PI / 2, 0],
        offsets: {}
    }
};
